import { z } from 'zod';
import type { SiteContentKind } from './types';

// Website content edited in the back office. These schemas mirror the website's
// own (lib/schema.ts in the site): whatever is saved here must build there.
// Prices, durations and departure dates are not part of it: they come from the
// package and its dates in inventory.

export const travelStyles = ['adventure', 'discovery', 'family', 'romance', 'unwind', 'luxury'] as const;
export const visaStatuses = ['visa-free', 'on-arrival', 'e-visa', 'visa-required'] as const;
export const homeLayouts = ['big', 'mid', 'wide'] as const;

/** An image from the media library is stored as "media:<id>". */
export const MEDIA_PREFIX = 'media:';
const MEDIA_SRC = /^media:[a-f0-9]{24}$/;
// Images the website accepts as they are: its own uploads and Unsplash photos.
const SITE_SRC = /^(\/uploads\/[^?#\s]+|https:\/\/images\.unsplash\.com\/photo-[\w-]+(\?[^\s]*)?)$/;

export const mediaId = (src: string): string | null =>
  MEDIA_SRC.test(src) ? src.slice(MEDIA_PREFIX.length) : null;

const req = z.string().trim().min(1, 'required').max(4000, 'tooLong');
const opt = z.string().trim().max(4000, 'tooLong').default('');

export const localized = z.object({ ar: req, en: req });
/** Optional bilingual text: either language may be blank. */
export const optionalLocalized = z.object({ ar: opt, en: opt }).default({ ar: '', en: '' });

const httpsUrl = z
  .string()
  .trim()
  .regex(/^https:\/\/[^\s]+$/, 'invalidUrl');
const optionalUrl = z.union([z.literal(''), httpsUrl]).default('');
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalidDate')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'invalidDate');

export const image = z.object({
  src: z
    .string()
    .trim()
    .refine((s) => MEDIA_SRC.test(s) || SITE_SRC.test(s), 'imageSrc'),
  alt: localized,
  credit: z.string().trim().max(120, 'tooLong').default(''),
  creditUrl: optionalUrl,
});

const seo = z.object({ title: optionalLocalized, description: optionalLocalized }).default({});

export const packageContent = z.object({
  title: localized,
  destination: z.string().regex(/^[a-z0-9-]+$/, 'required'),
  styles: z.array(z.enum(travelStyles)).min(1, 'pickOne'),
  priceNote: localized,
  priceValidUntil: z.union([z.literal(''), isoDate]).default(''),
  highlights: z.array(localized).min(1, 'addOne'),
  lead: localized,
  overview: localized,
  facts: z.object({
    route: localized,
    stay: localized,
    flights: localized,
    season: localized,
    group: localized,
  }),
  image,
  gallery: z.array(image).max(40).default([]),
  itinerary: z
    .array(z.object({ title: localized, description: localized, tags: z.array(localized).default([]) }))
    .min(1, 'addOne'),
  includes: z.array(localized).min(1, 'addOne'),
  excludes: z.array(localized).default([]),
  badge: optionalLocalized,
  order: z.coerce.number().int().default(100),
  seo,
  /** Hidden pages are left off the website. */
  hidden: z.boolean().default(false),
});

export const visaContent = z.object({
  status: z.enum(visaStatuses),
  summary: localized,
  howToApply: localized,
  processingTime: optionalLocalized,
  stay: optionalLocalized,
  exemptions: z.array(localized).default([]),
  documents: z.array(localized).default([]),
  notes: optionalLocalized,
  officialUrl: optionalUrl,
  sources: z.array(httpsUrl).default([]),
  lastVerified: isoDate,
});

export const destinationContent = z.object({
  name: localized,
  label: z.string().trim().min(1, 'required').max(40, 'tooLong'),
  coord: z.string().trim().min(1, 'required').max(40, 'tooLong'),
  tagline: localized,
  description: localized,
  bestSeason: localized,
  glance: z
    .object({
      flightTime: optionalLocalized,
      currency: optionalLocalized,
      language: optionalLocalized,
      timeDifference: optionalLocalized,
    })
    .default({}),
  image,
  homeLayout: z.enum(homeLayouts).default('mid'),
  order: z.coerce.number().int().default(100),
  seo,
});

export const contentSchemas = {
  package: packageContent,
  visa: visaContent,
  destination: destinationContent,
} satisfies Record<SiteContentKind, z.ZodTypeAny>;

export const contentKey = z.string().regex(/^[a-z0-9][a-z0-9-]{0,80}$/, 'invalidKey');

/** Every image source in a content document (for media usage checks and publishing). */
export function imageSources(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const v of value) imageSources(v, out);
  else if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.src === 'string' && o.alt && typeof o.alt === 'object') out.push(o.src);
    for (const v of Object.values(o)) imageSources(v, out);
  }
  return out;
}

/** Drops blank optional fields so the website sees "not set" rather than empty text. */
export function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const c = compact(v);
      if (c === '' || c === undefined) continue;
      if (c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length === 0) continue;
      out[k] = c;
    }
    return out;
  }
  return value;
}
