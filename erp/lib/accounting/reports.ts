import 'server-only';
import type { Document, ObjectId } from 'mongodb';
import { getDb } from '../db';
import { naturalBalance } from './math';
import type { Account, AccountType, JournalEntry } from '../types';

export type AccountRow = { account: Account; debit: number; credit: number; balance: number };

type Range = { from?: string; to?: string; branchId?: ObjectId | null };

function match(tenantId: ObjectId, r: Range): Document {
  const m: Document = { tenantId };
  if (r.from || r.to) m.date = { ...(r.from ? { $gte: r.from } : {}), ...(r.to ? { $lte: r.to } : {}) };
  if (r.branchId) m.branchId = r.branchId;
  return m;
}

/** Debit and credit totals per account for a period (or up to a date). */
export async function totalsByAccount(
  tenantId: ObjectId,
  r: Range,
): Promise<Map<string, { debit: number; credit: number }>> {
  const db = await getDb();
  const rows = await db
    .collection('journalEntries')
    .aggregate<{ _id: ObjectId; debit: number; credit: number }>([
      { $match: match(tenantId, r) },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.accountId',
          debit: { $sum: '$lines.debit' },
          credit: { $sum: '$lines.credit' },
        },
      },
    ])
    .toArray();
  return new Map(rows.map((x) => [String(x._id), { debit: x.debit, credit: x.credit }]));
}

export async function chartAccounts(tenantId: ObjectId): Promise<Account[]> {
  const db = await getDb();
  return db.collection<Account>('accounts').find({ tenantId }).sort({ code: 1 }).toArray();
}

function rows(accounts: Account[], totals: Map<string, { debit: number; credit: number }>): AccountRow[] {
  return accounts.map((account) => {
    const t = totals.get(String(account._id)) ?? { debit: 0, credit: 0 };
    return { account, ...t, balance: naturalBalance(account.type, t.debit, t.credit) };
  });
}

/** Every account with its totals up to a date. Debits always equal credits. */
export async function trialBalance(tenantId: ObjectId, to: string) {
  const [accounts, totals] = await Promise.all([chartAccounts(tenantId), totalsByAccount(tenantId, { to })]);
  const list = rows(accounts, totals).filter((r) => r.debit || r.credit);
  const debit = list.reduce((s, r) => s + r.debit, 0);
  const credit = list.reduce((s, r) => s + r.credit, 0);
  return { rows: list, debit, credit };
}

const ofType = (list: AccountRow[], type: AccountType) => list.filter((r) => r.account.type === type);
const sum = (list: AccountRow[]) => list.reduce((s, r) => s + r.balance, 0);

/** Revenue minus cost of sales and expenses for a period, optionally for one branch. */
export async function profitAndLoss(
  tenantId: ObjectId,
  from: string,
  to: string,
  branchId?: ObjectId | null,
) {
  const [accounts, totals] = await Promise.all([
    chartAccounts(tenantId),
    totalsByAccount(tenantId, { from, to, branchId }),
  ]);
  const list = rows(accounts, totals).filter((r) => r.debit || r.credit);
  const revenue = ofType(list, 'revenue');
  const cogs = ofType(list, 'expense').filter((r) => r.account.key === 'cogs');
  const expenses = ofType(list, 'expense').filter((r) => r.account.key !== 'cogs');
  const totalRevenue = sum(revenue);
  const totalCogs = sum(cogs);
  const totalExpenses = sum(expenses);
  return {
    revenue,
    cogs,
    expenses,
    totalRevenue,
    totalCogs,
    grossProfit: totalRevenue - totalCogs,
    totalExpenses,
    netProfit: totalRevenue - totalCogs - totalExpenses,
  };
}

/**
 * Assets = liabilities + equity at a date. Profit not yet closed into equity is
 * shown as its own equity line, so the two sides always agree.
 */
export async function balanceSheet(tenantId: ObjectId, to: string) {
  const [accounts, totals] = await Promise.all([chartAccounts(tenantId), totalsByAccount(tenantId, { to })]);
  const list = rows(accounts, totals).filter((r) => r.debit || r.credit);
  const assets = ofType(list, 'asset');
  const liabilities = ofType(list, 'liability');
  const equity = ofType(list, 'equity');
  const earnings = sum(ofType(list, 'revenue')) - sum(ofType(list, 'expense'));
  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);
  const totalEquity = sum(equity) + earnings;
  return { assets, liabilities, equity, earnings, totalAssets, totalLiabilities, totalEquity };
}

/** An account's movements in a period with the running balance. */
export async function accountStatement(tenantId: ObjectId, account: Account, from: string, to: string) {
  const db = await getDb();
  const before = await totalsByAccount(tenantId, { to: prevDay(from) });
  const open = before.get(String(account._id)) ?? { debit: 0, credit: 0 };
  const opening = naturalBalance(account.type, open.debit, open.credit);
  const entries = await db
    .collection<JournalEntry>('journalEntries')
    .find({ tenantId, 'lines.accountId': account._id, date: { $gte: from, $lte: to } })
    .sort({ date: 1, createdAt: 1 })
    .limit(2000)
    .toArray();
  let balance = opening;
  const lines = entries.flatMap((e) =>
    e.lines
      .filter((l) => String(l.accountId) === String(account._id))
      .map((l) => {
        balance += naturalBalance(account.type, l.debit, l.credit);
        return { entry: e, line: l, balance };
      }),
  );
  return { opening, lines, closing: balance };
}

function prevDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
