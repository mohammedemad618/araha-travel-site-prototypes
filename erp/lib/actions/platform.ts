'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '../db';
import { getCtx, toObjectId } from '../session';
import { hashPassword, tempPassword } from '../crypto';
import { audit } from '../audit';
import { defaultSettings, defaultWebsite } from '../tenants';
import { fieldErrors, type ActionResult } from '../forms';
import { ensureMainBranch } from '../migrations';
import type { Membership, Tenant, User } from '../types';

const tenantSchema = z.object({
  name: z.string().trim().min(1, 'required').max(120, 'tooLong'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,40}$/, 'invalidSlug'),
  plan: z.enum(['trial', 'basic', 'pro']),
  ownerName: z.string().trim().min(1, 'required').max(100, 'tooLong'),
  ownerEmail: z.string().trim().toLowerCase().email('invalidEmail'),
});

export async function createTenant(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCtx();
  if (!ctx || ctx.role !== 'platform') return { ok: false, error: 'forbidden' };
  const parsed = tenantSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const { name, slug, plan, ownerName, ownerEmail } = parsed.data;
  const db = await getDb();
  if (await db.collection('tenants').findOne({ slug }))
    return { ok: false, error: 'duplicateSlug', fields: { slug: 'duplicateSlug' } };
  // An existing account (e.g. someone who already runs another company) becomes the owner as is.
  const existing = await db.collection<User>('users').findOne({ email: ownerEmail });
  if (existing?.platformAdmin)
    return { ok: false, error: 'duplicateEmail', fields: { ownerEmail: 'duplicateEmail' } };

  const now = new Date();
  const tenant = await db.collection<Omit<Tenant, '_id'>>('tenants').insertOne({
    slug,
    name,
    plan,
    status: 'active',
    settings: defaultSettings(),
    website: defaultWebsite(),
    createdAt: now,
  });
  await ensureMainBranch(db, { _id: tenant.insertedId });
  let password: string | undefined;
  let ownerId = existing?._id;
  if (!ownerId) {
    password = tempPassword();
    ownerId = (
      await db.collection<Omit<User, '_id'>>('users').insertOne({
        email: ownerEmail,
        name: ownerName,
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        active: true,
        createdAt: now,
      })
    ).insertedId;
  }
  await db.collection<Omit<Membership, '_id'>>('memberships').insertOne({
    userId: ownerId,
    tenantId: tenant.insertedId,
    role: 'owner',
    scope: 'all',
    branchIds: [],
    active: true,
    createdAt: now,
  });
  await audit({
    tenantId: tenant.insertedId,
    userId: ctx.user._id,
    action: 'tenant.create',
    summary: `${name} (${slug})`,
  });
  revalidatePath('/platform');
  return password
    ? { ok: true, message: 'platform.created', data: { email: ownerEmail, password } }
    : { ok: true, message: 'platform.createdExisting', data: { email: ownerEmail } };
}

export async function setTenantStatus(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCtx();
  if (!ctx || ctx.role !== 'platform') return { ok: false, error: 'forbidden' };
  const id = toObjectId(String(fd.get('id') ?? ''));
  const status = fd.get('status') === 'suspended' ? 'suspended' : 'active';
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  await db.collection('tenants').updateOne({ _id: id }, { $set: { status } });
  if (status === 'suspended') {
    // Sign out the company's staff immediately.
    await db.collection('sessions').deleteMany({ activeTenantId: id });
  }
  await audit({ tenantId: id, userId: ctx.user._id, action: `tenant.${status}`, summary: status });
  revalidatePath('/platform');
  return { ok: true };
}

export async function setTenantPlan(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCtx();
  if (!ctx || ctx.role !== 'platform') return { ok: false, error: 'forbidden' };
  const id = toObjectId(String(fd.get('id') ?? ''));
  const plan = z.enum(['trial', 'basic', 'pro']).safeParse(fd.get('plan'));
  if (!id || !plan.success) return { ok: false, error: 'notFound' };
  const db = await getDb();
  await db.collection('tenants').updateOne({ _id: id }, { $set: { plan: plan.data } });
  revalidatePath('/platform');
  return { ok: true };
}
