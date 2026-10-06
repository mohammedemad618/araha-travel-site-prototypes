'use server';

import { revalidatePath } from 'next/cache';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { getDb } from '../db';
import { actionTenant, toObjectId } from '../session';
import { audit } from '../audit';
import { can, type Permission } from '../rbac';
import { ALLOWED_TYPES, MAX_FILE, bucket, sniffType } from '../files';
import { entityTypes, type EntityType } from '../types';
import type { ActionResult } from '../forms';

const WRITE: Record<EntityType, { collection: string; perm: Permission; path: string }> = {
  lead: { collection: 'leads', perm: 'leads.write', path: '/leads' },
  customer: { collection: 'customers', perm: 'customers.write', path: '/customers' },
  booking: { collection: 'bookings', perm: 'bookings.write', path: '/bookings' },
  visa: { collection: 'visas', perm: 'visas.write', path: '/visas' },
  supplier: { collection: 'suppliers', perm: 'suppliers.write', path: '/suppliers' },
};

export async function uploadAttachment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant();
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const type = z.enum(entityTypes).safeParse(fd.get('entityType'));
  const entityId = toObjectId(String(fd.get('entityId') ?? ''));
  const file = fd.get('file');
  if (!type.success || !entityId) return { ok: false, error: 'notFound' };
  const meta = WRITE[type.data];
  if (!can(ctx.role, meta.perm)) return { ok: false, error: 'forbidden' };
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: 'required', fields: { file: 'required' } };
  if (file.size > MAX_FILE) return { ok: false, error: 'fileTooLarge', fields: { file: 'fileTooLarge' } };
  const db = await getDb();
  if (
    !(await db
      .collection(meta.collection)
      .countDocuments({ _id: entityId, tenantId: ctx.tenantId }, { limit: 1 }))
  )
    return { ok: false, error: 'notFound' };

  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = sniffType(buf);
  if (!contentType || !ALLOWED_TYPES.includes(contentType))
    return { ok: false, error: 'fileType', fields: { file: 'fileType' } };
  const name = file.name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'file';
  const b = await bucket();
  await new Promise<void>((resolve, reject) => {
    Readable.from(buf)
      .pipe(
        b.openUploadStream(name, {
          metadata: {
            tenantId: ctx.tenantId,
            entityType: type.data,
            entityId,
            contentType,
            uploadedBy: ctx.user._id,
          },
        }),
      )
      .on('finish', () => resolve())
      .on('error', reject);
  });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'file.upload',
    entity: type.data,
    entityId,
    summary: name,
  });
  revalidatePath(`${meta.path}/${entityId}`);
  return { ok: true };
}

export async function deleteAttachment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant();
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const file = await db
    .collection<{
      _id: import('mongodb').ObjectId;
      filename: string;
      metadata: { tenantId: unknown; entityType: EntityType; entityId: unknown };
    }>('attachments.files')
    .findOne({ _id: id, 'metadata.tenantId': ctx.tenantId });
  if (!file) return { ok: false, error: 'notFound' };
  const meta = WRITE[file.metadata.entityType];
  if (!can(ctx.role, meta.perm)) return { ok: false, error: 'forbidden' };
  await (await bucket()).delete(id);
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'file.delete',
    summary: file.filename,
  });
  revalidatePath(`${meta.path}/${file.metadata.entityId}`);
  return { ok: true };
}
