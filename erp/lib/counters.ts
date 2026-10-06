import 'server-only';
import type { ObjectId } from 'mongodb';
import { getDb } from './db';

/** Next number in a per-company sequence (atomic, safe under concurrent requests). */
export async function nextSequence(tenantId: ObjectId, key: string): Promise<number> {
  const db = await getDb();
  const res = await db
    .collection<{ _id: string; seq: number }>('counters')
    .findOneAndUpdate(
      { _id: `${tenantId}:${key}` },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
  return res!.seq;
}

/** e.g. "NB-2026-0042". */
export async function nextNumber(tenantId: ObjectId, prefix: string, key: string): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSequence(tenantId, `${key}:${year}`);
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}
