'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '../db';
import type { ObjectId } from 'mongodb';
import { actionTenant, toObjectId, type TenantCtx } from '../session';
import { audit } from '../audit';
import { hashPassword, tempPassword } from '../crypto';
import { fieldErrors, formObject, optText, text, toUpdate, type ActionResult } from '../forms';
import { newApiKey } from '../tenants';
import { repo } from '../repo';
import { tenantRoles, type TenantRole } from '../rbac';
import { memberScopes, type User } from '../types';

const companySchema = z.object({
  name: text(120),
  currency: z.enum(['IQD', 'USD']),
  usdRate: z.coerce
    .number({ invalid_type_error: 'invalidNumber' })
    .min(100, 'tooSmall')
    .max(100000, 'tooLarge'),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'required'),
  bookingPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,6}$/, 'invalidSlug'),
  receiptPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,6}$/, 'invalidSlug'),
  phone: optText(40),
  address: optText(300),
  invoiceFooter: optText(600),
});

export async function updateCompany(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('settings.manage');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = companySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const { name, ...settings } = parsed.data;
  const db = await getDb();
  await db.collection('tenants').updateOne(
    { _id: ctx.tenantId },
    toUpdate({
      name,
      ...Object.fromEntries(Object.entries(settings).map(([k, v]) => [`settings.${k}`, v])),
    }),
  );
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'settings.company',
    summary: `${name} · ${settings.usdRate}`,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

const websiteSchema = z.object({
  siteUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https:\/\/[^\s/]+/.test(v), 'invalidUrl')
    .transform((v) => (v ? v.replace(/\/+$/, '') : undefined)),
  buildHookUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https:\/\/api\.netlify\.com\/build_hooks\/[\w-]+$/.test(v), 'invalidHook')
    .transform((v) => (v ? v : undefined)),
  allowedOrigins: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(/\s+/)
        .map((s) => s.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    )
    .refine((list) => list.every((o) => /^https?:\/\/[^\s/]+$/.test(o)), 'invalidUrl'),
});

export async function updateWebsite(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('settings.manage');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = websiteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  // The site's own address is always allowed to send leads.
  const origins = new Set(d.allowedOrigins);
  if (d.siteUrl) origins.add(new URL(d.siteUrl).origin);
  const db = await getDb();
  await db.collection('tenants').updateOne(
    { _id: ctx.tenantId },
    toUpdate({
      'website.siteUrl': d.siteUrl,
      'website.buildHookUrl': d.buildHookUrl,
      'website.allowedOrigins': [...origins],
    }),
  );
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'settings.website',
    summary: [...origins].join(' '),
  });
  revalidatePath('/settings/website');
  return { ok: true };
}

export async function regenerateApiKey(): Promise<ActionResult> {
  const auth = await actionTenant('settings.manage');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const db = await getDb();
  await db
    .collection('tenants')
    .updateOne({ _id: ctx.tenantId }, { $set: { 'website.apiKey': newApiKey() } });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'settings.apikey',
    summary: 'regenerated',
  });
  revalidatePath('/settings/website');
  return { ok: true };
}

const accessSchema = z
  .object({
    role: z.enum(tenantRoles),
    scope: z.enum(memberScopes),
    branchIds: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((v) => (Array.isArray(v) ? v : v ? [v] : [])),
  })
  .refine((v) => v.scope !== 'branch' || v.branchIds.length > 0, {
    message: 'branchRequired',
    path: ['branchIds'],
  });

/** Keeps only branches of this company; "all" scope ignores branches. */
function memberAccess(ctx: TenantCtx, d: z.infer<typeof accessSchema>) {
  const ids = d.scope === 'all' ? [] : d.branchIds.map((id) => toObjectId(id)).filter(Boolean);
  const branchIds = ctx.allBranches
    .filter((b) => ids.some((id) => String(id) === String(b._id)))
    .map((b) => b._id);
  return { role: d.role as TenantRole, scope: d.scope, branchIds };
}

const userSchema = z.object({
  name: text(100),
  email: z.string().trim().toLowerCase().email('invalidEmail'),
});

/**
 * Adds a member. A new email gets an account with a temporary password; an
 * email that already has an account (in another company) is simply given
 * access here and keeps its own password.
 */
export async function createUser(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('users.manage');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const form = formObject(fd);
  const parsed = userSchema.safeParse(form);
  const access = accessSchema.safeParse(form);
  if (!parsed.success || !access.success)
    return {
      ok: false,
      error: 'required',
      fields: {
        ...(parsed.success ? {} : fieldErrors(parsed.error)),
        ...(access.success ? {} : fieldErrors(access.error)),
      },
    };
  const a = memberAccess(ctx, access.data);
  if (a.scope === 'branch' && !a.branchIds.length)
    return { ok: false, error: 'required', fields: { branchIds: 'branchRequired' } };
  const db = await getDb();
  const r = await repo(ctx);
  const existing = await db.collection<User>('users').findOne({ email: parsed.data.email });
  if (existing?.platformAdmin)
    return { ok: false, error: 'duplicateEmail', fields: { email: 'duplicateEmail' } };
  if (existing && (await r.memberships.exists({ userId: existing._id })))
    return { ok: false, error: 'alreadyMember', fields: { email: 'alreadyMember' } };

  let userId = existing?._id;
  let password: string | undefined;
  if (!userId) {
    password = tempPassword();
    userId = (
      await db.collection<Omit<User, '_id'>>('users').insertOne({
        ...parsed.data,
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        active: true,
        createdAt: new Date(),
      })
    ).insertedId;
  }
  await r.memberships.insertOne({ userId, ...a, active: true, createdAt: new Date() });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: existing ? 'user.add' : 'user.create',
    summary: `${parsed.data.email} (${a.role}, ${a.scope})`,
  });
  revalidatePath('/settings/users');
  return password
    ? { ok: true, data: { email: parsed.data.email, password } }
    : { ok: true, message: 'settings.memberAdded', data: { email: parsed.data.email } };
}

async function ownersLeft(ctx: TenantCtx, excluding: ObjectId) {
  const r = await repo(ctx);
  return r.memberships.countDocuments({ role: 'owner', active: true, userId: { $ne: excluding } });
}

export async function updateUser(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('users.manage');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const r = await repo(ctx);
  const member = await r.memberships.findOne({ userId: id });
  const user = member ? await db.collection<User>('users').findOne({ _id: id }) : null;
  if (!member || !user) return { ok: false, error: 'notFound' };
  const self = String(id) === String(ctx.user._id);

  const action = String(fd.get('op') ?? '');
  if (action === 'access') {
    const access = accessSchema.safeParse(formObject(fd));
    if (!access.success) return { ok: false, error: 'required', fields: fieldErrors(access.error) };
    const a = memberAccess(ctx, access.data);
    if (a.scope === 'branch' && !a.branchIds.length)
      return { ok: false, error: 'required', fields: { branchIds: 'branchRequired' } };
    if (member.role === 'owner' && a.role !== 'owner' && !(await ownersLeft(ctx, id)))
      return { ok: false, error: 'lastOwner' };
    // Owners manage everything, so they are never limited.
    if (a.role === 'owner') Object.assign(a, { scope: 'all', branchIds: [] });
    await r.memberships.updateOne({ _id: member._id }, { $set: a });
    await audit({
      tenantId: ctx.tenantId,
      userId: ctx.user._id,
      action: 'user.role',
      summary: `${user.email} → ${a.role}, ${a.scope}`,
    });
  } else if (action === 'toggle') {
    if (self) return { ok: false, error: 'forbidden' };
    if (member.active && member.role === 'owner' && !(await ownersLeft(ctx, id)))
      return { ok: false, error: 'lastOwner' };
    await r.memberships.updateOne({ _id: member._id }, { $set: { active: !member.active } });
    // Sign out sessions working in this company; access to other companies is untouched.
    if (member.active)
      await db.collection('sessions').deleteMany({
        userId: id,
        $or: [{ activeTenantId: ctx.tenantId }, { activeTenantId: { $exists: false } }],
      });
    await audit({
      tenantId: ctx.tenantId,
      userId: ctx.user._id,
      action: member.active ? 'user.disable' : 'user.enable',
      summary: user.email,
    });
  } else if (action === 'reset') {
    // A password belongs to the person, not the company: it can only be reset
    // here when this company is the only one the account belongs to.
    const elsewhere = await db
      .collection('memberships')
      .countDocuments({ userId: id, tenantId: { $ne: ctx.tenantId } }, { limit: 1 });
    if (elsewhere || user.platformAdmin) return { ok: false, error: 'sharedAccount' };
    const password = tempPassword();
    await db
      .collection('users')
      .updateOne(
        { _id: id },
        { $set: { passwordHash: await hashPassword(password), mustChangePassword: true } },
      );
    await db.collection('sessions').deleteMany({ userId: id });
    await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'user.reset', summary: user.email });
    revalidatePath('/settings/users');
    return { ok: true, data: { email: user.email, password } };
  } else {
    return { ok: false, error: 'notFound' };
  }
  revalidatePath('/settings/users');
  return { ok: true };
}
