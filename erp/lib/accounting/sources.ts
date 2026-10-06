import type { JournalEntry } from '../types';

/** Where an entry came from, as a link to the record (if it has a page). */
export function sourceHref(e: Pick<JournalEntry, 'source' | '_id'>): string | undefined {
  const id = e.source.id ? String(e.source.id) : undefined;
  switch (e.source.type) {
    case 'booking':
      return id && `/bookings/${id}`;
    case 'payment':
    case 'paymentVoid':
      return id && `/print/receipt/${id}`;
    case 'expense':
    case 'expenseVoid':
      return '/accounting/expenses';
    case 'reversal':
      return id && `/accounting/journal/${id}`;
    default:
      return undefined;
  }
}
