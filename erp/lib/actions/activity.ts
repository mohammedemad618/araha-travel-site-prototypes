'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '../db';
import { actionTenant, toObjectId } from '../session';
import { logActivity } from '../audit';
import { can, type Permission } from '../rbac';
import { fieldErrors, optDate, text, toUpdate, type ActionResult } from '../forms';
import { activityKinds, entityTypes, type EntityType } from '../types';

const ENTITY: Record<EntityType, { collection: string; perm: Permission; path: string }> = {
  lead: { collection: 'leads', perm: 'leads.read', path: '/leads' },
  customer: { collection: 'customers', perm: 'customers.read', path: '/customers' },
  booking: { collection: 'bookings', perm: 'bookings.read', path: '/bookings' },
  visa: { collection: 'visas', perm: 'visas.read', path: '/visas' },
  supplier: { collection: 'suppliers', perm: 'suppliers.read', path: '/suppliers' },
};

/** Resolves an entity reference from a form and checks it belongs to the company. */
async function resolveEntity(
  tenantId: import('mongodb').ObjectId,
  role: Parameters<typeof can>[0],
  type: unknown,
  id: unknown,
) {
  const t = z.enum(entityTypes).safeParse(type);
  const oid = toObjectId(String(id ?? ''));
  if (!t.success || !oid) return null;
  const meta = ENTITY[t.data];
  if (!can(role, meta.perm)) return null;
  const db = await getDb();
  const exists = await db.collection(meta.collection).countDocuments({ _id: oid, tenantId }, { limit: 1 });
  return exists ? { type: t.data, id: oid, path: `${meta.path}/${oid}` } : null;
}

export async function addActivity(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant();
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const entity = await resolveEntity(ctx.tenantId, ctx.role, fd.get('entityType'), fd.get('entityId'));
  if (!entity) return { ok: false, error: 'notFound' };
  const parsed = z
    .object({ kind: z.enum(activityKinds), text: text(3000) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  await logActivity(
    ctx.tenantId,
    { type: entity.type, id: entity.id },
    parsed.data.kind,
    parsed.data.text,
    ctx.user._id,
  );
  if (entity.type === 'lead' && parsed.data.kind !== 'note') {
    // Contacting a new lead moves it forward automatically.
    const db = await getDb();
    await db
      .collection('leads')
      .updateOne(
        { _id: entity.id, tenantId: ctx.tenantId, stage: 'new' },
        { $set: { stage: 'contacted', updatedAt: new Date() } },
      );
  }
  revalidatePath(entity.path);
  return { ok: true };
}

const taskSchema = z.object({
  title: text(300),
  dueDate: optDate,
  assignedTo: z.string().optional(),
});

export async function createTask(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant();
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = taskSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const related = fd.get('entityType')
    ? await resolveEntity(ctx.tenantId, ctx.role, fd.get('entityType'), fd.get('entityId'))
    : null;
  const db = await getDb();
  const assignee = toObjectId(parsed.data.assignedTo);
  if (assignee && !(await db.collection('users').countDocuments({ _id: assignee, tenantId: ctx.tenantId })))
    return { ok: false, error: 'notFound' };
  await db.collection('tasks').insertOne({
    tenantId: ctx.tenantId,
    title: parsed.data.title,
    dueDate: parsed.data.dueDate,
    done: false,
    assignedTo: assignee ?? ctx.user._id,
    related: related ? { type: related.type, id: related.id } : undefined,
    createdBy: ctx.user._id,
    createdAt: new Date(),
  });
  revalidatePath('/tasks');
  revalidatePath('/');
  if (related) revalidatePath(related.path);
  return { ok: true };
}

export async function toggleTask(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant();
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const done = fd.get('done') === '1';
  const db = await getDb();
  const res = await db
    .collection('tasks')
    .updateOne(
      { _id: id, tenantId: ctx.tenantId },
      toUpdate({ done, doneAt: done ? new Date() : undefined }),
    );
  if (!res.matchedCount) return { ok: false, error: 'notFound' };
  revalidatePath('/tasks');
  revalidatePath('/');
  const path = String(fd.get('path') ?? '');
  if (path.startsWith('/')) revalidatePath(path);
  return { ok: true };
}

export async function deleteTask(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant();
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  // Staff may delete their own tasks; managers may delete any.
  const filter: Record<string, unknown> = { _id: id, tenantId: ctx.tenantId };
  if (!can(ctx.role, 'settings.manage'))
    filter.$or = [{ createdBy: ctx.user._id }, { assignedTo: ctx.user._id }];
  const res = await db.collection('tasks').deleteOne(filter);
  if (!res.deletedCount) return { ok: false, error: 'forbidden' };
  revalidatePath('/tasks');
  return { ok: true };
}
