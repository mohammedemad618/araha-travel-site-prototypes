import 'server-only';
import type { ObjectId } from 'mongodb';
import { getDb } from './db';
import type { AuditLog, EntityRef, ActivityKind } from './types';

/** Records who did what. Never throws: an audit failure must not break the action. */
export async function audit(entry: Omit<AuditLog, '_id' | 'at'>): Promise<void> {
  try {
    const db = await getDb();
    await db.collection<Omit<AuditLog, '_id'>>('auditLogs').insertOne({ ...entry, at: new Date() });
  } catch (err) {
    console.error('audit failed', err);
  }
}

/** Adds an entry to a record's activity timeline. */
export async function logActivity(
  tenantId: ObjectId,
  entity: EntityRef,
  kind: ActivityKind,
  text: string,
  userId?: ObjectId,
): Promise<void> {
  const db = await getDb();
  await db
    .collection('activities')
    .insertOne({ tenantId, entity, kind, text, userId, createdAt: new Date() });
}
