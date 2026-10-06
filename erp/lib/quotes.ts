import type { Quote } from './types';

/** A sent quote past its validity date shows as expired (it can still be renewed by editing it). */
export function quoteState(
  q: Pick<Quote, 'status' | 'validUntil'>,
  today: string,
): Quote['status'] | 'expired' {
  if ((q.status === 'sent' || q.status === 'draft') && q.validUntil && q.validUntil < today) return 'expired';
  return q.status;
}
