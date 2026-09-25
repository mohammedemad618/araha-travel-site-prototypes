import { z } from 'zod';
import { departureStatuses, iconNames, reviewSources, travelStyles, visaStatuses } from './constants';

export { travelStyles, type TravelStyle } from './constants';

// Every piece of visitor-facing text is stored in both languages.
export const localized = z.object({ ar: z.string().min(1), en: z.string().min(1) });
export type Localized = z.infer<typeof localized>;

// The CMS saves optional fields as empty strings/objects; treat those as "not set".
const blankToUndefined = (v: unknown) => {
  if (v === '' || v === null) return undefined;
  if (
    v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => x === '' || x == null)
  ) {
    return undefined;
  }
  return v;
};

/**
 * Optional bilingual text. If an editor fills in only one language, the other
 * falls back to it instead of failing the build.
 */
export const optionalLocalized = z.preprocess(
  blankToUndefined,
  z
    .object({ ar: z.string().optional(), en: z.string().optional() })
    .transform((v) => ({ ar: v.ar || v.en || '', en: v.en || v.ar || '' }))
    .optional(),
);

const httpsUrl = z.string().url().startsWith('https://', 'Use a full link starting with https://');
const optionalUrl = z.preprocess(blankToUndefined, httpsUrl.optional());
const optionalNumber = z.preprocess(blankToUndefined, z.number().nonnegative().optional());

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  // Round-trip through Date so impossible days (2026-02-30) are rejected instead of rolled over.
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Not a real date');
const optionalDate = z.preprocess(blankToUndefined, isoDate.optional());

// Images must be CMS uploads or Unsplash CDN photos: anything else is blocked by the CSP.
export const IMAGE_SRC_PATTERN =
  /^(\/uploads\/[^?#\s]+|https:\/\/images\.unsplash\.com\/photo-[\w-]+(\?[^\s]*)?)$/;
export const image = z.object({
  src: z
    .string()
    .regex(IMAGE_SRC_PATTERN, 'Upload the image, or use an https://images.unsplash.com/photo-… link'),
  alt: localized,
  credit: z.string().optional(),
  creditUrl: optionalUrl,
});
export type ImageData = z.infer<typeof image>;

const departure = z.preprocess(
  (v) => (typeof v === 'string' ? { date: v } : v),
  z.object({
    date: isoDate,
    status: z.enum(departureStatuses).default('available'),
    note: optionalLocalized,
  }),
);
export type Departure = z.infer<typeof departure>;

const seo = z.preprocess(
  blankToUndefined,
  z.object({ title: optionalLocalized, description: optionalLocalized }).optional(),
);

export const packageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: localized,
  destination: z.string(),
  styles: z.array(z.enum(travelStyles)).min(1),
  days: z.number().int().positive(),
  nights: z.number().int().nonnegative(),
  price: z.number().int().positive(),
  priceNote: localized,
  childPrice: optionalNumber,
  priceValidUntil: optionalDate,
  highlights: z.array(localized).min(1),
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
  gallery: z.array(image).default([]),
  departures: z.array(departure).default([]),
  itinerary: z
    .array(z.object({ title: localized, description: localized, tags: z.array(localized).default([]) }))
    .min(1),
  includes: z.array(localized).min(1),
  excludes: z.array(localized).default([]),
  badge: optionalLocalized,
  order: z.number().int().default(100),
  seo,
});
export type Package = z.infer<typeof packageSchema>;

export const destinationSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: localized,
  label: z.string(),
  coord: z.string(),
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
  homeLayout: z.enum(['big', 'mid', 'wide']).default('mid'),
  order: z.number().int().default(100),
  seo,
});
export type Destination = z.infer<typeof destinationSchema>;

export const testimonialSchema = z.object({
  quote: localized,
  name: localized,
  destination: z.string(),
  image,
  // Only reviews the owner has confirmed as genuine (with the customer's consent) are shown.
  verified: z.boolean().default(false),
  source: z.preprocess(blankToUndefined, z.enum(reviewSources).optional()),
  rating: z.preprocess(blankToUndefined, z.number().int().min(1).max(5).optional()),
  date: optionalDate,
  url: optionalUrl,
});
export type Testimonial = z.infer<typeof testimonialSchema>;

export const faqSchema = z.object({
  question: localized,
  answer: localized,
  category: z.string().optional(),
});

export const siteSchema = z.object({
  name: localized,
  shortName: localized,
  tagline: localized,
  description: localized,
  url: z.string().url(),
  phone: z.string().regex(/^\+\d{8,15}$/, 'International format, e.g. +9647701234567'),
  phoneDisplay: z.string(),
  whatsapp: z.string().regex(/^\d{8,15}$/, 'Digits only, with country code'),
  whatsappDisplay: z.string(),
  email: z.string().email(),
  address: localized,
  hours: localized,
  openingHours: z
    .object({
      days: z.array(z.enum(['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])),
      opens: z.string().regex(/^\d{2}:\d{2}$/),
      closes: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .default({
      days: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      opens: '09:00',
      closes: '21:00',
    }),
  license: optionalLocalized,
  mapQuery: z.string(),
  social: z.object({
    instagram: optionalUrl,
    facebook: optionalUrl,
    tiktok: optionalUrl,
  }),
  // Verifiable numbers. Each is shown only when the owner fills it in.
  trust: z
    .object({
      since: z.preprocess(blankToUndefined, z.number().int().min(1950).max(2100).optional()),
      travellers: optionalNumber,
      googleRating: z.preprocess(blankToUndefined, z.number().min(1).max(5).optional()),
      googleReviews: optionalNumber,
      googleMapsUrl: optionalUrl,
      licenceUrl: optionalUrl,
    })
    .default({}),
  pricing: z
    .object({
      usdRate: optionalNumber,
      rateUpdated: optionalDate,
    })
    .default({}),
  paymentMethods: z.array(localized).default([]),
});
export type Site = z.infer<typeof siteSchema>;

const iconItem = z.object({ icon: z.enum(iconNames), title: localized, description: localized });

export const homeSchema = z.object({
  hero: z.object({
    eyebrow: z.string(),
    headline: z.tuple([localized, localized]),
    intro: localized,
    slides: z.array(z.object({ place: localized, coord: z.string(), image })).min(1),
  }),
  trustPoints: z.array(iconItem).default([]),
  styles: z.array(z.object({ style: z.enum(travelStyles), title: localized, description: localized, image })),
  featuredPackage: z.string(),
  services: z.array(iconItem),
  benefits: z.array(z.object({ title: localized, description: localized })),
  offer: z.object({
    package: z.string(),
    eyebrow: z.string(),
    title: localized,
    route: localized,
    note: localized,
    validUntil: optionalDate,
    image,
  }),
  finalImage: image,
});
export type Home = z.infer<typeof homeSchema>;

type RawPage = { title?: Record<string, string>; image?: { src?: string; alt?: Record<string, string> } };

export const pageSchema = z.preprocess(
  (v) => {
    // A hero image added in the CMS without a description falls back to the page title.
    const page = v as RawPage | null;
    if (!page?.image?.src) return v;
    const alt = page.image.alt ?? {};
    return {
      ...page,
      image: {
        ...page.image,
        alt: { ar: alt.ar || page.title?.ar || '', en: alt.en || page.title?.en || '' },
      },
    };
  },
  z.object({
    title: localized,
    eyebrow: localized,
    intro: localized,
    image: z.preprocess(
      (v) => (v && typeof v === 'object' && !(v as { src?: string }).src ? undefined : v),
      image.optional(),
    ),
    sections: z.array(z.object({ heading: localized, body: localized })).default([]),
    seoDescription: localized,
  }),
);
export type Page = z.infer<typeof pageSchema>;

/** Entry requirements for Iraqi passport holders, one file per destination. */
export const visaSchema = z.object({
  destination: z.string(),
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
export type Visa = z.infer<typeof visaSchema>;

/** Long-form travel guides (blog). Paragraphs are separated by a blank line; lines starting with "- " are bullets. */
export const guideSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: localized,
  excerpt: localized,
  category: z.enum(['destinations', 'tips', 'visas', 'seasons']),
  date: isoDate,
  image,
  destination: z.preprocess(blankToUndefined, z.string().optional()),
  sections: z.array(z.object({ heading: localized, body: localized })).min(1),
  seo,
});
export type Guide = z.infer<typeof guideSchema>;
