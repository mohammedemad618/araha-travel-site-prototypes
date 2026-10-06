'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { actionTenant, pickBranch, toObjectId } from '../session';
import { repo } from '../repo';
import { audit, logActivity } from '../audit';
import { fieldErrors, optDate, optText, text, toUpdate, type ActionResult } from '../forms';
import { visaStatuses } from '../types';

const visaSchema = z.object({
  customerId: z.string(),
  travellerId: z.string().optional(),
  bookingId: z.string().optional(),
  country: text(80),
  visaType: optText(80),
  status: z.enum(visaStatuses),
  submittedAt: optDate,
  expectedAt: optDate,
  decisionAt: optDate,
  reference: optText(80),
  notes: optText(2000),
  assignedTo: z.string().optional(),
  branchId: z.string().optional(),
});

export async function saveVisa(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('visas.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = visaSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const r = await repo(ctx);
  const customerId = toObjectId(d.customerId);
  const customer = customerId ? await r.customers.findOne({ _id: customerId }) : null;
  if (!customer) return { ok: false, error: 'required', fields: { customerId: 'required' } };
  const travellerId = toObjectId(d.travellerId);
  const traveller = travellerId
    ? customer.travellers.find((x) => String(x._id) === String(travellerId))
    : undefined;
  const bookingId = toObjectId(d.bookingId);
  const booking = bookingId ? await r.bookings.findOne({ _id: bookingId, customerId: customer._id }) : null;
  if (bookingId && !booking) return { ok: false, error: 'notFound' };
  const id = toObjectId(String(fd.get('id') ?? ''));
  const current = id ? await r.visas.findOne({ _id: id }, { projection: { branchId: 1 } }) : null;
  if (id && !current) return { ok: false, error: 'notFound' };
  // A visa for a booking is handled by the booking's branch.
  const branchId = booking?.branchId ?? pickBranch(ctx, d.branchId, current?.branchId);
  if (!branchId) return { ok: false, error: 'required', fields: { branchId: 'branchNotAllowed' } };
  const fields = {
    branchId,
    customerId: customer._id,
    travellerId: traveller?._id,
    travellerName: traveller?.name ?? customer.name,
    bookingId: bookingId ?? undefined,
    country: d.country,
    visaType: d.visaType,
    status: d.status,
    submittedAt: d.submittedAt,
    expectedAt: d.expectedAt,
    decisionAt: d.decisionAt,
    reference: d.reference,
    notes: d.notes,
    assignedTo: toObjectId(d.assignedTo) ?? undefined,
    updatedAt: new Date(),
  };
  if (id) {
    const before = await r.visas.findOneAndUpdate({ _id: id }, toUpdate(fields));
    if (!before) return { ok: false, error: 'notFound' };
    if (before.status !== d.status)
      await logActivity(ctx.tenantId, { type: 'visa', id }, 'system', `visa:${d.status}`, ctx.user._id);
    revalidatePath(`/visas/${id}`);
    revalidatePath('/visas');
    return { ok: true };
  }
  const visaId = await r.visas.insertOne({ ...fields, createdBy: ctx.user._id, createdAt: new Date() });
  await logActivity(ctx.tenantId, { type: 'visa', id: visaId }, 'system', 'created', ctx.user._id);
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'visa.create',
    entity: 'visa',
    entityId: visaId,
    summary: `${fields.travellerName} · ${d.country}`,
  });
  revalidatePath('/visas');
  redirect(`/visas/${visaId}`);
}

export async function deleteVisa(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('visas.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  const v = await r.visas.findOneAndDelete({ _id: id });
  if (!v) return { ok: false, error: 'notFound' };
  await r.activities.deleteMany({ 'entity.type': 'visa', 'entity.id': id });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'visa.delete',
    summary: `${v.travellerName} · ${v.country}`,
  });
  revalidatePath('/visas');
  redirect('/visas');
}
