import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { getDb } from './db';
import { randomToken, sha256 } from './crypto';
import { can, type Permission, type Role } from './rbac';
import { visibilityFor, type Visibility } from './scope';
import type { Branch, Membership, Session, Tenant, User } from './types';

export const SESSION_COOKIE = 'nerp_session';
const SESSION_DAYS = 14;

export type Ctx = {
  user: User;
  /** The role in the current company, or "platform" for Niura staff. */
  role: Role;
  session: Session;
  /** The company being worked on (null for a platform admin outside any company). */
  tenant: Tenant | null;
  /** The user's membership in that company (null for platform admins). */
  membership: Membership | null;
  /** Every company the user belongs to, for the company switcher. */
  memberships: Membership[];
};

/** A context that is guaranteed to be inside a company. */
export type TenantCtx = Ctx & {
  tenant: Tenant;
  tenantId: ObjectId;
  /** Every branch of the company (including closed ones), for names. */
  allBranches: Branch[];
  /** Open branches this member may work in, main branch first. */
  branches: Branch[];
  /** The branch new records go to unless another is chosen. */
  defaultBranchId: ObjectId;
  /** The branch the lists are narrowed to, if any. */
  branchFilter: ObjectId | null;
  visibility: Visibility;
};

export async function createSession(userId: ObjectId, activeTenantId?: ObjectId): Promise<void> {
  const db = await getDb();
  const token = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86400_000);
  await db.collection<Omit<Session, '_id'>>('sessions').insertOne({
    tokenHash: sha256(token),
    userId,
    activeTenantId,
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
  // Everything else depends only on the session, so it is read in one round
  // trip instead of one after another (each costs a trip to the database).
  const activeId = session.activeTenantId;
  if (activeId) loadBranches(String(activeId)).catch(() => undefined); // warms the per-request cache
  const [user, memberships, activeTenant] = await Promise.all([
    db.collection<User>('users').findOne({ _id: session.userId }),
    db
      .collection<Membership>('memberships')
      .find({ userId: session.userId, active: true })
      .sort({ createdAt: 1 })
      .toArray(),
    activeId ? db.collection<Tenant>('tenants').findOne({ _id: activeId }) : null,
  ]);
  if (!user || !user.active) return null;

  if (user.platformAdmin) {
    return { user, role: 'platform', session, tenant: activeTenant, membership: null, memberships: [] };
  }
  const membership =
    memberships.find((m) => activeId && String(m.tenantId) === String(activeId)) ?? memberships[0];
  // A user who belongs to no company any more is treated as signed out.
  if (!membership) return null;
  const tenant =
    activeTenant && String(activeTenant._id) === String(membership.tenantId)
      ? activeTenant
      : await db.collection<Tenant>('tenants').findOne({ _id: membership.tenantId });
  return { user, role: membership.role, session, tenant, membership, memberships };
});

const loadBranches = cache(async (tenantId: string): Promise<Branch[]> => {
  const db = await getDb();
  return db
    .collection<Branch>('branches')
    .find({ tenantId: new ObjectId(tenantId) })
    .sort({ isMain: -1, name: 1 })
    .toArray();
});

/** Adds the company's branches and the member's visibility to a context. */
async function withBranches(ctx: Ctx & { tenant: Tenant }): Promise<TenantCtx> {
  const allBranches = await loadBranches(String(ctx.tenant._id));
  const open = allBranches.filter((b) => b.active);
  const m = ctx.membership;
  const limited = m && m.branchIds.length > 0 && m.scope !== 'all';
  const branches = limited
    ? open.filter((b) => m.branchIds.some((id) => String(id) === String(b._id)))
    : open;
  const chosen = ctx.session.branchFilter
    ? allBranches.find((b) => String(b._id) === String(ctx.session.branchFilter))
    : undefined;
  const branchFilter = chosen ? chosen._id : null;
  const visibility = visibilityFor(
    m ? { scope: m.scope, branchIds: m.branchIds, userId: ctx.user._id } : null,
    branchFilter,
  );
  const defaultBranch =
    branches.find((b) => branchFilter && String(b._id) === String(branchFilter)) ?? branches[0] ?? open[0];
  return {
    ...ctx,
    tenantId: ctx.tenant._id,
    allBranches,
    branches,
    // Every company has a main branch (created with the company or by migration).
    defaultBranchId: (defaultBranch ?? allBranches[0])?._id as ObjectId,
    branchFilter,
    visibility,
  };
}

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
  return withBranches({ ...ctx, tenant: ctx.tenant });
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
  return { ok: true, ctx: await withBranches({ ...ctx, tenant: ctx.tenant }) };
}

export async function requirePlatform(): Promise<Ctx> {
  const ctx = await requireCtx();
  if (ctx.role !== 'platform') notFound();
  return ctx;
}

/**
 * The branch a new or edited record belongs to: the one chosen in the form if
 * the member may use it, otherwise their default. Returns null for a branch
 * they may not use.
 */
export function pickBranch(
  ctx: TenantCtx,
  raw: FormDataEntryValue | string | null | undefined,
  /** The record's current branch, which may be kept even if it has since closed. */
  current?: ObjectId,
): ObjectId | null {
  const id = toObjectId(typeof raw === 'string' ? raw : null);
  if (!id) return current ?? ctx.defaultBranchId;
  if (current && String(current) === String(id)) return current;
  return ctx.branches.some((b) => String(b._id) === String(id)) ? id : null;
}

/** Branch choices for a form: the member's open branches plus the record's current one. */
export function branchOptions(ctx: TenantCtx, current?: ObjectId | null): { id: string; name: string }[] {
  const list = [...ctx.branches];
  if (current && !list.some((b) => String(b._id) === String(current))) {
    const b = ctx.allBranches.find((x) => String(x._id) === String(current));
    if (b) list.push(b);
  }
  return list.map((b) => ({ id: String(b._id), name: b.name }));
}

export function branchName(ctx: TenantCtx, id: ObjectId | null | undefined): string | undefined {
  if (!id) return undefined;
  return ctx.allBranches.find((b) => String(b._id) === String(id))?.name;
}

export function toObjectId(id: string | undefined | null): ObjectId | null {
  if (!id || !ObjectId.isValid(id) || String(new ObjectId(id)) !== id) return null;
  return new ObjectId(id);
}
