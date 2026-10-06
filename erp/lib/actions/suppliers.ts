'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { actionTenant, toObjectId } from '../session';
import { repo } from '../repo';
import { audit } from '../audit';
import { fieldErrors, optEmail, optText, text, toUpdate, type ActionResult } from '../forms';
import { supplierTypes } from '../types';

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
  const r = await repo(ctx);
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (id) {
    const res = await r.suppliers.updateOne({ _id: id }, toUpdate(parsed.data));
    if (!res.matchedCount) return { ok: false, error: 'notFound' };
    revalidatePath(`/suppliers/${id}`);
    return { ok: true };
  }
  const supplierId = await r.suppliers.insertOne({ ...parsed.data, createdAt: new Date() });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'supplier.create',
    entity: 'supplier',
    entityId: supplierId,
    summary: parsed.data.name,
  });
  revalidatePath('/suppliers');
  redirect(`/suppliers/${supplierId}`);
}

export async function deleteSupplier(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('suppliers.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  const used =
    (await r.all.bookings.exists({ 'costs.supplierId': id })) ||
    (await r.supplierPayments.exists({ supplierId: id }));
  if (used) return { ok: false, error: 'hasRecords' };
  const s = await r.suppliers.findOneAndDelete({ _id: id });
  if (!s) return { ok: false, error: 'notFound' };
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'supplier.delete', summary: s.name });
  revalidatePath('/suppliers');
  redirect('/suppliers');
}
