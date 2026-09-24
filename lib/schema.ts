import { z } from 'zod';

// Every piece of visitor-facing text is stored in both languages.
export const localized = z.object({ ar: z.string().min(1), en: z.string().min(1) });
export type Localized = z.infer<typeof localized>;

// The CMS saves optional fields as empty strings/objects; treat those as "not set".
const blankToUndefined = (v: unknown) => {
  if (v === '' || v === null) return undefined;
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => x === '' || x == null)) {
    return undefined;
  }
  return v;
};
export const optionalLocalized = z.preprocess(blankToUndefined, localized.optional());
const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());

export const image = z.object({
  src: z.string().min(1),
  alt: localized,
  credit: z.string().optional(),
  creditUrl: optionalUrl,
});
export type ImageData = z.infer<typeof image>;

import { travelStyles } from './constants';

export { travelStyles, type TravelStyle } from './constants';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const packageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: localized,
  destination: z.string(),
  styles: z.array(z.enum(travelStyles)).min(1),
  days: z.number().int().positive(),
  nights: z.number().int().nonnegative(),
  price: z.number().int().positive(),
  priceNote: localized,
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
  departures: z.array(isoDate).default([]),
  itinerary: z
    .array(z.object({ title: localized, description: localized, tags: z.array(localized).default([]) }))
    .min(1),
  includes: z.array(localized).min(1),
  excludes: z.array(localized).default([]),
  featured: z.boolean().default(false),
  badge: optionalLocalized,
  order: z.number().int().default(100),
  seo: z.preprocess(blankToUndefined, z.object({ title: optionalLocalized, description: optionalLocalized }).optional()),
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
  image,
  homeLayout: z.enum(['big', 'mid', 'wide']).default('mid'),
  order: z.number().int().default(100),
});
export type Destination = z.infer<typeof destinationSchema>;

export const testimonialSchema = z.object({
  quote: localized,
  name: localized,
  destination: z.string(),
  image,
});

export const faqSchema = z.object({ question: localized, answer: localized, category: z.string().optional() });

export const siteSchema = z.object({
  name: localized,
  shortName: localized,
  tagline: localized,
  description: localized,
  url: z.string().url(),
  phone: z.string(),
  phoneDisplay: z.string(),
  whatsapp: z.string().regex(/^\d{8,15}$/, 'Digits only, with country code'),
  whatsappDisplay: z.string(),
  email: z.string().email(),
  address: localized,
  hours: localized,
  license: optionalLocalized,
  mapQuery: z.string(),
  social: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    tiktok: z.string().optional(),
  }),
});
export type Site = z.infer<typeof siteSchema>;

export const homeSchema = z.object({
  hero: z.object({
    eyebrow: z.string(),
    headline: z.tuple([localized, localized]),
    intro: localized,
    slides: z.array(z.object({ place: localized, coord: z.string(), image })).min(1),
  }),
  styles: z.array(
    z.object({ style: z.enum(travelStyles), title: localized, description: localized, image }),
  ),
  featuredPackage: z.string(),
  services: z.array(z.object({ title: localized, description: localized })),
  benefits: z.array(z.object({ title: localized, description: localized })),
  offer: z.object({
    package: z.string(),
    eyebrow: z.string(),
    title: localized,
    route: localized,
    note: localized,
    image,
  }),
  finalImage: image,
});
export type Home = z.infer<typeof homeSchema>;

export const pageSchema = z.object({
  title: localized,
  eyebrow: z.string(),
  intro: localized,
  image: z.preprocess((v) => (v && typeof v === 'object' && !(v as { src?: string }).src ? undefined : v), image.optional()),
  sections: z.array(z.object({ heading: localized, body: localized })).default([]),
  seoDescription: localized,
});
export type Page = z.infer<typeof pageSchema>;
