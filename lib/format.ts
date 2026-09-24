import type { Locale } from '@/i18n/routing';

const numberFormat = new Intl.NumberFormat('en-US');

/** Prices are shown with Latin digits in both languages, e.g. 995,000. */
export function formatPrice(value: number): string {
  return numberFormat.format(value);
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Normalises Arabic-Indic digits and strips separators from a phone number. */
export function normalizePhone(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\-().]/g, '');
}

/** Accepts Iraqi mobiles (07XXXXXXXXX / +9647XXXXXXXXX) or any international number. */
export function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw);
  return /^(?:\+?964|0)7\d{9}$/.test(p) || /^(?:\+|00)[1-9]\d{7,14}$/.test(p);
}
