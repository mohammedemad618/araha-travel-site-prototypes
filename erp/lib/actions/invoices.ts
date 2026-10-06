'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { actionTenant, toObjectId } from '../session';
import { repo } from '../repo';
import { audit, logActivity } from '../audit';
import { fieldErrors, optDate, type ActionResult } from '../forms';
import { todayISO } from '../dates';
import { newInvoiceNumber } from '../bookings';
import { isActive, lineTotal } from '../services';

const issueSchema = z.object({ bookingId: z.string(), date: optDate, dueDate: optDate });

/**
 * Issues a numbered invoice from a booking's current sale lines. A booking has
 * one valid invoice at a time: to change it, void it and issue a new one.
 */
export async function issueInvoice(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('finance.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = issueSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const r = await repo(ctx);
  const bookingId = toObjectId(parsed.data.bookingId);
  const b = bookingId ? await r.bookings.findOne({ _id: bookingId }) : null;
  if (!b) return { ok: false, error: 'notFound' };
  if (b.status === 'cancelled') return { ok: false, error: 'forbidden' };
  const lines = b.services.filter((l) => isActive(l) && lineTotal(l) > 0);
  if (!lines.length || b.total <= 0) return { ok: false, error: 'noLines' };
  if (await r.all.invoices.exists({ bookingId: b._id, status: 'issued' }))
    return { ok: false, error: 'invoiceExists' };
  const customer = await r.customers.findOne({ _id: b.customerId });
  const date = parsed.data.date ?? todayISO();
  if (parsed.data.dueDate && parsed.data.dueDate < date)
    return { ok: false, error: 'invalidDate', fields: { dueDate: 'invalidDate' } };

  const number = await newInvoiceNumber(ctx.tenant);
  const invoiceId = await r.invoices.insertOne({
    branchId: b.branchId,
    number,
    bookingId: b._id,
    customerId: b.customerId,
    customer: { name: customer?.name ?? '—', phone: customer?.phone ?? '' },
    date,
    dueDate: parsed.data.dueDate,
    currency: b.currency,
    lines: lines.map((l) => ({ description: l.description, qty: l.qty, unitPrice: l.unitPrice })),
    discount: b.discount,
    total: b.total,
    status: 'issued',
    createdBy: ctx.user._id,
    createdAt: new Date(),
  });
  await logActivity(
    ctx.tenantId,
    { type: 'booking', id: b._id },
    'system',
    `invoice:${number}`,
    ctx.user._id,
  );
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'invoice.issue',
    entity: 'invoice',
    entityId: invoiceId,
    summary: `${number} ${b.number}`,
  });
  revalidatePath(`/bookings/${b._id}`);
  revalidatePath('/invoices');
  return { ok: true, data: { id: String(invoiceId) } };
}

export async function voidInvoice(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('finance.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  const reason =
    String(fd.get('reason') ?? '')
      .trim()
      .slice(0, 300) || undefined;
  if (!id) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  const inv = await r.invoices.findOneAndUpdate(
    { _id: id, status: 'issued' },
    { $set: { status: 'void', voidReason: reason, voidedAt: new Date() } },
  );
  if (!inv) return { ok: false, error: 'notFound' };
  await logActivity(
    ctx.tenantId,
    { type: 'booking', id: inv.bookingId },
    'system',
    `invoice-void:${inv.number}`,
    ctx.user._id,
  );
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'invoice.void',
    entity: 'invoice',
    entityId: id,
    summary: `${inv.number}${reason ? ` — ${reason}` : ''}`,
  });
  revalidatePath(`/bookings/${inv.bookingId}`);
  revalidatePath('/invoices');
  return { ok: true };
}
