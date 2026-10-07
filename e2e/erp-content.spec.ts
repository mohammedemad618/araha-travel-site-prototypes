import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { z } from 'zod';
import { compact, contentSchemas } from '../erp/lib/site-content';
import {
  destinationSchema,
  faqSchema,
  guideSchema,
  packageSchema,
  pageSchema,
  siteSchema,
  testimonialSchema,
  visaSchema,
  homeSchema,
} from '../lib/schema';

// The ERP edits the website's content with its own copy of the content rules
// (erp/lib/site-content.ts). Every current page must pass through it and come
// back out as content this site accepts, also with every optional field blank,
// so the two copies cannot drift apart unnoticed.

type Json = Record<string, unknown>;
const exported = () => JSON.parse(fs.readFileSync('out/erp-content.json', 'utf8')) as Record<string, unknown>;
const blank = { ar: '', en: '' };

function roundTrip(
  kind: keyof typeof contentSchemas,
  data: unknown,
  extra: Json,
  siteRule: z.ZodTypeAny,
  emptyOptionals?: (stored: Json) => void,
) {
  const stored = contentSchemas[kind].parse(data) as Json;
  emptyOptionals?.(stored);
  const saved = contentSchemas[kind].safeParse(stored);
  expect(saved.success, `${kind}: ${JSON.stringify(saved.error?.issues.slice(0, 2))}`).toBe(true);
  const served = { ...(compact(saved.data) as Json), ...extra };
  const result = siteRule.safeParse(served);
  expect(result.success, `${kind}: ${JSON.stringify(result.error?.issues.slice(0, 2))}`).toBe(true);
}

test.describe('ERP content rules match the website', () => {
  test.skip(({ isMobile }) => isMobile, 'No browser involved: once is enough.');

  test('trip programs, visas, destinations and guides', () => {
    const d = exported() as { packages: Json[]; visas: Json[]; destinations: Json[]; guides: Json[] };
    const inventory = new Set(['slug', 'destination', 'days', 'nights', 'price', 'childPrice', 'departures']);
    for (const p of d.packages) {
      const data = {
        ...Object.fromEntries(Object.entries(p).filter(([k]) => !inventory.has(k))),
        destination: p.destination,
      };
      const extra = { slug: p.slug, days: p.days, nights: p.nights, price: p.price, departures: [] };
      roundTrip('package', data, extra, packageSchema);
      roundTrip('package', data, extra, packageSchema, (s) => {
        Object.assign(s, {
          badge: blank,
          seo: { title: blank, description: blank },
          priceValidUntil: '',
          excludes: [],
          gallery: [],
        });
      });
    }
    for (const { destination, ...v } of d.visas) {
      roundTrip('visa', v, { destination }, visaSchema, (s) => {
        Object.assign(s, {
          processingTime: blank,
          stay: blank,
          notes: blank,
          officialUrl: '',
          sources: [],
          exemptions: [],
          documents: [],
        });
      });
    }
    for (const { slug, ...x } of d.destinations) {
      roundTrip('destination', x, { slug }, destinationSchema, (s) => {
        s.glance = { flightTime: blank, currency: blank, language: blank, timeDifference: blank };
      });
    }
    for (const { slug, ...g } of d.guides) {
      roundTrip('guide', g, { slug }, guideSchema, (s) =>
        Object.assign(s, { destination: '', seo: { title: blank, description: blank } }),
      );
    }
  });

  test('pages, company details, home page, testimonials and FAQ', () => {
    const d = exported() as {
      pages: Record<string, Json>;
      site: Json;
      home: Json;
      testimonials: Json;
      faq: Json;
    };
    for (const page of Object.values(d.pages)) {
      roundTrip('page', page, {}, pageSchema);
      roundTrip('page', page, {}, pageSchema, (s) => {
        s.image = { src: '', alt: blank, credit: '', creditUrl: '' };
        s.sections = [];
      });
    }
    roundTrip('site', d.site, {}, siteSchema, (s) => {
      Object.assign(s, {
        email: '',
        license: blank,
        social: { instagram: '', facebook: '', tiktok: '' },
        trust: {
          since: '',
          travellers: '',
          googleRating: '',
          googleReviews: '',
          googleMapsUrl: '',
          licenceUrl: '',
        },
        pricing: { usdRate: '', rateUpdated: '' },
        paymentMethods: [],
      });
    });
    roundTrip('home', d.home, {}, homeSchema, (s) => {
      s.trustPoints = [];
      (s.offer as Json).validUntil = '';
    });
    roundTrip('testimonials', d.testimonials, {}, z.object({ items: z.array(testimonialSchema) }), (s) => {
      for (const i of s.items as Json[])
        Object.assign(i, { source: '', rating: '', date: '', url: '', verified: false });
    });
    roundTrip('faq', d.faq, {}, z.object({ items: z.array(faqSchema) }));
  });
});
