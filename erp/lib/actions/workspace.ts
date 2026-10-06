'use server';

import { redirect } from 'next/navigation';
import { getDb } from '../db';
import { getCtx, requireTenant, toObjectId } from '../session';

function back(fd: FormData): string {
  const path = String(fd.get('back') || '/');
  return path.startsWith('/') && !path.startsWith('//') ? path : '/';
}

/** Moves a member of several companies to another of their companies. */
export async function switchTenant(fd: FormData): Promise<void> {
  const ctx = await getCtx();
  if (!ctx || ctx.role === 'platform') redirect('/login');
  const tenantId = toObjectId(String(fd.get('tenantId') ?? ''));
  const membership = ctx.memberships.find((m) => tenantId && String(m.tenantId) === String(tenantId));
  if (membership) {
    const db = await getDb();
    await db
      .collection('sessions')
      .updateOne(
        { _id: ctx.session._id },
        { $set: { activeTenantId: membership.tenantId }, $unset: { branchFilter: '' } },
      );
  }
  redirect('/');
}

/** Narrows lists, the dashboard and reports to one branch (or back to all of them). */
export async function setBranchFilter(fd: FormData): Promise<void> {
  const ctx = await requireTenant();
  const id = toObjectId(String(fd.get('branchId') ?? ''));
  const allowed = id && ctx.branches.some((b) => String(b._id) === String(id));
  const db = await getDb();
  await db
    .collection('sessions')
    .updateOne(
      { _id: ctx.session._id },
      allowed ? { $set: { branchFilter: id } } : { $unset: { branchFilter: '' } },
    );
  redirect(back(fd));
}
