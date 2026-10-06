'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from '../db';
import { actionTenant, toObjectId } from '../session';
import { audit, logActivity } from '../audit';
import { fieldErrors, optDate, optText, text, toUpdate, type ActionResult } from '../forms';
import { visaStatuses, type Customer, type VisaApplication } from '../types';

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
});

export async function saveVisa(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('visas.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = visaSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const db = await getDb();
  const customerId = toObjectId(d.customerId);
  const customer = customerId
    ? await db.collection<Customer>('customers').findOne({ _id: customerId, tenantId: ctx.tenantId })
    : null;
  if (!customer) return { ok: false, error: 'required', fields: { customerId: 'required' } };
  const travellerId = toObjectId(d.travellerId);
  const traveller = travellerId
    ? customer.travellers.find((x) => String(x._id) === String(travellerId))
    : undefined;
  const bookingId = toObjectId(d.bookingId);
  if (
    bookingId &&
    !(await db
      .collection('bookings')
      .countDocuments({ _id: bookingId, tenantId: ctx.tenantId, customerId: customer._id }))
  )
    return { ok: false, error: 'notFound' };
  const fields = {
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
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (id) {
    const before = await db
      .collection<VisaApplication>('visas')
      .findOneAndUpdate({ _id: id, tenantId: ctx.tenantId }, toUpdate(fields));
    if (!before) return { ok: false, error: 'notFound' };
    if (before.status !== d.status)
      await logActivity(ctx.tenantId, { type: 'visa', id }, 'system', `visa:${d.status}`, ctx.user._id);
    revalidatePath(`/visas/${id}`);
    revalidatePath('/visas');
    return { ok: true };
  }
  const res = await db
    .collection<Omit<VisaApplication, '_id'>>('visas')
    .insertOne({ tenantId: ctx.tenantId, ...fields, createdAt: new Date() });
  await logActivity(ctx.tenantId, { type: 'visa', id: res.insertedId }, 'system', 'created', ctx.user._id);
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'visa.create',
    entity: 'visa',
    entityId: res.insertedId,
    summary: `${fields.travellerName} · ${d.country}`,
  });
  revalidatePath('/visas');
  redirect(`/visas/${res.insertedId}`);
}

export async function deleteVisa(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('visas.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const v = await db
    .collection<VisaApplication>('visas')
    .findOneAndDelete({ _id: id, tenantId: ctx.tenantId });
  if (!v) return { ok: false, error: 'notFound' };
  await db
    .collection('activities')
    .deleteMany({ tenantId: ctx.tenantId, 'entity.type': 'visa', 'entity.id': id });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'visa.delete',
    summary: `${v.travellerName} · ${v.country}`,
  });
  revalidatePath('/visas');
  redirect('/visas');
}
