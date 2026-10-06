import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { getDb } from './db';
import { randomToken, sha256 } from './crypto';
import { can, type Permission, type Role } from './rbac';
import type { Session, Tenant, User } from './types';

export const SESSION_COOKIE = 'nerp_session';
const SESSION_DAYS = 14;

export type Ctx = {
  user: User;
  role: Role;
  session: Session;
  /** The company being worked on (null for a platform admin outside any company). */
  tenant: Tenant | null;
};

/** A context that is guaranteed to be inside a company. */
export type TenantCtx = Ctx & { tenant: Tenant; tenantId: ObjectId };

export async function createSession(userId: ObjectId): Promise<void> {
  const db = await getDb();
  const token = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86400_000);
  await db.collection<Omit<Session, '_id'>>('sessions').insertOne({
    tokenHash: sha256(token),
    userId,
    createdAt: now,
    expiresAt,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.collection('sessions').deleteOne({ tokenHash: sha256(token) });
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. Cached per request. */
export const getCtx = cache(async (): Promise<Ctx | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db.collection<Session>('sessions').findOne({ tokenHash: sha256(token) });
  if (!session || session.expiresAt < new Date()) return null;
  const user = await db.collection<User>('users').findOne({ _id: session.userId });
  if (!user || !user.active) return null;

  const tenantId = user.role === 'platform' ? session.activeTenantId : user.tenantId;
  const tenant = tenantId ? await db.collection<Tenant>('tenants').findOne({ _id: tenantId }) : null;
  return { user, role: user.role, session, tenant };
});

/** Requires a signed-in user (any kind). */
export async function requireCtx(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect('/login');
  if (ctx.user.mustChangePassword) {
    const path = (await headers()).get('x-pathname') ?? '';
    if (!path.startsWith('/account/password')) redirect('/account/password');
  }
  return ctx;
}

/**
 * Requires a user working inside an active company, optionally with a
 * permission. Unauthorised access to a page shows "not found" rather than
 * revealing that the record exists.
 */
export async function requireTenant(permission?: Permission): Promise<TenantCtx> {
  const ctx = await requireCtx();
  if (!ctx.tenant) redirect(ctx.role === 'platform' ? '/platform' : '/login');
  if (ctx.tenant.status !== 'active' && ctx.role !== 'platform') redirect('/suspended');
  if (permission && !can(ctx.role, permission)) notFound();
  return { ...ctx, tenant: ctx.tenant, tenantId: ctx.tenant._id };
}

/** Same checks for server actions: returns an error instead of redirecting. */
export async function actionTenant(
  permission?: Permission,
): Promise<{ ok: true; ctx: TenantCtx } | { ok: false; error: string }> {
  const ctx = await getCtx();
  if (!ctx) return { ok: false, error: 'auth' };
  if (!ctx.tenant || (ctx.tenant.status !== 'active' && ctx.role !== 'platform'))
    return { ok: false, error: 'auth' };
  if (permission && !can(ctx.role, permission)) return { ok: false, error: 'forbidden' };
  return { ok: true, ctx: { ...ctx, tenant: ctx.tenant, tenantId: ctx.tenant._id } };
}

export async function requirePlatform(): Promise<Ctx> {
  const ctx = await requireCtx();
  if (ctx.role !== 'platform') notFound();
  return ctx;
}

export function toObjectId(id: string | undefined | null): ObjectId | null {
  if (!id || !ObjectId.isValid(id) || String(new ObjectId(id)) !== id) return null;
  return new ObjectId(id);
}
