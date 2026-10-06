import type { Currency } from './types';

// Amounts are stored as integers in the smallest unit we use: whole dinars for
// IQD and cents for USD. Floating point never touches stored money.
const DECIMALS: Record<Currency, number> = { IQD: 0, USD: 2 };

export function toMinor(value: number, currency: Currency): number {
  return Math.round(value * 10 ** DECIMALS[currency]);
}

export function fromMinor(minor: number, currency: Currency): number {
  return minor / 10 ** DECIMALS[currency];
}

/** Parses user input such as "1,250,000" or "350.5" into minor units. */
export function parseMoney(input: unknown, currency: Currency): number | null {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  const clean = String(input)
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[,\s،]/g, '')
    .trim();
  if (!clean || !/^-?\d+(\.\d+)?$/.test(clean)) return null;
  return toMinor(Number(clean), currency);
}

/**
 * Converts an amount between currencies. `usdRate` is dinars per dollar.
 * Rounded to the target currency's smallest unit.
 */
export function convert(minor: number, from: Currency, to: Currency, usdRate: number): number {
  if (from === to) return minor;
  const value = fromMinor(minor, from);
  const converted = from === 'USD' ? value * usdRate : value / usdRate;
  return toMinor(converted, to);
}

export function formatMoney(minor: number, currency: Currency, lang: 'ar' | 'en' = 'ar'): string {
  const value = fromMinor(minor, currency);
  const num = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: DECIMALS[currency],
    maximumFractionDigits: DECIMALS[currency],
  }).format(value);
  if (currency === 'USD') return `$${num}`;
  return lang === 'ar' ? `${num} د.ع` : `IQD ${num}`;
}

/** Display value for an input field (no symbol, no grouping). */
export function moneyInput(minor: number | undefined, currency: Currency): string {
  if (minor === undefined || minor === null) return '';
  return String(fromMinor(minor, currency));
}
