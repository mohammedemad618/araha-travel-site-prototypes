import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  destinationSchema,
  faqSchema,
  guideSchema,
  homeSchema,
  packageSchema,
  pageSchema,
  siteSchema,
  testimonialSchema,
  visaSchema,
  type Departure,
  type Destination,
  type Guide,
  type Package,
  type Visa,
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

function readFolder<T>(
  folder: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): { file: string; data: T }[] {
  const dir = path.join(CONTENT_DIR, folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: f, data: readJson(path.join(folder, f), schema) }));
}

/** Each entry's slug must be unique and match its file name, so URLs never collide. */
function assertSlugs(folder: string, entries: { file: string; data: { slug: string } }[]) {
  const seen = new Set<string>();
  for (const { file, data } of entries) {
    if (`${data.slug}.json` !== file) {
      throw new Error(`content/${folder}/${file}: slug "${data.slug}" must match the file name`);
    }
    if (seen.has(data.slug)) throw new Error(`content/${folder}: duplicate slug "${data.slug}"`);
    seen.add(data.slug);
  }
}

const cache = new Map<string, unknown>();
function cached<T>(key: string, load: () => T): T {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as T;
}

export const getSite = () => cached('site', () => readJson('settings/site.json', siteSchema));

export const getDestinations = (): Destination[] =>
  cached('destinations', () => {
    const entries = readFolder('destinations', destinationSchema);
    assertSlugs('destinations', entries);
    return entries.map((e) => e.data).sort((a, b) => a.order - b.order);
  });

export const getPackages = (): Package[] =>
  cached('packages', () => {
    const destinations = new Set(getDestinations().map((d) => d.slug));
    const entries = readFolder('packages', packageSchema);
    assertSlugs('packages', entries);
    for (const { data: p } of entries) {
      if (!destinations.has(p.destination)) {
        throw new Error(`Package "${p.slug}" references unknown destination "${p.destination}"`);
      }
    }
    return entries.map((e) => e.data).sort((a, b) => a.order - b.order || a.price - b.price);
  });

export const getPackage = (slug: string) => getPackages().find((p) => p.slug === slug);
export const getDestination = (slug: string) => getDestinations().find((d) => d.slug === slug);

export const getHome = () =>
  cached('home', () => {
    const home = readJson('settings/home.json', homeSchema);
    for (const [field, slug] of [
      ['featuredPackage', home.featuredPackage],
      ['offer.package', home.offer.package],
    ] as const) {
      if (!getPackage(slug))
        throw new Error(`content/settings/home.json: ${field} "${slug}" is not a package`);
    }
    return home;
  });

export const getTestimonials = () =>
  cached('testimonials', () => {
    const items = readJson(
      'settings/testimonials.json',
      z.object({ items: z.array(testimonialSchema) }),
    ).items;
    for (const t of items) {
      if (!getDestination(t.destination)) {
        throw new Error(`Testimonial "${t.name.en}" references unknown destination "${t.destination}"`);
      }
    }
    return items;
  });

/** Only testimonials the owner has confirmed as genuine are published. */
export const getVerifiedTestimonials = () => getTestimonials().filter((t) => t.verified);

export const getFaqs = () =>
  cached('faqs', () => readJson('settings/faq.json', z.object({ items: z.array(faqSchema) })).items);

export const getPage = (slug: 'about' | 'privacy' | 'terms') =>
  cached(`page:${slug}`, () => readJson(`pages/${slug}.json`, pageSchema));

export const getVisas = (): Visa[] =>
  cached('visas', () => {
    const order = getDestinations().map((d) => d.slug);
    // One file per destination, named after it, so a destination never gets two visa entries.
    const list = readFolder('visas', visaSchema).map((e) => {
      if (!order.includes(e.data.destination)) {
        throw new Error(`content/visas/${e.file}: unknown destination "${e.data.destination}"`);
      }
      if (e.file !== `${e.data.destination}.json`) {
        throw new Error(`content/visas/${e.file}: file name must be "${e.data.destination}.json"`);
      }
      return e.data;
    });
    return list.sort((a, b) => order.indexOf(a.destination) - order.indexOf(b.destination));
  });

export const getVisa = (destination: string) => getVisas().find((v) => v.destination === destination);

export const getGuides = (): Guide[] =>
  cached('guides', () => {
    const entries = readFolder('guides', guideSchema);
    assertSlugs('guides', entries);
    for (const { data } of entries) {
      if (data.destination && !getDestination(data.destination)) {
        throw new Error(`Guide "${data.slug}" references unknown destination "${data.destination}"`);
      }
    }
    return entries.map((e) => e.data).sort((a, b) => b.date.localeCompare(a.date));
  });

export const getGuide = (slug: string) => getGuides().find((g) => g.slug === slug);

export const today = () => new Date().toISOString().slice(0, 10);

/** Departures that have not passed at build time (the browser filters again, see EnquiryCard). */
export function upcomingDepartures(p: Package, now = today()): Departure[] {
  return p.departures.filter((d) => d.date >= now).sort((a, b) => a.date.localeCompare(b.date));
}

/** Dates (ISO) of the upcoming departures that still have seats. */
export function openDepartureDates(p: Package, now = today()): string[] {
  return upcomingDepartures(p, now)
    .filter((d) => d.status !== 'soldout')
    .map((d) => d.date);
}

/** Open departure dates for every package, keyed by slug (fed to the cards). */
export function openDeparturesBySlug(packages: Package[]): Record<string, string[]> {
  return Object.fromEntries(packages.map((p) => [p.slug, openDepartureDates(p)]));
}

/** Whether the seasonal offer is still running. */
export function offerIsActive(validUntil: string | undefined, now = today()): boolean {
  return !validUntil || validUntil >= now;
}

/** Unique photographer credits for the images used on the site. */
export function photoCredits(images: { credit?: string }[]): string[] {
  return [...new Set(images.map((i) => i.credit).filter((c): c is string => Boolean(c)))];
}

/** True while site.json still contains the demo contact details. */
export function hasPlaceholderContacts(): boolean {
  return /0000000|example\.com/.test(JSON.stringify(getSite()));
}
