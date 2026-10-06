'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { actionTenant, pickBranch, toObjectId } from '../session';
import { repo } from '../repo';
import { audit } from '../audit';
import { fieldErrors, optText, reqDate, text, type ActionResult } from '../forms';
import { convert, parseMoney } from '../money';
import { nextNumber } from '../counters';
import { checkBalanced } from '../accounting/math';
import { ensureLedger, ledger, postManual, reverseManual } from '../accounting/ledger';
import { accountTypes, type JournalLine } from '../types';

const accountSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{3,6}$/, 'invalidCode'),
  name: text(120),
  type: z.enum(accountTypes),
  isCash: z.string().optional(),
});

export async function saveAccount(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('accounting.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  await ensureLedger(ctx.tenantId);
  const parsed = accountSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const r = await repo(ctx);
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (await r.accounts.exists({ code: d.code, ...(id ? { _id: { $ne: id } } : {}) }))
    return { ok: false, error: 'duplicateCode', fields: { code: 'duplicateCode' } };
  const isCash = d.type === 'asset' && (d.isCash === 'on' || d.isCash === '1');
  if (id) {
    const existing = await r.accounts.findOne({ _id: id });
    if (!existing) return { ok: false, error: 'notFound' };
    // System accounts keep their type; posted history depends on it.
    const used = await r.journalEntries.exists({ 'lines.accountId': id });
    if ((existing.key || used) && existing.type !== d.type)
      return { ok: false, error: 'accountTypeLocked', fields: { type: 'accountTypeLocked' } };
    await r.accounts.updateOne({ _id: id }, { $set: { code: d.code, name: d.name, type: d.type, isCash } });
  } else {
    await r.accounts.insertOne({
      code: d.code,
      name: d.name,
      type: d.type,
      isCash,
      active: true,
      createdAt: new Date(),
    });
  }
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: id ? 'account.update' : 'account.create',
    summary: `${d.code} ${d.name}`,
  });
  revalidatePath('/accounting/accounts');
  return { ok: true };
}

export async function toggleAccount(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('accounting.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  const r = await repo(ctx);
  const a = id ? await r.accounts.findOne({ _id: id }) : null;
  if (!a) return { ok: false, error: 'notFound' };
  if (a.key) return { ok: false, error: 'systemAccount' };
  await r.accounts.updateOne({ _id: a._id }, { $set: { active: !a.active } });
  revalidatePath('/accounting/accounts');
  return { ok: true };
}

/** A manual journal entry: opening balances, owner capital, transfers, adjustments. */
export async function createManualEntry(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('accounting.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const head = z.object({ date: reqDate, memo: text(300) }).safeParse(Object.fromEntries(fd));
  if (!head.success) return { ok: false, error: 'required', fields: fieldErrors(head.error) };
  const cur = ctx.tenant.settings.currency;
  const ids = fd.getAll('accountId').map(String);
  const debits = fd.getAll('debit').map(String);
  const credits = fd.getAll('credit').map(String);
  const memos = fd.getAll('lineMemo').map(String);
  const r = await repo(ctx);
  const accounts = await r.accounts.find({ active: true }).toArray();
  const lines: JournalLine[] = [];
  for (let i = 0; i < ids.length; i++) {
    const debit = debits[i]?.trim() ? parseMoney(debits[i], cur) : 0;
    const credit = credits[i]?.trim() ? parseMoney(credits[i], cur) : 0;
    if (!ids[i] && !debit && !credit) continue; // empty row
    const account = accounts.find((a) => String(a._id) === ids[i]);
    if (!account) return { ok: false, error: 'pickAccount' };
    if (debit === null || credit === null) return { ok: false, error: 'invalidAmount' };
    lines.push({ accountId: account._id, debit, credit, memo: memos[i]?.trim().slice(0, 200) || undefined });
  }
  const check = checkBalanced(lines.map((l) => ({ ...l, accountId: String(l.accountId) })));
  if (!check.ok) return { ok: false, error: check.error };
  const branchId = pickBranch(ctx, fd.get('branchId')) ?? undefined;
  const entry = await postManual(ctx.tenantId, {
    date: head.data.date,
    memo: head.data.memo,
    lines,
    branchId,
    createdBy: ctx.user._id,
  });
  if (!entry) return { ok: false, error: 'generic' };
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'journal.manual',
    summary: `${entry.number} ${head.data.memo}`,
  });
  revalidatePath('/accounting');
  redirect(`/accounting/journal/${entry._id}`);
}

export async function reverseEntry(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('accounting.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const rev = await reverseManual(ctx.tenantId, id, ctx.user._id);
  if (!rev) return { ok: false, error: 'notReversible' };
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'journal.reverse',
    summary: rev.number,
  });
  revalidatePath(`/accounting/journal/${id}`);
  redirect(`/accounting/journal/${rev._id}`);
}

const expenseSchema = z.object({
  date: reqDate,
  accountId: z.string(),
  paidFrom: z.string(),
  amount: z.string(),
  currency: z.enum(['IQD', 'USD']),
  payee: optText(120),
  memo: optText(500),
  branchId: z.string().optional(),
});

/** An operating expense paid from cash, bank or a wallet. */
export async function recordExpense(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('accounting.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  await ensureLedger(ctx.tenantId);
  const parsed = expenseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const amount = parseMoney(d.amount, d.currency);
  if (amount === null || amount <= 0)
    return { ok: false, error: 'invalidAmount', fields: { amount: 'invalidAmount' } };
  const r = await repo(ctx);
  const accountId = toObjectId(d.accountId);
  const paidFromId = toObjectId(d.paidFrom);
  if (!accountId) return { ok: false, error: 'required', fields: { accountId: 'required' } };
  if (!paidFromId) return { ok: false, error: 'required', fields: { paidFrom: 'required' } };
  const [account, paidFrom] = await Promise.all([
    r.accounts.findOne({ _id: accountId, type: 'expense', active: true }),
    r.accounts.findOne({ _id: paidFromId, isCash: true, active: true }),
  ]);
  if (!account) return { ok: false, error: 'required', fields: { accountId: 'required' } };
  if (!paidFrom) return { ok: false, error: 'required', fields: { paidFrom: 'required' } };
  const branchId = pickBranch(ctx, d.branchId);
  if (!branchId) return { ok: false, error: 'required', fields: { branchId: 'branchNotAllowed' } };
  const number = await nextNumber(ctx.tenantId, 'EX', 'expense');
  const doc = {
    branchId,
    number,
    date: d.date,
    accountId: account._id,
    paidFrom: paidFrom._id,
    amount,
    currency: d.currency,
    amountBase: convert(amount, d.currency, ctx.tenant.settings.currency, ctx.tenant.settings.usdRate),
    payee: d.payee,
    memo: d.memo,
    voided: false,
    createdBy: ctx.user._id,
    createdAt: new Date(),
  };
  const id = await r.expenses.insertOne(doc);
  await ledger.expense(ctx.tenantId, { ...doc, _id: id, tenantId: ctx.tenantId });
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'expense.create', summary: number });
  revalidatePath('/accounting/expenses');
  return { ok: true };
}

export async function voidExpense(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('accounting.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  const e = await r.expenses.findOneAndUpdate({ _id: id, voided: false }, { $set: { voided: true } });
  if (!e) return { ok: false, error: 'notFound' };
  await ledger.voidExpense(ctx.tenantId, e);
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'expense.void', summary: e.number });
  revalidatePath('/accounting/expenses');
  return { ok: true };
}

/** Checks every booking, payment and expense and posts anything missing. */
export async function resyncLedger(): Promise<ActionResult> {
  const auth = await actionTenant('accounting.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  await ledger.resync(ctx.tenantId);
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'journal.resync', summary: 'resync' });
  revalidatePath('/accounting');
  return { ok: true, message: 'accounting.resynced' };
}
