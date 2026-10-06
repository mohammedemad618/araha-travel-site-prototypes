import { formatMoney } from './money';
import type { Currency } from './types';

/** "1,250,000 د.ع + $300" for amounts kept per currency. */
export function formatMulti(values: Partial<Record<Currency, number>>, lang: 'ar' | 'en'): string {
  const parts = (['IQD', 'USD'] as const)
    .filter((c) => values[c])
    .map((c) => formatMoney(values[c]!, c, lang));
  return parts.length ? parts.join(' + ') : '0';
}
