import type { AccountType } from '../types';

// Pure double-entry rules, kept free of the database so they can be unit-tested.

/** Assets and expenses grow with debits; liabilities, equity and revenue with credits. */
export function debitNormal(type: AccountType): boolean {
  return type === 'asset' || type === 'expense';
}

/** The balance in the account's natural direction (positive = normal). */
export function naturalBalance(type: AccountType, debit: number, credit: number): number {
  return debitNormal(type) ? debit - credit : credit - debit;
}

export type DraftLine = { accountId: string; debit: number; credit: number };

/**
 * Checks a set of lines can be posted: at least two lines, each with one
 * positive side, and debits equal to credits.
 */
export function checkBalanced(
  lines: DraftLine[],
): { ok: true; total: number } | { ok: false; error: string } {
  if (lines.length < 2) return { ok: false, error: 'entryTooShort' };
  for (const l of lines) {
    if (!Number.isInteger(l.debit) || !Number.isInteger(l.credit) || l.debit < 0 || l.credit < 0)
      return { ok: false, error: 'invalidAmount' };
    if (l.debit > 0 === l.credit > 0) return { ok: false, error: 'oneSidePerLine' };
  }
  const debit = lines.reduce((s, l) => s + l.debit, 0);
  const credit = lines.reduce((s, l) => s + l.credit, 0);
  if (debit !== credit) return { ok: false, error: 'unbalanced' };
  return { ok: true, total: debit };
}

/**
 * The change to post when a figure the ledger already holds is now different,
 * per key (e.g. cost per supplier). Zero changes are left out.
 */
export function differences(
  posted: Record<string, number>,
  wanted: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of new Set([...Object.keys(posted), ...Object.keys(wanted)])) {
    const d = (wanted[k] ?? 0) - (posted[k] ?? 0);
    if (d !== 0) out[k] = d;
  }
  return out;
}

/** Swaps debits and credits: the entry that cancels another. */
export function reversed<T extends { debit: number; credit: number }>(lines: T[]): T[] {
  return lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit }));
}
