import { expect, test } from '@playwright/test';
import { convert, formatMoney, parseMoney, toMinor } from '../lib/money';
import { normalizePhone, isValidPhone } from '../lib/phone';
import { can } from '../lib/rbac';
import { addDays, isISODate } from '../lib/dates';
import { scopedFilter, visibilityFilter, visibilityFor } from '../lib/scope';
import { ObjectId } from 'mongodb';
import { lineTotals, readiness } from '../lib/services';
import { quoteState } from '../lib/quotes';
import { checkBalanced, differences, naturalBalance, reversed } from '../lib/accounting/math';

test('money parsing and conversion stay exact', () => {
  expect(parseMoney('1,250,000', 'IQD')).toBe(1250000);
  expect(parseMoney('١٢٥٠٠٠', 'IQD')).toBe(125000);
  expect(parseMoney('350.55', 'USD')).toBe(35055);
  expect(parseMoney('abc', 'IQD')).toBeNull();
  expect(convert(toMinor(500, 'USD'), 'USD', 'IQD', 1310)).toBe(655000);
  expect(convert(655000, 'IQD', 'USD', 1310)).toBe(50000);
  expect(formatMoney(1750000, 'IQD', 'en')).toBe('IQD 1,750,000');
  expect(formatMoney(12345, 'USD')).toBe('$123.45');
});

test('Iraqi phone numbers normalise to international format', () => {
  expect(normalizePhone('0770 123 4567')).toBe('+9647701234567');
  expect(normalizePhone('٠٧٧٠١٢٣٤٥٦٧')).toBe('+9647701234567');
  expect(normalizePhone('00964 780 000 1111')).toBe('+9647800001111');
  expect(isValidPhone('123')).toBe(false);
});

test('roles grant only their permissions', () => {
  expect(can('owner', 'users.manage')).toBe(true);
  expect(can('manager', 'users.manage')).toBe(false);
  expect(can('sales', 'leads.write')).toBe(true);
  expect(can('sales', 'reports.read')).toBe(false);
  expect(can('accountant', 'finance.write')).toBe(true);
  expect(can('accountant', 'leads.read')).toBe(false);
  expect(can('viewer', 'bookings.write')).toBe(false);
  expect(can('sales', 'data.export')).toBe(false);
  expect(can('viewer', 'data.export')).toBe(false);
  expect(can('accountant', 'data.export')).toBe(true);
  expect(can('operations', 'website.write')).toBe(true);
  expect(can('manager', 'website.write')).toBe(true);
  expect(can('sales', 'website.write')).toBe(false);
  expect(can('viewer', 'website.write')).toBe(false);
});

test('business dates reject impossible days', () => {
  expect(isISODate('2026-02-30')).toBe(false);
  expect(isISODate('2026-12-31')).toBe(true);
  expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
});

test('visibility: scope and branch filter combine into the right query', () => {
  const user = new ObjectId();
  const b1 = new ObjectId();
  const b2 = new ObjectId();
  const tenant = new ObjectId();

  // Whole company, no branch chosen: no restriction.
  expect(visibilityFor({ scope: 'all', branchIds: [], userId: user }, null)).toEqual({
    branchIds: null,
    ownerId: null,
  });
  // Whole company, one branch chosen: that branch.
  expect(visibilityFor({ scope: 'all', branchIds: [], userId: user }, b2).branchIds).toEqual([b2]);
  // Branch-limited member: their branches; a chosen branch outside them is ignored.
  expect(visibilityFor({ scope: 'branch', branchIds: [b1], userId: user }, b2).branchIds).toEqual([b1]);
  expect(visibilityFor({ scope: 'branch', branchIds: [b1, b2], userId: user }, b2).branchIds).toEqual([b2]);
  // Own records only.
  const own = visibilityFor({ scope: 'own', branchIds: [], userId: user }, null);
  expect(own.ownerId).toEqual(user);
  expect(visibilityFilter(own, ['assignedTo', 'createdBy'])).toEqual({
    $or: [{ assignedTo: user }, { createdBy: user }],
  });

  // The company id always wins, and caller $or clauses survive alongside the scope.
  const q = scopedFilter(
    tenant,
    { $or: [{ name: 'x' }], tenantId: new ObjectId() },
    visibilityFilter({ branchIds: [b1], ownerId: null }, ['assignedTo']),
  );
  expect(q.tenantId).toEqual(tenant);
  expect(q.$and).toHaveLength(2);
  expect(scopedFilter(tenant, undefined, {})).toEqual({ tenantId: tenant });
});

test('service totals skip cancelled lines and count supplier costs', () => {
  const line = (status: 'pending' | 'confirmed' | 'cancelled', unitPrice: number, cost = 0) => ({
    _id: new ObjectId(),
    type: 'hotel' as const,
    description: 'x',
    qty: 2,
    unitPrice,
    costInBooking: cost,
    status,
  });
  const lines = [line('confirmed', 500, 300), line('pending', 100), line('cancelled', 999, 999)];
  expect(lineTotals(lines, 50)).toEqual({ subtotal: 1200, total: 1150, costTotal: 300 });
  expect(readiness(lines)).toEqual({ confirmed: 1, total: 2 });
  expect(quoteState({ status: 'sent', validUntil: '2026-01-01' }, '2026-02-01')).toBe('expired');
  expect(quoteState({ status: 'accepted', validUntil: '2026-01-01' }, '2026-02-01')).toBe('accepted');
});

test('double entry: balance checks, natural balances, differences and reversals', () => {
  const line = (accountId: string, debit: number, credit: number) => ({ accountId, debit, credit });
  expect(checkBalanced([line('a', 100, 0), line('b', 0, 100)])).toEqual({ ok: true, total: 100 });
  expect(checkBalanced([line('a', 100, 0), line('b', 0, 90)])).toEqual({ ok: false, error: 'unbalanced' });
  expect(checkBalanced([line('a', 100, 100), line('b', 0, 0)])).toEqual({
    ok: false,
    error: 'oneSidePerLine',
  });
  expect(checkBalanced([line('a', 100, 0)])).toEqual({ ok: false, error: 'entryTooShort' });
  expect(naturalBalance('asset', 500, 200)).toBe(300);
  expect(naturalBalance('revenue', 0, 700)).toBe(700);
  // A booking whose cost moved from one supplier to another posts both changes.
  expect(differences({ s1: 300, s2: 100 }, { s1: 300, s3: 250 })).toEqual({ s2: -100, s3: 250 });
  expect(reversed([line('a', 100, 0), line('b', 0, 100)])).toEqual([line('a', 0, 100), line('b', 100, 0)]);
});
