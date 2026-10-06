'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { actionTenant, toObjectId } from '../session';
import { repo } from '../repo';
import { audit, logActivity } from '../audit';
import { fieldErrors, optText, reqDate, type ActionResult } from '../forms';
import { convert, formatMoney, parseMoney } from '../money';
import { nextNumber } from '../counters';
import { recalcBooking } from '../bookings';
import { paymentMethods } from '../types';

const paymentSchema = z.object({
  bookingId: z.string(),
  kind: z.enum(['payment', 'refund']),
  amount: z.string(),
  currency: z.enum(['IQD', 'USD']),
  method: z.enum(paymentMethods),
  date: reqDate,
  reference: optText(120),
  notes: optText(1000),
});

export async function recordPayment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('finance.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = paymentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const amount = parseMoney(d.amount, d.currency);
  if (amount === null || amount <= 0)
    return { ok: false, error: 'invalidAmount', fields: { amount: 'invalidAmount' } };
  const r = await repo(ctx);
  const bookingId = toObjectId(d.bookingId);
  const booking = bookingId ? await r.bookings.findOne({ _id: bookingId }) : null;
  if (!booking) return { ok: false, error: 'notFound' };

  const amountInBooking = convert(amount, d.currency, booking.currency, ctx.tenant.settings.usdRate);
  const number = await nextNumber(ctx.tenantId, ctx.tenant.settings.receiptPrefix || 'RC', 'receipt');
  const paymentId = await r.payments.insertOne({
    // A receipt belongs to the branch of its booking.
    branchId: booking.branchId,
    number,
    bookingId: booking._id,
    customerId: booking.customerId,
    kind: d.kind,
    amount,
    currency: d.currency,
    amountInBooking,
    method: d.method,
    date: d.date,
    reference: d.reference,
    notes: d.notes,
    voided: false,
    receivedBy: ctx.user._id,
    createdAt: new Date(),
  });
  await recalcBooking(ctx.tenantId, booking._id);
  // A first payment on a draft confirms the booking.
  if (d.kind === 'payment' && booking.status === 'draft') {
    await r.bookings.updateOne({ _id: booking._id }, { $set: { status: 'confirmed' } });
    await logActivity(
      ctx.tenantId,
      { type: 'booking', id: booking._id },
      'system',
      'status:confirmed',
      ctx.user._id,
    );
  }
  await logActivity(
    ctx.tenantId,
    { type: 'booking', id: booking._id },
    'system',
    `${d.kind}:${number} (${formatMoney(amount, d.currency)})`,
    ctx.user._id,
  );
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: `payment.${d.kind}`,
    entity: 'payment',
    entityId: paymentId,
    summary: `${number} ${booking.number}`,
  });
  revalidatePath(`/bookings/${booking._id}`);
  revalidatePath('/payments');
  return { ok: true, data: { id: String(paymentId) } };
}

export async function voidPayment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('finance.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  // Any receipt of a booking the member can see may be voided.
  const target = await r.all.payments.findOne({ _id: id, voided: false });
  if (!target || !(await r.bookings.exists({ _id: target.bookingId })))
    return { ok: false, error: 'notFound' };
  const p = await r.all.payments.findOneAndUpdate({ _id: id, voided: false }, { $set: { voided: true } });
  if (!p) return { ok: false, error: 'notFound' };
  await recalcBooking(ctx.tenantId, p.bookingId);
  await logActivity(
    ctx.tenantId,
    { type: 'booking', id: p.bookingId },
    'system',
    `void:${p.number}`,
    ctx.user._id,
  );
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'payment.void',
    entity: 'payment',
    entityId: id,
    summary: p.number,
  });
  revalidatePath(`/bookings/${p.bookingId}`);
  revalidatePath('/payments');
  return { ok: true };
}

const supplierPaymentSchema = z.object({
  supplierId: z.string(),
  amount: z.string(),
  currency: z.enum(['IQD', 'USD']),
  method: z.enum(paymentMethods),
  date: reqDate,
  reference: optText(120),
  notes: optText(1000),
});

export async function recordSupplierPayment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('finance.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = supplierPaymentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const amount = parseMoney(d.amount, d.currency);
  if (amount === null || amount <= 0)
    return { ok: false, error: 'invalidAmount', fields: { amount: 'invalidAmount' } };
  const r = await repo(ctx);
  const supplierId = toObjectId(d.supplierId);
  const supplier = supplierId ? await r.suppliers.findOne({ _id: supplierId }) : null;
  if (!supplier) return { ok: false, error: 'notFound' };
  await r.supplierPayments.insertOne({
    supplierId: supplier._id,
    amount,
    currency: d.currency,
    date: d.date,
    method: d.method,
    reference: d.reference,
    notes: d.notes,
    createdBy: ctx.user._id,
    createdAt: new Date(),
  });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'supplier.payment',
    entity: 'supplier',
    entityId: supplier._id,
    summary: `${supplier.name} ${formatMoney(amount, d.currency)}`,
  });
  revalidatePath(`/suppliers/${supplier._id}`);
  revalidatePath('/suppliers');
  return { ok: true };
}

export async function deleteSupplierPayment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('finance.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  const p = await r.supplierPayments.findOneAndDelete({ _id: id });
  if (!p) return { ok: false, error: 'notFound' };
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'supplier.payment.delete',
    entity: 'supplier',
    entityId: p.supplierId,
    summary: formatMoney(p.amount, p.currency),
  });
  revalidatePath(`/suppliers/${p.supplierId}`);
  return { ok: true };
}
