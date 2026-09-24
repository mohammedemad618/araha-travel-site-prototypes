import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getDestinations, getPackages } from '@/lib/content';
import { absoluteUrl, localizedPath } from '@/lib/seo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths: { path: string; priority: number }[] = [
    { path: '', priority: 1 },
    { path: 'packages', priority: 0.9 },
    ...getPackages().map((p) => ({ path: `packages/${p.slug}`, priority: 0.8 })),
    { path: 'destinations', priority: 0.7 },
    ...getDestinations().map((d) => ({ path: `destinations/${d.slug}`, priority: 0.7 })),
    { path: 'about', priority: 0.5 },
    { path: 'contact', priority: 0.6 },
    { path: 'faq', priority: 0.5 },
    { path: 'privacy', priority: 0.2 },
    { path: 'terms', priority: 0.2 },
  ];
  const lastModified = new Date();
  return paths.flatMap(({ path, priority }) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(localizedPath(locale, path)),
      lastModified,
      priority,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(localizedPath(l, path))])),
      },
    })),
  );
}
