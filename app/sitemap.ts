import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getDestinations, getGuides, getPackages } from '@/lib/content';
import { absoluteUrl, localizedPath } from '@/lib/seo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths: { path: string; priority: number; lastModified?: string }[] = [
    { path: '', priority: 1 },
    { path: 'packages', priority: 0.9 },
    ...getPackages().map((p) => ({ path: `packages/${p.slug}`, priority: 0.8 })),
    { path: 'destinations', priority: 0.7 },
    ...getDestinations().map((d) => ({ path: `destinations/${d.slug}`, priority: 0.7 })),
    { path: 'visa', priority: 0.7 },
    { path: 'guides', priority: 0.6 },
    ...getGuides().map((g) => ({ path: `guides/${g.slug}`, priority: 0.6, lastModified: g.date })),
    { path: 'about', priority: 0.5 },
    { path: 'contact', priority: 0.6 },
    { path: 'faq', priority: 0.5 },
    { path: 'privacy', priority: 0.2 },
    { path: 'terms', priority: 0.2 },
  ];
  return paths.flatMap(({ path, priority, lastModified }) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(localizedPath(locale, path)),
      priority,
      ...(lastModified ? { lastModified } : {}),
      alternates: {
        languages: {
          ...Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(localizedPath(l, path))])),
          'x-default': absoluteUrl(localizedPath(routing.defaultLocale, path)),
        },
      },
    })),
  );
}
