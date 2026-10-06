'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDb } from '../db';
import { actionTenant, toObjectId } from '../session';
import { audit, logActivity } from '../audit';
import { fieldErrors, optDate, optEmail, optText, text, toUpdate, type ActionResult } from '../forms';
import { isValidPhone, normalizePhone } from '../phone';
import { leadSources, type Customer, type Traveller } from '../types';

const phone = z
  .string()
  .trim()
  .refine((v) => isValidPhone(v), 'invalidPhone')
  .transform(normalizePhone);
const optPhone = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isValidPhone(v), 'invalidPhone')
  .transform((v) => (v ? normalizePhone(v) : undefined));

const customerSchema = z.object({
  name: text(120),
  phone,
  phone2: optPhone,
  email: optEmail,
  city: optText(80),
  notes: optText(3000),
  tags: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  source: z
    .string()
    .optional()
    .transform((v) =>
      (leadSources as readonly string[]).includes(v ?? '') ? (v as Customer['source']) : undefined,
    ),
});

export async function createCustomer(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('customers.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = customerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const now = new Date();
  const db = await getDb();
  const res = await db.collection<Omit<Customer, '_id'>>('customers').insertOne({
    tenantId: ctx.tenantId,
    ...parsed.data,
    // The customer usually travels too; their own traveller record is created up front.
    travellers: [{ _id: new ObjectId(), name: parsed.data.name }],
    createdAt: now,
    updatedAt: now,
  });
  await logActivity(
    ctx.tenantId,
    { type: 'customer', id: res.insertedId },
    'system',
    'created',
    ctx.user._id,
  );
  revalidatePath('/customers');
  redirect(`/customers/${res.insertedId}`);
}

export async function updateCustomer(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('customers.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const parsed = customerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const db = await getDb();
  const res = await db
    .collection('customers')
    .updateOne({ _id: id, tenantId: ctx.tenantId }, toUpdate({ ...parsed.data, updatedAt: new Date() }));
  if (!res.matchedCount) return { ok: false, error: 'notFound' };
  revalidatePath(`/customers/${id}`);
  return { ok: true };
}

export async function deleteCustomer(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('customers.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  // Customers with bookings, payments or visas are kept for the financial record.
  const linked =
    (await db
      .collection('bookings')
      .countDocuments({ tenantId: ctx.tenantId, customerId: id }, { limit: 1 })) +
    (await db.collection('visas').countDocuments({ tenantId: ctx.tenantId, customerId: id }, { limit: 1 }));
  if (linked) return { ok: false, error: 'hasRecords' };
  const c = await db.collection<Customer>('customers').findOneAndDelete({ _id: id, tenantId: ctx.tenantId });
  if (!c) return { ok: false, error: 'notFound' };
  await db
    .collection('activities')
    .deleteMany({ tenantId: ctx.tenantId, 'entity.type': 'customer', 'entity.id': id });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'customer.delete',
    summary: `${c.name} ${c.phone}`,
  });
  revalidatePath('/customers');
  redirect('/customers');
}

const travellerSchema = z.object({
  name: text(120),
  nameEn: optText(120),
  relation: optText(60),
  birthDate: optDate,
  gender: z
    .string()
    .optional()
    .transform((v) => (v === 'm' || v === 'f' ? v : undefined)),
  passportNo: z
    .string()
    .trim()
    .toUpperCase()
    .max(20, 'tooLong')
    .optional()
    .transform((v) => (v ? v : undefined)),
  passportExpiry: optDate,
  nationality: optText(60),
});

export async function saveTraveller(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('customers.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const customerId = toObjectId(String(fd.get('customerId') ?? ''));
  if (!customerId) return { ok: false, error: 'notFound' };
  const parsed = travellerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const db = await getDb();
  const travellerId = toObjectId(String(fd.get('travellerId') ?? ''));
  const coll = db.collection<Customer>('customers');
  let res;
  if (travellerId) {
    const update = toUpdate(parsed.data, 'travellers.$.');
    update.$set.updatedAt = new Date();
    res = await coll.updateOne(
      { _id: customerId, tenantId: ctx.tenantId, 'travellers._id': travellerId },
      update,
    );
  } else {
    const traveller: Traveller = { _id: new ObjectId(), ...parsed.data };
    res = await coll.updateOne(
      { _id: customerId, tenantId: ctx.tenantId },
      { $push: { travellers: traveller }, $set: { updatedAt: new Date() } },
    );
  }
  if (!res.matchedCount) return { ok: false, error: 'notFound' };
  revalidatePath(`/customers/${customerId}`);
  return { ok: true };
}

export async function deleteTraveller(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('customers.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const customerId = toObjectId(String(fd.get('customerId') ?? ''));
  const travellerId = toObjectId(String(fd.get('travellerId') ?? ''));
  if (!customerId || !travellerId) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const used = await db
    .collection('bookings')
    .countDocuments({ tenantId: ctx.tenantId, travellerIds: travellerId }, { limit: 1 });
  if (used) return { ok: false, error: 'hasRecords' };
  await db
    .collection<Customer>('customers')
    .updateOne({ _id: customerId, tenantId: ctx.tenantId }, { $pull: { travellers: { _id: travellerId } } });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true };
}
