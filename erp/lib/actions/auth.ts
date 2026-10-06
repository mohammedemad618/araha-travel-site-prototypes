'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from '../db';
import { hashPassword, verifyPassword } from '../crypto';
import { createSession, destroySession, getCtx } from '../session';
import { rateLimit } from '../rate-limit';
import { audit } from '../audit';
import { fieldErrors, type ActionResult } from '../forms';
import type { User } from '../types';

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-nf-client-connection-ip') || h.get('x-forwarded-for') || 'local').split(',')[0]!.trim();
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'required'),
  password: z.string().min(1, 'required'),
  next: z.string().optional(),
});

export async function login(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const { email, password, next } = parsed.data;

  // Limit guessing per account and per address.
  const ip = await clientIp();
  const allowed = (await rateLimit(`login:${email}`, 8, 900)) && (await rateLimit(`login-ip:${ip}`, 30, 900));
  if (!allowed) return { ok: false, error: 'rateLimited' };

  const db = await getDb();
  const user = await db.collection<User>('users').findOne({ email });
  // Always run a hash check so response time does not reveal whether the account exists.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
  if (!user || !ok || !user.active) return { ok: false, error: 'wrongCredentials' };

  await createSession(user._id);
  await db.collection('users').updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  await audit({ tenantId: user.tenantId, userId: user._id, action: 'auth.login', summary: user.email });
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  // Redirect on the server so the new session cookie and the navigation arrive together.
  redirect(user.mustChangePassword ? '/account/password' : user.role === 'platform' ? '/platform' : safeNext);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect('/login');
}

const setupSchema = z
  .object({
    name: z.string().trim().min(1, 'required').max(100, 'tooLong'),
    email: z.string().trim().toLowerCase().email('invalidEmail'),
    password: z.string().min(10, 'weakPassword').max(200, 'tooLong'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'passwordMismatch', path: ['confirm'] });

/** Creates the first platform administrator. Refuses once any user exists. */
export async function setupPlatform(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = setupSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const db = await getDb();
  if ((await db.collection('users').estimatedDocumentCount()) > 0) return { ok: false, error: 'forbidden' };
  const now = new Date();
  const res = await db.collection<Omit<User, '_id'>>('users').insertOne({
    tenantId: null,
    email: parsed.data.email,
    name: parsed.data.name,
    role: 'platform',
    passwordHash: await hashPassword(parsed.data.password),
    mustChangePassword: false,
    active: true,
    createdAt: now,
  });
  await createSession(res.insertedId);
  await audit({
    tenantId: null,
    userId: res.insertedId,
    action: 'platform.setup',
    summary: parsed.data.email,
  });
  redirect('/platform');
}

const passwordSchema = z
  .object({
    current: z.string().min(1, 'required'),
    password: z.string().min(10, 'weakPassword').max(200, 'tooLong'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'passwordMismatch', path: ['confirm'] });

export async function changePassword(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ctx = await getCtx();
  if (!ctx) return { ok: false, error: 'auth' };
  const parsed = passwordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  if (!(await verifyPassword(parsed.data.current, ctx.user.passwordHash)))
    return { ok: false, error: 'wrongPassword', fields: { current: 'wrongPassword' } };
  const db = await getDb();
  await db
    .collection('users')
    .updateOne(
      { _id: ctx.user._id },
      { $set: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false } },
    );
  // Sign out every other device.
  await db.collection('sessions').deleteMany({ userId: ctx.user._id, _id: { $ne: ctx.session._id } });
  await audit({
    tenantId: ctx.user.tenantId,
    userId: ctx.user._id,
    action: 'auth.password',
    summary: ctx.user.email,
  });
  redirect(ctx.role === 'platform' && !ctx.tenant ? '/platform' : '/');
}

export async function setLanguage(fd: FormData): Promise<void> {
  const lang = fd.get('lang') === 'en' ? 'en' : 'ar';
  const jar = await cookies();
  jar.set('lang', lang, { path: '/', maxAge: 365 * 86400, sameSite: 'lax' });
  const back = String(fd.get('back') || '/');
  redirect(back.startsWith('/') && !back.startsWith('//') ? back : '/');
}
