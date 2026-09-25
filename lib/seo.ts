import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';
import { getSite } from './content';

/** Builds an absolute URL for a path such as "/packages/". */
export function absoluteUrl(path: string): string {
  return new URL(path, getSite().url).toString();
}

export function localizedPath(locale: Locale, path = '/'): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean ? `/${locale}/${clean}/` : `/${locale}/`;
}

type PageMeta = {
  locale: Locale;
  /** Path without the locale prefix, e.g. "packages/enchanting-istanbul". */
  path: string;
  title: string;
  description: string;
  image?: string;
  absoluteTitle?: boolean;
};

export function pageMetadata({ locale, path, title, description, image, absoluteTitle }: PageMeta): Metadata {
  const site = getSite();
  const url = absoluteUrl(localizedPath(locale, path));
  const ogImage = ogImageUrl(image ?? '/og-default.jpg');
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ar: absoluteUrl(localizedPath('ar', path)),
        en: absoluteUrl(localizedPath('en', path)),
        'x-default': absoluteUrl(localizedPath('ar', path)),
      },
    },
    openGraph: {
      type: 'website',
      url,
      siteName: site.name[locale],
      title,
      description,
      locale: locale === 'ar' ? 'ar_IQ' : 'en_US',
      alternateLocale: locale === 'ar' ? 'en_US' : 'ar_IQ',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

/** A 1200×630 version of an image, suitable for social cards and structured data. */
export function ogImageUrl(src: string): string {
  if (src.startsWith('https://images.unsplash.com/')) {
    const url = new URL(src);
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('w', '1200');
    url.searchParams.set('h', '630');
    url.searchParams.set('q', '75');
    return url.toString();
  }
  if (src.startsWith('/uploads/') && process.env.NEXT_PUBLIC_IMAGE_CDN === 'netlify') {
    return absoluteUrl(`/.netlify/images?url=${encodeURIComponent(src)}&w=1200&h=630&fit=cover`);
  }
  return absoluteUrl(src);
}

/** Fills the {price} token used in CMS SEO descriptions so they never show a stale price. */
export function fillPrice(text: string, price: string): string {
  return text.replaceAll('{price}', price);
}
