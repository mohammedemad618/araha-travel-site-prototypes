import type { Document, Filter, ObjectId } from 'mongodb';
import type { MemberScope } from './types';

// Which records a person may see inside their company. Pure functions so the
// rules can be unit-tested without a database.

/**
 * `branchIds`: only records of these branches (null = every branch).
 * `ownerId`: only records assigned to or created by this user (null = anyone's).
 */
export type Visibility = { branchIds: ObjectId[] | null; ownerId: ObjectId | null };

export const UNRESTRICTED: Visibility = { branchIds: null, ownerId: null };

/** Collections split by branch, and the fields that make a record "someone's own". */
export const SCOPED_COLLECTIONS = {
  leads: ['assignedTo', 'createdBy'],
  bookings: ['assignedTo', 'createdBy'],
  visas: ['assignedTo', 'createdBy'],
  payments: ['receivedBy'],
} as const;
export type ScopedCollection = keyof typeof SCOPED_COLLECTIONS;

const same = (a: ObjectId, b: ObjectId) => String(a) === String(b);

/**
 * Combines a member's scope with the branch they chose to look at.
 * A chosen branch outside a branch-limited member's own branches is ignored.
 */
export function visibilityFor(
  member: { scope: MemberScope; branchIds: ObjectId[]; userId: ObjectId } | null,
  branchFilter: ObjectId | null,
): Visibility {
  if (!member || member.scope === 'all')
    return { branchIds: branchFilter ? [branchFilter] : null, ownerId: null };
  if (member.scope === 'branch') {
    const chosen = branchFilter && member.branchIds.some((b) => same(b, branchFilter));
    return { branchIds: chosen ? [branchFilter] : member.branchIds, ownerId: null };
  }
  return { branchIds: branchFilter ? [branchFilter] : null, ownerId: member.userId };
}

/** The extra query clause a visibility adds to a scoped collection. */
export function visibilityFilter(v: Visibility, ownerFields: readonly string[]): Filter<Document> {
  const parts: Filter<Document>[] = [];
  if (v.branchIds) parts.push({ branchId: { $in: v.branchIds } });
  if (v.ownerId) parts.push({ $or: ownerFields.map((f) => ({ [f]: v.ownerId })) });
  if (!parts.length) return {};
  return parts.length === 1 ? parts[0]! : { $and: parts };
}

const isEmpty = (f: Filter<Document> | undefined) => !f || Object.keys(f).length === 0;

/**
 * Builds the final query: the caller's filter AND the visibility clause, with
 * the company id set last so no caller filter can replace it.
 */
export function scopedFilter(
  tenantId: ObjectId,
  filter: Filter<Document> | undefined,
  extra: Filter<Document>,
): Filter<Document> {
  let combined: Filter<Document>;
  if (isEmpty(filter)) combined = extra;
  else if (isEmpty(extra)) combined = filter!;
  else combined = { $and: [filter!, extra] };
  return { ...combined, tenantId };
}
