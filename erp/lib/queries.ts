import 'server-only';
import { cache } from 'react';
import { ObjectId, type Document, type Filter } from 'mongodb';
import { getDb } from './db';
import type { Membership, User } from './types';

export const PAGE_SIZE = 25;

/** Staff of a company (its members), for "assigned to" pickers and name lookups. */
export const getStaff = (tenantId: ObjectId) => staffOf(String(tenantId));

// Cached per request by the id's text: React's cache compares arguments by
// identity, and every caller holds its own ObjectId instance.
const staffOf = cache(async (id: string) => {
  const db = await getDb();
  const members = await db
    .collection<Membership>('memberships')
    .find({ tenantId: new ObjectId(id) })
    .toArray();
  const users = await db
    .collection<User>('users')
    .find({ _id: { $in: members.map((m) => m.userId) } }, { projection: { name: 1, email: 1, active: 1 } })
    .sort({ name: 1 })
    .toArray();
  return users.map((u) => {
    const m = members.find((x) => String(x.userId) === String(u._id))!;
    return {
      id: String(u._id),
      name: u.name,
      role: m.role,
      active: u.active && m.active,
      email: u.email,
    };
  });
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
