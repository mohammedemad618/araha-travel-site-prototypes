import 'server-only';
import { getDb } from './db';

/**
 * Fixed-window limiter stored in MongoDB (works across serverless instances).
 * Returns false once `limit` hits within `windowSec` for this key.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const db = await getDb();
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const id = `${key}:${bucket}`;
  const res = await db
    .collection<{ _id: string; count: number; expiresAt: Date }>('rateLimits')
    .findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowSec * 1000 + 60_000) } },
      { upsert: true, returnDocument: 'after' },
    );
  return (res?.count ?? 0) <= limit;
}

/** True when `key` already reached `limit` in the current window (does not count this call). */
export async function overLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const db = await getDb();
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const doc = await db
    .collection<{ _id: string; count: number }>('rateLimits')
    .findOne({ _id: `${key}:${bucket}` });
  return (doc?.count ?? 0) >= limit;
}
