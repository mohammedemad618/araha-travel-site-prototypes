'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '../db';
import { actionTenant, toObjectId } from '../session';
import { audit } from '../audit';
import { hashPassword, tempPassword } from '../crypto';
import { fieldErrors, optText, text, toUpdate, type ActionResult } from '../forms';
import { newApiKey } from '../tenants';
import { tenantRoles, type TenantRole } from '../rbac';
import type { User } from '../types';

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

const userSchema = z.object({
  name: text(100),
  email: z.string().trim().toLowerCase().email('invalidEmail'),
  role: z.enum(tenantRoles),
});

export async function createUser(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('users.manage');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = userSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const db = await getDb();
  if (await db.collection('users').findOne({ email: parsed.data.email }))
    return { ok: false, error: 'duplicateEmail', fields: { email: 'duplicateEmail' } };
  const password = tempPassword();
  await db.collection<Omit<User, '_id'>>('users').insertOne({
    tenantId: ctx.tenantId,
    ...parsed.data,
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
    active: true,
    createdAt: new Date(),
  });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'user.create',
    summary: `${parsed.data.email} (${parsed.data.role})`,
  });
  revalidatePath('/settings/users');
  return { ok: true, data: { email: parsed.data.email, password } };
}

async function ownersLeft(tenantId: import('mongodb').ObjectId, excluding: import('mongodb').ObjectId) {
  const db = await getDb();
  return db
    .collection('users')
    .countDocuments({ tenantId, role: 'owner', active: true, _id: { $ne: excluding } });
}

export async function updateUser(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('users.manage');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const user = await db.collection<User>('users').findOne({ _id: id, tenantId: ctx.tenantId });
  if (!user) return { ok: false, error: 'notFound' };

  const action = String(fd.get('op') ?? '');
  if (action === 'role') {
    const role = z.enum(tenantRoles).safeParse(fd.get('role'));
    if (!role.success) return { ok: false, error: 'required' };
    if (user.role === 'owner' && role.data !== 'owner' && !(await ownersLeft(ctx.tenantId, id)))
      return { ok: false, error: 'lastOwner' };
    await db.collection('users').updateOne({ _id: id }, { $set: { role: role.data as TenantRole } });
    await audit({
      tenantId: ctx.tenantId,
      userId: ctx.user._id,
      action: 'user.role',
      summary: `${user.email} → ${role.data}`,
    });
  } else if (action === 'toggle') {
    if (String(id) === String(ctx.user._id)) return { ok: false, error: 'forbidden' };
    if (user.active && user.role === 'owner' && !(await ownersLeft(ctx.tenantId, id)))
      return { ok: false, error: 'lastOwner' };
    await db.collection('users').updateOne({ _id: id }, { $set: { active: !user.active } });
    if (user.active) await db.collection('sessions').deleteMany({ userId: id });
    await audit({
      tenantId: ctx.tenantId,
      userId: ctx.user._id,
      action: user.active ? 'user.disable' : 'user.enable',
      summary: user.email,
    });
  } else if (action === 'reset') {
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
