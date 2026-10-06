import 'server-only';
import { ObjectId, type Db } from 'mongodb';
import { getDb } from '../db';
import { nextNumber } from '../counters';
import { convert } from '../money';
import { todayISO } from '../dates';
import { isActive } from '../services';
import { DEFAULT_ACCOUNTS, METHOD_ACCOUNT } from './chart';
import { checkBalanced, differences, reversed } from './math';
import type {
  Account,
  AccountKey,
  Booking,
  Expense,
  JournalEntry,
  JournalLine,
  Payment,
  SupplierPayment,
  Tenant,
} from '../types';

// The ledger: every money movement becomes a balanced journal entry in the
// company currency. Entries are never edited or deleted; changes are posted as
// differences or reversals, so the history always adds up.

const readyTenants = new Set<string>();

type Ctx = { db: Db; tenant: Tenant; accounts: Map<AccountKey, Account> };

async function loadCtx(tenantId: ObjectId): Promise<Ctx | null> {
  const db = await getDb();
  const tenant = await db.collection<Tenant>('tenants').findOne({ _id: tenantId });
  if (!tenant) return null;
  const list = await db
    .collection<Account>('accounts')
    .find({ tenantId, key: { $exists: true } })
    .toArray();
  return { db, tenant, accounts: new Map(list.map((a) => [a.key!, a])) };
}

/** Creates the default accounts a company is missing (safe to run repeatedly). */
export async function ensureChart(tenantId: ObjectId): Promise<void> {
  const db = await getDb();
  for (const a of DEFAULT_ACCOUNTS) {
    try {
      await db
        .collection('accounts')
        .updateOne(
          { tenantId, code: a.code },
          { $setOnInsert: { ...a, tenantId, active: true, createdAt: new Date() } },
          { upsert: true },
        );
    } catch {
      // Created at the same moment by another request.
    }
  }
}

const toBase = (c: Ctx, amount: number, currency: Booking['currency']) =>
  convert(amount, currency, c.tenant.settings.currency, c.tenant.settings.usdRate);

function account(c: Ctx, key: AccountKey): ObjectId {
  const a = c.accounts.get(key);
  if (!a) throw new Error(`ledger: missing system account "${key}"`);
  return a._id;
}

type Draft = Omit<JournalEntry, '_id' | 'tenantId' | 'number' | 'total' | 'createdAt'>;

/** Posts a balanced entry. Entries with a uniqueKey are posted at most once. */
async function post(c: Ctx, entry: Draft): Promise<JournalEntry | null> {
  const col = c.db.collection<JournalEntry>('journalEntries');
  if (entry.uniqueKey) {
    const existing = await col.findOne({ tenantId: c.tenant._id, uniqueKey: entry.uniqueKey });
    if (existing) return existing;
  }
  const lines = entry.lines.filter((l) => l.debit > 0 || l.credit > 0);
  if (!lines.length) return null;
  const check = checkBalanced(lines.map((l) => ({ ...l, accountId: String(l.accountId) })));
  if (!check.ok) throw new Error(`ledger: ${check.error} (${entry.memo})`);
  const doc = {
    ...entry,
    lines,
    tenantId: c.tenant._id,
    number: await nextNumber(c.tenant._id, 'JE', 'journal'),
    total: check.total,
    createdAt: new Date(),
  };
  try {
    const res = await col.insertOne(doc as JournalEntry);
    return { ...doc, _id: res.insertedId } as JournalEntry;
  } catch (err) {
    // Another request posted the same record first.
    if ((err as { code?: number }).code === 11000 && entry.uniqueKey)
      return col.findOne({ tenantId: c.tenant._id, uniqueKey: entry.uniqueKey });
    throw err;
  }
}

/** A debit line and a credit line for the same amount. */
function pair(
  debit: ObjectId,
  credit: ObjectId,
  amount: number,
  party?: JournalLine['party'],
): JournalLine[] {
  if (amount <= 0) return [];
  return [
    { accountId: debit, debit: amount, credit: 0, party },
    { accountId: credit, debit: 0, credit: amount, party },
  ];
}

/**
 * Brings the ledger in line with a booking: revenue once it is confirmed or
 * completed, and its supplier costs. Only the difference from what was already
 * posted is recorded, so any edit (price, cost, cancellation) is reflected once.
 */
async function syncBookingRaw(c: Ctx, bookingId: ObjectId, date?: string): Promise<void> {
  const col = c.db.collection<Booking>('bookings');
  for (let attempt = 0; attempt < 4; attempt++) {
    const b = await col.findOne({ _id: bookingId, tenantId: c.tenant._id });
    if (!b) return;
    const recognised = b.status === 'confirmed' || b.status === 'completed';
    const wantRevenue = recognised ? b.total : 0;
    const wantCosts: Record<string, number> = {};
    if (recognised)
      for (const l of b.services ?? []) {
        if (!isActive(l) || !l.costInBooking) continue;
        const k = l.supplierId ? String(l.supplierId) : 'none';
        wantCosts[k] = (wantCosts[k] ?? 0) + l.costInBooking;
      }
    const posted = b.ledger ?? { version: 0, revenue: 0, costs: {} };
    const dRevenue = wantRevenue - posted.revenue;
    const dCosts = differences(posted.costs, wantCosts);
    if (dRevenue === 0 && Object.keys(dCosts).length === 0) return;

    // Claim this version first: a concurrent change retries instead of posting twice.
    const claim = await col.updateOne(
      {
        _id: b._id,
        tenantId: c.tenant._id,
        ...(b.ledger ? { 'ledger.version': posted.version } : { ledger: { $exists: false } }),
      },
      { $set: { ledger: { version: posted.version + 1, revenue: wantRevenue, costs: wantCosts } } },
    );
    if (!claim.modifiedCount) continue;

    const customer = { type: 'customer' as const, id: b.customerId };
    const lines: JournalLine[] = [];
    const rev = toBase(c, Math.abs(dRevenue), b.currency);
    if (dRevenue > 0) lines.push(...pair(account(c, 'receivable'), account(c, 'sales'), rev, customer));
    if (dRevenue < 0) lines.push(...pair(account(c, 'sales'), account(c, 'receivable'), rev, customer));
    for (const [k, d] of Object.entries(dCosts)) {
      const supplier = k === 'none' ? undefined : { type: 'supplier' as const, id: new ObjectId(k) };
      const amount = toBase(c, Math.abs(d), b.currency);
      if (d > 0) lines.push(...pair(account(c, 'cogs'), account(c, 'payable'), amount, supplier));
      else lines.push(...pair(account(c, 'payable'), account(c, 'cogs'), amount, supplier));
    }
    await post(c, {
      date: date ?? todayISO(),
      memo: `${b.number} — ${b.title}`,
      source: { type: 'booking', id: b._id, ref: b.number },
      branchId: b.branchId,
      lines,
    });
    return;
  }
}

async function postPaymentRaw(c: Ctx, p: Payment): Promise<void> {
  const amount = toBase(c, p.amount, p.currency);
  const money = account(c, METHOD_ACCOUNT[p.method] ?? 'cash');
  const customer = { type: 'customer' as const, id: p.customerId };
  await post(c, {
    date: p.date,
    memo: `${p.number}${p.reference ? ` · ${p.reference}` : ''}`,
    source: { type: 'payment', id: p._id, ref: p.number },
    uniqueKey: `payment:${p._id}`,
    branchId: p.branchId,
    lines:
      p.kind === 'refund'
        ? pair(account(c, 'receivable'), money, amount, customer)
        : pair(money, account(c, 'receivable'), amount, customer),
  });
}

/** Cancels the entry of a record (payment, supplier payment, expense) once. */
async function reverseOnce(
  c: Ctx,
  originalKey: string,
  voidKey: string,
  type: 'paymentVoid' | 'supplierPaymentVoid' | 'expenseVoid',
  id: ObjectId,
): Promise<void> {
  const original = await c.db
    .collection<JournalEntry>('journalEntries')
    .findOne({ tenantId: c.tenant._id, uniqueKey: originalKey });
  if (!original) return;
  await post(c, {
    date: todayISO(),
    memo: original.memo,
    source: { type, id, ref: original.source.ref },
    uniqueKey: voidKey,
    branchId: original.branchId,
    lines: reversed(original.lines),
    reverses: original._id,
  });
}

async function postSupplierPaymentRaw(c: Ctx, sp: SupplierPayment): Promise<void> {
  const amount = toBase(c, sp.amount, sp.currency);
  await post(c, {
    date: sp.date,
    memo: sp.reference || sp.notes || '',
    source: { type: 'supplierPayment', id: sp._id },
    uniqueKey: `supplierPayment:${sp._id}`,
    lines: pair(account(c, 'payable'), account(c, METHOD_ACCOUNT[sp.method] ?? 'cash'), amount, {
      type: 'supplier',
      id: sp.supplierId,
    }),
  });
}

async function postExpenseRaw(c: Ctx, e: Expense): Promise<void> {
  await post(c, {
    date: e.date,
    memo: [e.number, e.payee, e.memo].filter(Boolean).join(' · '),
    source: { type: 'expense', id: e._id, ref: e.number },
    uniqueKey: `expense:${e._id}`,
    branchId: e.branchId,
    lines: pair(e.accountId, e.paidFrom, e.amountBase),
  });
}

/** Posts every past record (idempotent: posted records are skipped). */
async function backfill(c: Ctx): Promise<void> {
  const tenantId = c.tenant._id;
  for await (const b of c.db
    .collection<Booking>('bookings')
    .find(
      { tenantId, status: { $in: ['confirmed', 'completed', 'cancelled'] } },
      { projection: { createdAt: 1 } },
    ))
    await syncBookingRaw(c, b._id, b.createdAt.toISOString().slice(0, 10));
  for await (const p of c.db.collection<Payment>('payments').find({ tenantId }).sort({ createdAt: 1 })) {
    await postPaymentRaw(c, p);
    if (p.voided) await reverseOnce(c, `payment:${p._id}`, `paymentVoid:${p._id}`, 'paymentVoid', p._id);
  }
  for await (const sp of c.db
    .collection<SupplierPayment>('supplierPayments')
    .find({ tenantId })
    .sort({ createdAt: 1 }))
    await postSupplierPaymentRaw(c, sp);
  for await (const e of c.db.collection<Expense>('expenses').find({ tenantId }).sort({ createdAt: 1 })) {
    await postExpenseRaw(c, e);
    if (e.voided) await reverseOnce(c, `expense:${e._id}`, `expenseVoid:${e._id}`, 'expenseVoid', e._id);
  }
}

/**
 * Makes sure a company's ledger exists: its chart of accounts and every record
 * from before accounting was switched on. Runs once per company.
 */
export async function ensureLedger(tenantId: ObjectId): Promise<void> {
  const id = String(tenantId);
  if (readyTenants.has(id)) return;
  const db = await getDb();
  const tenants = db.collection<Tenant>('tenants');
  const t = await tenants.findOne({ _id: tenantId }, { projection: { accounting: 1 } });
  if (t?.accounting?.readyAt) {
    readyTenants.add(id);
    return;
  }
  const lock = await tenants.findOneAndUpdate(
    {
      _id: tenantId,
      'accounting.readyAt': { $exists: false },
      $or: [
        { 'accounting.lockedAt': { $exists: false } },
        { 'accounting.lockedAt': { $lt: new Date(Date.now() - 5 * 60_000) } },
      ],
    },
    { $set: { 'accounting.lockedAt': new Date() } },
  );
  if (!lock) {
    // Another server is setting it up: wait for it.
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const again = await tenants.findOne({ _id: tenantId }, { projection: { accounting: 1 } });
      if (again?.accounting?.readyAt) break;
    }
    readyTenants.add(id);
    return;
  }
  await ensureChart(tenantId);
  const c = await loadCtx(tenantId);
  if (c) await backfill(c);
  await tenants.updateOne(
    { _id: tenantId },
    { $set: { 'accounting.readyAt': new Date() }, $unset: { 'accounting.lockedAt': '' } },
  );
  readyTenants.add(id);
}

/** Runs a posting after making sure the ledger is set up. Never breaks the business action. */
async function withLedger(tenantId: ObjectId, fn: (c: Ctx) => Promise<void>): Promise<void> {
  try {
    await ensureLedger(tenantId);
    const c = await loadCtx(tenantId);
    if (c) await fn(c);
  } catch (err) {
    // The record itself is saved; "resync" in accounting posts anything missed.
    console.error('ledger posting failed', err);
  }
}

export const ledger = {
  syncBooking: (tenantId: ObjectId, bookingId: ObjectId) =>
    withLedger(tenantId, (c) => syncBookingRaw(c, bookingId)),
  payment: (tenantId: ObjectId, p: Payment) => withLedger(tenantId, (c) => postPaymentRaw(c, p)),
  voidPayment: (tenantId: ObjectId, p: Pick<Payment, '_id'>) =>
    withLedger(tenantId, (c) =>
      reverseOnce(c, `payment:${p._id}`, `paymentVoid:${p._id}`, 'paymentVoid', p._id),
    ),
  supplierPayment: (tenantId: ObjectId, sp: SupplierPayment) =>
    withLedger(tenantId, (c) => postSupplierPaymentRaw(c, sp)),
  removeSupplierPayment: (tenantId: ObjectId, sp: Pick<SupplierPayment, '_id'>) =>
    withLedger(tenantId, (c) =>
      reverseOnce(
        c,
        `supplierPayment:${sp._id}`,
        `supplierPaymentVoid:${sp._id}`,
        'supplierPaymentVoid',
        sp._id,
      ),
    ),
  expense: (tenantId: ObjectId, e: Expense) => withLedger(tenantId, (c) => postExpenseRaw(c, e)),
  voidExpense: (tenantId: ObjectId, e: Pick<Expense, '_id'>) =>
    withLedger(tenantId, (c) =>
      reverseOnce(c, `expense:${e._id}`, `expenseVoid:${e._id}`, 'expenseVoid', e._id),
    ),
  /** Re-checks every record and posts anything missing (safe at any time). */
  resync: async (tenantId: ObjectId) => {
    await ensureLedger(tenantId);
    const c = await loadCtx(tenantId);
    if (c) await backfill(c);
  },
};

/** Posts a manual entry (opening balances, transfers, adjustments). */
export async function postManual(
  tenantId: ObjectId,
  entry: { date: string; memo: string; lines: JournalLine[]; branchId?: ObjectId; createdBy: ObjectId },
): Promise<JournalEntry | null> {
  await ensureLedger(tenantId);
  const c = await loadCtx(tenantId);
  if (!c) return null;
  return post(c, { ...entry, source: { type: 'manual' } });
}

/** Cancels a manual entry with an opposite entry dated today. */
export async function reverseManual(
  tenantId: ObjectId,
  entryId: ObjectId,
  userId: ObjectId,
): Promise<JournalEntry | null> {
  const c = await loadCtx(tenantId);
  if (!c) return null;
  const col = c.db.collection<JournalEntry>('journalEntries');
  const original = await col.findOne({
    _id: entryId,
    tenantId,
    'source.type': 'manual',
    reversedBy: { $exists: false },
  });
  if (!original) return null;
  const rev = await post(c, {
    date: todayISO(),
    memo: original.memo,
    source: { type: 'reversal', id: original._id, ref: original.number },
    branchId: original.branchId,
    lines: reversed(original.lines),
    reverses: original._id,
    createdBy: userId,
  });
  if (rev) await col.updateOne({ _id: original._id }, { $set: { reversedBy: rev._id } });
  return rev;
}
