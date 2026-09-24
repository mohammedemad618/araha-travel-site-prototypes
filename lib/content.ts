import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Locale } from '@/i18n/routing';
import {
  destinationSchema,
  faqSchema,
  homeSchema,
  packageSchema,
  pageSchema,
  siteSchema,
  testimonialSchema,
  type Destination,
  type Localized,
  type Package,
} from './schema';

const CONTENT_DIR = path.join(process.cwd(), 'content');

// Content is read once per build and validated, so a mistake made in the CMS
// fails the build (and keeps the previous version live) instead of shipping a
// broken page.
function readJson<T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T {
  const full = path.join(CONTENT_DIR, file);
  const raw: unknown = JSON.parse(fs.readFileSync(full, 'utf8'));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid content in content/${file}:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}

function readFolder<T>(folder: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T[] {
  return fs
    .readdirSync(path.join(CONTENT_DIR, folder))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson(path.join(folder, f), schema));
}

const cache = new Map<string, unknown>();
function cached<T>(key: string, load: () => T): T {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as T;
}

export const getSite = () => cached('site', () => readJson('settings/site.json', siteSchema));
export const getHome = () => cached('home', () => readJson('settings/home.json', homeSchema));

export const getDestinations = (): Destination[] =>
  cached('destinations', () =>
    readFolder('destinations', destinationSchema).sort((a, b) => a.order - b.order),
  );

export const getPackages = (): Package[] =>
  cached('packages', () => {
    const destinations = new Set(getDestinations().map((d) => d.slug));
    const list = readFolder('packages', packageSchema);
    for (const p of list) {
      if (!destinations.has(p.destination)) {
        throw new Error(`Package "${p.slug}" references unknown destination "${p.destination}"`);
      }
    }
    return list.sort((a, b) => a.order - b.order || a.price - b.price);
  });

export const getPackage = (slug: string) => getPackages().find((p) => p.slug === slug);
export const getDestination = (slug: string) => getDestinations().find((d) => d.slug === slug);

export const getTestimonials = () =>
  cached('testimonials', () =>
    readJson('settings/testimonials.json', z.object({ items: z.array(testimonialSchema) })).items,
  );

export const getFaqs = () =>
  cached('faqs', () => readJson('settings/faq.json', z.object({ items: z.array(faqSchema) })).items);

export const getPage = (slug: 'about' | 'privacy' | 'terms') =>
  cached(`page:${slug}`, () => readJson(`pages/${slug}.json`, pageSchema));

/** Departure dates that have not passed yet at build time. */
export function upcomingDepartures(p: Package, now = new Date()): string[] {
  const today = now.toISOString().slice(0, 10);
  return p.departures.filter((d) => d >= today).sort();
}

export function t(value: Localized, locale: Locale): string {
  return value[locale];
}

/** Unique photographer credits for the images used on a page. */
export function photoCredits(images: { credit?: string }[]): string[] {
  return [...new Set(images.map((i) => i.credit).filter((c): c is string => Boolean(c)))];
}
