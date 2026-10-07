import { z } from 'zod';

// Website content edited in the back office. These schemas mirror the website's
// own (lib/schema.ts in the site): whatever is saved here must build there.
// Prices, durations and departure dates are not part of it: they come from the
// package and its dates in inventory.

/** Kinds of website content, one document per page (see lib/types SiteContent). */
export const siteContentKinds = [
  'package',
  'visa',
  'destination',
  'guide',
  'page',
  'site',
  'home',
  'testimonials',
  'faq',
] as const;
export type SiteContentKind = (typeof siteContentKinds)[number];

export const travelStyles = ['adventure', 'discovery', 'family', 'romance', 'unwind', 'luxury'] as const;
export const visaStatuses = ['visa-free', 'on-arrival', 'e-visa', 'visa-required'] as const;
export const homeLayouts = ['big', 'mid', 'wide'] as const;
export const guideCategories = ['destinations', 'tips', 'visas', 'seasons'] as const;
export const reviewSources = ['google', 'whatsapp', 'instagram', 'facebook', 'other'] as const;
export const weekDays = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
] as const;
export const iconNames = [
  'plane',
  'hotel',
  'passport',
  'car',
  'map',
  'heart',
  'compass',
  'users',
  'shield',
  'clock',
  'wallet',
  'headset',
  'star',
  'check',
  'sun',
  'globe',
  'camera',
  'briefcase',
  'message',
  'building',
] as const;
/** The website's fixed pages. */
export const pageKeys = ['about', 'privacy', 'terms'] as const;
/** Sections that exist once per website; stored under this key. */
export const SINGLE_KEY = 'main';

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

/** A number that may be left blank ("not set"). */
const optionalNumber = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z.union([z.literal(''), z.coerce.number().min(min, 'outOfRange').max(max, 'outOfRange')]).default('');
const optionalDate = z.union([z.literal(''), isoDate]).default('');
const slugRef = z.string().regex(/^[a-z0-9-]+$/, 'required');

/** An image that may be left out: a blank source means "no image". */
const optionalImage = z
  .object({
    src: z
      .string()
      .trim()
      .refine((s) => s === '' || MEDIA_SRC.test(s) || SITE_SRC.test(s), 'imageSrc')
      .default(''),
    alt: optionalLocalized,
    credit: z.string().trim().max(120, 'tooLong').default(''),
    creditUrl: optionalUrl,
  })
  .default({});

const sections = z.array(z.object({ heading: localized, body: localized }));
const iconItem = z.object({ icon: z.enum(iconNames), title: localized, description: localized });

export const guideContent = z.object({
  title: localized,
  excerpt: localized,
  category: z.enum(guideCategories),
  date: isoDate,
  image,
  destination: z.union([z.literal(''), slugRef]).default(''),
  sections: sections.min(1, 'addOne'),
  seo,
});

export const pageContent = z.object({
  title: localized,
  eyebrow: localized,
  intro: localized,
  image: optionalImage,
  sections: sections.default([]),
  seoDescription: localized,
});

export const siteContent = z.object({
  name: localized,
  shortName: localized,
  tagline: localized,
  description: localized,
  url: httpsUrl,
  phone: z
    .string()
    .trim()
    .regex(/^\+\d{8,15}$/, 'phoneFormat'),
  phoneDisplay: z.string().trim().min(1, 'required'),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{8,15}$/, 'whatsappFormat'),
  whatsappDisplay: z.string().trim().min(1, 'required'),
  email: z.union([z.literal(''), z.string().trim().email('invalidEmail')]).default(''),
  address: localized,
  hours: localized,
  openingHours: z
    .object({
      days: z.array(z.enum(weekDays)),
      opens: z.string().regex(/^\d{2}:\d{2}$/, 'timeFormat'),
      closes: z.string().regex(/^\d{2}:\d{2}$/, 'timeFormat'),
    })
    .default({
      days: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      opens: '09:00',
      closes: '21:00',
    }),
  license: optionalLocalized,
  mapQuery: z.string().trim().min(1, 'required'),
  social: z.object({ instagram: optionalUrl, facebook: optionalUrl, tiktok: optionalUrl }).default({}),
  trust: z
    .object({
      since: optionalNumber(1950, 2100),
      travellers: optionalNumber(),
      googleRating: optionalNumber(1, 5),
      googleReviews: optionalNumber(),
      googleMapsUrl: optionalUrl,
      licenceUrl: optionalUrl,
    })
    .default({}),
  pricing: z.object({ usdRate: optionalNumber(), rateUpdated: optionalDate }).default({}),
  paymentMethods: z.array(localized).default([]),
});

export const homeContent = z.object({
  hero: z.object({
    eyebrow: z.string().trim().min(1, 'required'),
    // The editor may send the two lines as {0, 1}; the website stores a pair.
    headline: z.preprocess(
      (v) =>
        v && typeof v === 'object' && !Array.isArray(v)
          ? [(v as Record<string, unknown>)[0], (v as Record<string, unknown>)[1]]
          : v,
      z.tuple([localized, localized]),
    ),
    intro: localized,
    slides: z
      .array(z.object({ place: localized, coord: z.string().trim().min(1, 'required'), image }))
      .min(1, 'addOne'),
  }),
  trustPoints: z.array(iconItem).default([]),
  styles: z.array(z.object({ style: z.enum(travelStyles), title: localized, description: localized, image })),
  featuredPackage: slugRef,
  services: z.array(iconItem),
  benefits: z.array(z.object({ title: localized, description: localized })),
  offer: z.object({
    package: slugRef,
    eyebrow: z.string().trim().min(1, 'required'),
    title: localized,
    route: localized,
    note: localized,
    validUntil: optionalDate,
    image,
  }),
  finalImage: image,
});

export const testimonialsContent = z.object({
  items: z.array(
    z.object({
      quote: localized,
      name: localized,
      destination: slugRef,
      image,
      verified: z.boolean().default(false),
      source: z.union([z.literal(''), z.enum(reviewSources)]).default(''),
      rating: optionalNumber(1, 5),
      date: optionalDate,
      url: optionalUrl,
    }),
  ),
});

export const faqContent = z.object({
  items: z.array(
    z.object({
      question: localized,
      answer: localized,
      category: z.string().trim().max(60, 'tooLong').default(''),
    }),
  ),
});

export const contentSchemas = {
  package: packageContent,
  visa: visaContent,
  destination: destinationContent,
  guide: guideContent,
  page: pageContent,
  site: siteContent,
  home: homeContent,
  testimonials: testimonialsContent,
  faq: faqContent,
} satisfies Record<SiteContentKind, z.ZodTypeAny>;

/** Kinds that exist once per website (stored under SINGLE_KEY). */
export const singleKinds = [
  'site',
  'home',
  'testimonials',
  'faq',
] as const satisfies readonly SiteContentKind[];
export const isSingle = (kind: SiteContentKind) => (singleKinds as readonly string[]).includes(kind);

/** Whether `key` is a valid page identifier for `kind`. */
export function validKey(kind: SiteContentKind, key: string): boolean {
  if (isSingle(kind)) return key === SINGLE_KEY;
  if (kind === 'page') return (pageKeys as readonly string[]).includes(key);
  return /^[a-z0-9][a-z0-9-]{0,80}$/.test(key);
}

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

/**
 * Drops blank fields so the website sees "not set" rather than empty text.
 * Objects stay, even when emptied: the website requires some (e.g. social links)
 * and reads an empty one as "not set" where it is optional.
 */
export function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const c = compact(v);
      if (c !== '' && c !== undefined) out[k] = c;
    }
    return out;
  }
  return value;
}
