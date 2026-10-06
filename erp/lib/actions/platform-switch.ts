'use server';

import { redirect } from 'next/navigation';
import { getDb } from '../db';
import { getCtx, toObjectId } from '../session';
import { audit } from '../audit';

/** Lets a platform admin work inside a company (for setup and support). */
export async function enterTenant(fd: FormData): Promise<void> {
  const ctx = await getCtx();
  if (!ctx || ctx.role !== 'platform') redirect('/login');
  const tenantId = toObjectId(String(fd.get('tenantId') ?? ''));
  if (!tenantId) redirect('/platform');
  const db = await getDb();
  const tenant = await db.collection('tenants').findOne({ _id: tenantId });
  if (!tenant) redirect('/platform');
  await db.collection('sessions').updateOne({ _id: ctx.session._id }, { $set: { activeTenantId: tenantId } });
  await audit({ tenantId, userId: ctx.user._id, action: 'platform.enter', summary: ctx.user.email });
  redirect('/');
}

export async function leaveTenant(): Promise<void> {
  const ctx = await getCtx();
  if (!ctx || ctx.role !== 'platform') redirect('/login');
  const db = await getDb();
  await db.collection('sessions').updateOne({ _id: ctx.session._id }, { $unset: { activeTenantId: '' } });
  redirect('/platform');
}
