'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { actionTenant, pickBranch, toObjectId, type TenantCtx } from '../session';
import { repo } from '../repo';
import { audit, logActivity } from '../audit';
import { fieldErrors, intField, optDate, optText, text, toUpdate, type ActionResult } from '../forms';
import { can } from '../rbac';
import { addDays, todayISO } from '../dates';
import { parseMoney } from '../money';
import { newBookingNumber, newQuoteNumber, recalcBooking } from '../bookings';
import { lineTotals, parseLine } from '../services';
import type { Booking, Customer, Quote } from '../types';

const quoteSchema = z.object({
  title: text(200),
  travelDate: optDate,
  returnDate: optDate,
  adults: intField(0, 500),
  children: intField(0, 500),
  currency: z.enum(['IQD', 'USD']),
  validUntil: optDate,
  assignedTo: z.string().optional(),
  notes: optText(3000),
  branchId: z.string().optional(),
});

/** Quotes can be changed until the customer accepts or rejects them. */
const editable = (q: Quote) => q.status === 'draft' || q.status === 'sent';

async function loadQuote(ctx: TenantCtx, fd: FormData) {
  const id = toObjectId(String(fd.get('quoteId') ?? fd.get('id') ?? ''));
  if (!id) return null;
  const r = await repo(ctx);
  return r.quotes.findOne({ _id: id });
}

async function recalcQuote(ctx: TenantCtx, id: ObjectId) {
  const r = await repo(ctx);
  const q = await r.all.quotes.findOne({ _id: id });
  if (!q) return;
  const { total, costTotal } = lineTotals(q.lines, q.discount);
  await r.all.quotes.updateOne({ _id: id }, { $set: { total, costTotal, updatedAt: new Date() } });
}

/**
 * Starts a quote for a customer, or for a lead (the customer is found by phone
 * or created, as when converting a lead).
 */
export async function createQuote(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('quotes.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = quoteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const r = await repo(ctx);
  const now = new Date();

  const leadId = toObjectId(String(fd.get('leadId') ?? ''));
  const lead = leadId ? await r.leads.findOne({ _id: leadId }) : null;
  if (leadId && !lead) return { ok: false, error: 'notFound' };
  let customer: Customer | null = null;
  const customerId = toObjectId(String(fd.get('customerId') ?? ''));
  if (customerId) customer = await r.customers.findOne({ _id: customerId });
  else if (lead) {
    customer = await r.customers.findOne({ phone: lead.phone });
    if (!customer) {
      const doc: Omit<Customer, '_id' | 'tenantId'> = {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        tags: [],
        source: lead.source,
        travellers: [{ _id: new ObjectId(), name: lead.name }],
        createdAt: now,
        updatedAt: now,
      };
      customer = { ...doc, tenantId: ctx.tenantId, _id: await r.customers.insertOne(doc) };
      await logActivity(
        ctx.tenantId,
        { type: 'customer', id: customer._id },
        'system',
        'created',
        ctx.user._id,
      );
    }
  }
  if (!customer) return { ok: false, error: 'required', fields: { customerId: 'required' } };
  // A quote made from a lead stays in the lead's branch.
  const branchId = lead?.branchId ?? pickBranch(ctx, d.branchId);
  if (!branchId) return { ok: false, error: 'required', fields: { branchId: 'branchNotAllowed' } };

  const number = await newQuoteNumber(ctx.tenant);
  const quoteId = await r.quotes.insertOne({
    branchId,
    number,
    customerId: customer._id,
    leadId: lead?._id,
    title: d.title,
    travelDate: d.travelDate,
    returnDate: d.returnDate,
    adults: d.adults,
    children: d.children,
    currency: d.currency,
    lines: [],
    discount: 0,
    total: 0,
    costTotal: 0,
    validUntil: d.validUntil ?? addDays(todayISO(), 7),
    status: 'draft',
    notes: d.notes,
    assignedTo: toObjectId(d.assignedTo) ?? lead?.assignedTo ?? ctx.user._id,
    createdBy: ctx.user._id,
    createdAt: now,
    updatedAt: now,
  });
  if (lead) {
    await r.leads.updateOne(
      { _id: lead._id, stage: { $in: ['new', 'contacted'] } },
      { $set: { stage: 'quoted', customerId: customer._id, updatedAt: now } },
    );
    await logActivity(
      ctx.tenantId,
      { type: 'lead', id: lead._id },
      'system',
      `quoteCreated:${number}`,
      ctx.user._id,
    );
  }
  await logActivity(ctx.tenantId, { type: 'quote', id: quoteId }, 'system', 'created', ctx.user._id);
  revalidatePath('/quotes');
  redirect(`/quotes/${quoteId}`);
}

export async function updateQuote(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('quotes.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const q = await loadQuote(ctx, fd);
  if (!q) return { ok: false, error: 'notFound' };
  if (!editable(q)) return { ok: false, error: 'forbidden' };
  const parsed = quoteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const branchId = pickBranch(ctx, d.branchId, q.branchId);
  if (!branchId) return { ok: false, error: 'required', fields: { branchId: 'branchNotAllowed' } };
  const r = await repo(ctx);
  await r.quotes.updateOne(
    { _id: q._id },
    toUpdate({
      branchId,
      title: d.title,
      travelDate: d.travelDate,
      returnDate: d.returnDate,
      adults: d.adults,
      children: d.children,
      // The currency is fixed once lines are priced.
      currency: q.lines.length ? q.currency : d.currency,
      validUntil: d.validUntil,
      assignedTo: toObjectId(d.assignedTo) ?? undefined,
      notes: d.notes,
      updatedAt: new Date(),
    }),
  );
  revalidatePath(`/quotes/${q._id}`);
  return { ok: true };
}

export async function saveQuoteLine(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('quotes.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const q = await loadQuote(ctx, fd);
  if (!q) return { ok: false, error: 'notFound' };
  if (!editable(q)) return { ok: false, error: 'forbidden' };
  const lineId = toObjectId(String(fd.get('lineId') ?? ''));
  const previous = lineId ? q.lines.find((l) => String(l._id) === String(lineId)) : undefined;
  if (lineId && !previous) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  const supplierId = toObjectId(String(fd.get('supplierId') ?? ''));
  const supplierIds =
    supplierId && (await r.suppliers.exists({ _id: supplierId }))
      ? new Set([String(supplierId)])
      : new Set<string>();
  const parsed = parseLine(fd, {
    currency: q.currency,
    usdRate: ctx.tenant.settings.usdRate,
    // Expected costs show the margin while pricing; they need finance access like booking costs.
    canCost: can(ctx.role, 'finance.read'),
    previous,
    supplierIds,
  });
  if (!parsed.ok) return { ok: false, error: 'required', fields: parsed.fields };
  if (previous)
    await r.quotes.updateOne(
      { _id: q._id, 'lines._id': previous._id },
      { $set: { 'lines.$': { ...parsed.line, status: 'pending', _id: previous._id } } },
    );
  else
    await r.quotes.updateOne(
      { _id: q._id },
      { $push: { lines: { ...parsed.line, status: 'pending', _id: new ObjectId() } } },
    );
  await recalcQuote(ctx, q._id);
  revalidatePath(`/quotes/${q._id}`);
  return { ok: true };
}

export async function deleteQuoteLine(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('quotes.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const q = await loadQuote(ctx, fd);
  const lineId = toObjectId(String(fd.get('lineId') ?? ''));
  if (!q || !lineId) return { ok: false, error: 'notFound' };
  if (!editable(q)) return { ok: false, error: 'forbidden' };
  const r = await repo(ctx);
  await r.quotes.updateOne({ _id: q._id }, { $pull: { lines: { _id: lineId } } });
  await recalcQuote(ctx, q._id);
  revalidatePath(`/quotes/${q._id}`);
  return { ok: true };
}

export async function setQuoteDiscount(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('quotes.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const q = await loadQuote(ctx, fd);
  if (!q) return { ok: false, error: 'notFound' };
  if (!editable(q)) return { ok: false, error: 'forbidden' };
  const raw = String(fd.get('discount') ?? '').trim();
  const discount = raw ? parseMoney(raw, q.currency) : 0;
  if (discount === null || discount < 0)
    return { ok: false, error: 'invalidAmount', fields: { discount: 'invalidAmount' } };
  const r = await repo(ctx);
  await r.quotes.updateOne({ _id: q._id }, { $set: { discount } });
  await recalcQuote(ctx, q._id);
  revalidatePath(`/quotes/${q._id}`);
  return { ok: true };
}

const TRANSITIONS: Record<Quote['status'], Quote['status'][]> = {
  draft: ['sent', 'rejected'],
  sent: ['draft', 'rejected'],
  rejected: ['draft'],
  accepted: [],
};

/** Marks a quote as sent to the customer, rejected, or back to draft. */
export async function setQuoteStatus(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('quotes.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const q = await loadQuote(ctx, fd);
  const status = z.enum(['draft', 'sent', 'rejected']).safeParse(fd.get('status'));
  if (!q || !status.success) return { ok: false, error: 'notFound' };
  if (!TRANSITIONS[q.status].includes(status.data)) return { ok: false, error: 'forbidden' };
  if (status.data === 'sent' && !q.lines.length) return { ok: false, error: 'noLines' };
  const r = await repo(ctx);
  await r.quotes.updateOne(
    { _id: q._id },
    {
      $set: {
        status: status.data,
        updatedAt: new Date(),
        ...(status.data === 'sent' ? { sentAt: new Date() } : {}),
      },
    },
  );
  await logActivity(
    ctx.tenantId,
    { type: 'quote', id: q._id },
    'system',
    `quote:${status.data}`,
    ctx.user._id,
  );
  if (status.data === 'rejected' && q.leadId)
    await r.all.leads.updateOne(
      { _id: q.leadId, stage: 'quoted' },
      { $set: { stage: 'lost', lostReason: q.number, updatedAt: new Date() } },
    );
  revalidatePath(`/quotes/${q._id}`);
  revalidatePath('/quotes');
  return { ok: true };
}

/** The customer accepted: the quote becomes a booking with the same services. */
export async function acceptQuote(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('quotes.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  if (!can(ctx.role, 'bookings.write')) return { ok: false, error: 'forbidden' };
  const q = await loadQuote(ctx, fd);
  if (!q) return { ok: false, error: 'notFound' };
  if (q.status === 'accepted' && q.bookingId) redirect(`/bookings/${q.bookingId}`);
  if (!editable(q)) return { ok: false, error: 'forbidden' };
  if (!q.lines.length) return { ok: false, error: 'noLines' };
  const r = await repo(ctx);
  const now = new Date();
  // Claim the quote first so a double click cannot create two bookings.
  const claimed = await r.quotes.findOneAndUpdate(
    { _id: q._id, status: { $in: ['draft', 'sent'] } },
    { $set: { status: 'accepted', updatedAt: now } },
  );
  if (!claimed) return { ok: false, error: 'forbidden' };

  const booking: Omit<Booking, '_id' | 'tenantId'> = {
    branchId: q.branchId,
    number: await newBookingNumber(ctx.tenant),
    customerId: q.customerId,
    leadId: q.leadId,
    quoteId: q._id,
    type: q.lines.some((l) => l.type === 'package') ? 'package' : 'custom',
    title: q.title,
    travelDate: q.travelDate,
    returnDate: q.returnDate,
    adults: q.adults,
    children: q.children,
    travellerIds: [],
    status: 'draft',
    currency: q.currency,
    // Every service starts as "to be requested" from its supplier.
    services: q.lines.map((l) => ({ ...l, _id: new ObjectId(), status: 'pending' })),
    discount: q.discount,
    total: 0,
    costTotal: 0,
    paid: 0,
    assignedTo: q.assignedTo ?? ctx.user._id,
    notes: q.notes,
    createdBy: ctx.user._id,
    createdAt: now,
    updatedAt: now,
  };
  const bookingId = await r.all.bookings.insertOne(booking);
  await recalcBooking(ctx.tenantId, bookingId);
  await r.quotes.updateOne({ _id: q._id }, { $set: { bookingId } });
  if (q.leadId)
    await r.all.leads.updateOne(
      { _id: q.leadId },
      { $set: { stage: 'won', bookingId, customerId: q.customerId, updatedAt: now } },
    );
  await logActivity(
    ctx.tenantId,
    { type: 'quote', id: q._id },
    'system',
    `accepted:${booking.number}`,
    ctx.user._id,
  );
  await logActivity(
    ctx.tenantId,
    { type: 'booking', id: bookingId },
    'system',
    `from:${q.number}`,
    ctx.user._id,
  );
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'quote.accept',
    entity: 'booking',
    entityId: bookingId,
    summary: `${q.number} → ${booking.number}`,
  });
  revalidatePath('/quotes');
  revalidatePath('/bookings');
  redirect(`/bookings/${bookingId}`);
}

export async function deleteQuote(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('quotes.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const q = await loadQuote(ctx, fd);
  if (!q) return { ok: false, error: 'notFound' };
  // Only drafts are deleted; a sent quote is part of the customer's history.
  if (q.status !== 'draft') return { ok: false, error: 'hasRecords' };
  const r = await repo(ctx);
  await r.quotes.deleteOne({ _id: q._id });
  await r.activities.deleteMany({ 'entity.type': 'quote', 'entity.id': q._id });
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'quote.delete', summary: q.number });
  revalidatePath('/quotes');
  redirect('/quotes');
}
