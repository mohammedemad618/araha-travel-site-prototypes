'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from '../db';
import { actionTenant, toObjectId } from '../session';
import { audit } from '../audit';
import { fieldErrors, optEmail, optText, text, toUpdate, type ActionResult } from '../forms';
import { supplierTypes, type Supplier } from '../types';

const supplierSchema = z.object({
  name: text(160),
  type: z.enum(supplierTypes),
  contactName: optText(120),
  phone: optText(40),
  email: optEmail,
  country: optText(80),
  notes: optText(2000),
});

export async function saveSupplier(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('suppliers.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = supplierSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const db = await getDb();
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (id) {
    const res = await db
      .collection('suppliers')
      .updateOne({ _id: id, tenantId: ctx.tenantId }, toUpdate(parsed.data));
    if (!res.matchedCount) return { ok: false, error: 'notFound' };
    revalidatePath(`/suppliers/${id}`);
    return { ok: true };
  }
  const res = await db
    .collection<Omit<Supplier, '_id'>>('suppliers')
    .insertOne({ tenantId: ctx.tenantId, ...parsed.data, createdAt: new Date() });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'supplier.create',
    entity: 'supplier',
    entityId: res.insertedId,
    summary: parsed.data.name,
  });
  revalidatePath('/suppliers');
  redirect(`/suppliers/${res.insertedId}`);
}

export async function deleteSupplier(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('suppliers.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const used =
    (await db
      .collection('bookings')
      .countDocuments({ tenantId: ctx.tenantId, 'costs.supplierId': id }, { limit: 1 })) +
    (await db
      .collection('supplierPayments')
      .countDocuments({ tenantId: ctx.tenantId, supplierId: id }, { limit: 1 }));
  if (used) return { ok: false, error: 'hasRecords' };
  const s = await db.collection<Supplier>('suppliers').findOneAndDelete({ _id: id, tenantId: ctx.tenantId });
  if (!s) return { ok: false, error: 'notFound' };
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'supplier.delete', summary: s.name });
  revalidatePath('/suppliers');
  redirect('/suppliers');
}
