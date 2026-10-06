import 'server-only';
import { GridFSBucket, type ObjectId } from 'mongodb';
import { getDb } from './db';
import type { EntityType } from './types';

export const MAX_FILE = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export type FileMeta = {
  tenantId: ObjectId;
  entityType: EntityType;
  entityId: ObjectId;
  contentType: string;
  uploadedBy: ObjectId;
};

export async function bucket(): Promise<GridFSBucket> {
  return new GridFSBucket(await getDb(), { bucketName: 'attachments' });
}

/** Checks the file's first bytes, not just the browser-supplied type. */
export function sniffType(buf: Buffer): string | null {
  if (buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP')
    return 'image/webp';
  if (buf.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

export async function listFiles(tenantId: ObjectId, entityType: EntityType, entityId: ObjectId) {
  const db = await getDb();
  return db
    .collection<{ _id: ObjectId; filename: string; length: number; uploadDate: Date; metadata: FileMeta }>(
      'attachments.files',
    )
    .find({ 'metadata.tenantId': tenantId, 'metadata.entityType': entityType, 'metadata.entityId': entityId })
    .sort({ uploadDate: -1 })
    .toArray();
}
