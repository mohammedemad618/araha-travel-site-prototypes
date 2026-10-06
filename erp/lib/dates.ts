import type { ISODate } from './types';

// Business dates follow Baghdad time so "today" matches the office calendar.
export function todayISO(): ISODate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad' }).format(new Date());
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function formatDate(iso: ISODate | Date | undefined, lang: 'ar' | 'en' = 'ar'): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(`${iso}T00:00:00Z`) : iso;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: typeof iso === 'string' ? 'UTC' : 'Asia/Baghdad',
  }).format(d);
}

export function formatDateTime(d: Date | undefined, lang: 'ar' | 'en' = 'ar'): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Baghdad',
  }).format(d);
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}
