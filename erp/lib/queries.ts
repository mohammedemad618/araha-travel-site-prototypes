import 'server-only';
import { cache } from 'react';
import type { Filter, ObjectId, Document } from 'mongodb';
import { getDb } from './db';
import type { User } from './types';

export const PAGE_SIZE = 25;

/** Staff of a company, for "assigned to" pickers and name lookups. */
export const getStaff = cache(async (tenantId: ObjectId) => {
  const db = await getDb();
  const users = await db
    .collection<User>('users')
    .find({ tenantId }, { projection: { name: 1, role: 1, active: 1, email: 1 } })
    .sort({ name: 1 })
    .toArray();
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    role: u.role,
    active: u.active,
    email: u.email,
  }));
});

export async function staffName(tenantId: ObjectId, id?: ObjectId | null): Promise<string | undefined> {
  if (!id) return undefined;
  return (await getStaff(tenantId)).find((s) => s.id === String(id))?.name;
}

/** Escapes user input for a case-insensitive "contains" regex. */
export function searchRegex(q: string): RegExp {
  return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/** Name/phone search clause; digits also match stored phone numbers. */
export function nameOrPhone(q: string | undefined): Filter<Document> {
  if (!q?.trim()) return {};
  const term = q.trim();
  const digits = term.replace(/\D/g, '').replace(/^0/, '');
  const or: Filter<Document>[] = [{ name: searchRegex(term) }];
  if (digits.length >= 3) or.push({ phone: new RegExp(digits) });
  return { $or: or };
}

export function pageParams(page: string | undefined): { page: number; skip: number } {
  const n = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
  return { page: n, skip: (n - 1) * PAGE_SIZE };
}

export function oid(id: ObjectId | undefined | null): string {
  return id ? String(id) : '';
}
