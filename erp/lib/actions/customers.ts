'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { actionTenant, toObjectId } from '../session';
import { repo } from '../repo';
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
  const r = await repo(ctx);
  const customerId = await r.customers.insertOne({
    ...parsed.data,
    // The customer usually travels too; their own traveller record is created up front.
    travellers: [{ _id: new ObjectId(), name: parsed.data.name }],
    createdAt: now,
    updatedAt: now,
  });
  await logActivity(ctx.tenantId, { type: 'customer', id: customerId }, 'system', 'created', ctx.user._id);
  revalidatePath('/customers');
  redirect(`/customers/${customerId}`);
}

export async function updateCustomer(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('customers.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const parsed = customerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const r = await repo(ctx);
  const res = await r.customers.updateOne({ _id: id }, toUpdate({ ...parsed.data, updatedAt: new Date() }));
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
  const r = await repo(ctx);
  // Customers with bookings, payments or visas (in any branch) are kept for the financial record.
  if ((await r.all.bookings.exists({ customerId: id })) || (await r.all.visas.exists({ customerId: id })))
    return { ok: false, error: 'hasRecords' };
  const c = await r.customers.findOneAndDelete({ _id: id });
  if (!c) return { ok: false, error: 'notFound' };
  await r.activities.deleteMany({ 'entity.type': 'customer', 'entity.id': id });
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
  const r = await repo(ctx);
  const travellerId = toObjectId(String(fd.get('travellerId') ?? ''));
  let res;
  if (travellerId) {
    const update = toUpdate(parsed.data, 'travellers.$.');
    update.$set.updatedAt = new Date();
    res = await r.customers.updateOne({ _id: customerId, 'travellers._id': travellerId }, update);
  } else {
    const traveller: Traveller = { _id: new ObjectId(), ...parsed.data };
    res = await r.customers.updateOne(
      { _id: customerId },
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
  const r = await repo(ctx);
  if (await r.all.bookings.exists({ travellerIds: travellerId })) return { ok: false, error: 'hasRecords' };
  await r.customers.updateOne({ _id: customerId }, { $pull: { travellers: { _id: travellerId } } });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true };
}
