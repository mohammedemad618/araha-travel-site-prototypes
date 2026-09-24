import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale, routing, type Locale } from '@/i18n/routing';
import { getSite } from '@/lib/content';
import { absoluteUrl, localizedPath } from '@/lib/seo';
import { alexandria, manrope, plexArabic } from '../fonts';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBar } from '@/components/MobileBar';
import { Motion } from '@/components/Motion';
import { WhatsAppPanel, WhatsAppProvider } from '@/components/WhatsApp';
import { JsonLd } from '@/components/JsonLd';
import { Analytics } from '@/components/Analytics';

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const site = getSite();
  return {
    metadataBase: new URL(site.url),
    title: { default: site.name[locale], template: `%s | ${site.name[locale]}` },
    description: site.description[locale],
    applicationName: site.name[locale],
    formatDetection: { telephone: false },
    icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
    manifest: '/site.webmanifest',
  };
}

export const viewport: Viewport = {
  themeColor: '#0B1D26',
  width: 'device-width',
  initialScale: 1,
};

// Content Security Policy as a <meta> tag so the CMS at /admin (a separate
// static page) keeps its own, looser policy.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://plausible.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self'",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://plausible.io",
  'frame-src https://www.google.com https://maps.google.com',
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const INTRO_SCRIPT =
  "try{if(sessionStorage.getItem('ariha-intro'))document.documentElement.classList.add('intro-seen');else sessionStorage.setItem('ariha-intro','1')}catch(e){}";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'meta' });
  const site = getSite();

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${alexandria.variable} ${plexArabic.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="fixed start-4 top-4 z-100 -translate-y-24 bg-gold px-4 py-2 text-ink transition-transform focus:translate-y-0"
        >
          {t('skip')}
        </a>
        <NextIntlClientProvider>
          <WhatsAppProvider number={site.whatsapp}>
            <Header />
            <main id="main">{children}</main>
            <Footer locale={locale} />
            <WhatsAppPanel />
            <MobileBar />
            <Motion />
          </WhatsAppProvider>
        </NextIntlClientProvider>
        <JsonLd data={travelAgencySchema(locale)} />
        <Analytics />
      </body>
    </html>
  );
}

function travelAgencySchema(locale: Locale) {
  const site = getSite();
  const sameAs = Object.values(site.social).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    '@id': absoluteUrl('/#organization'),
    name: site.name[locale],
    alternateName: site.name[locale === 'ar' ? 'en' : 'ar'],
    description: site.description[locale],
    url: absoluteUrl(localizedPath(locale)),
    logo: absoluteUrl('/icon-512.png'),
    image: absoluteUrl('/og-default.jpg'),
    telephone: site.phone,
    email: site.email,
    priceRange: '$$',
    currenciesAccepted: 'IQD, USD',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address[locale],
      addressLocality: locale === 'ar' ? 'بغداد' : 'Baghdad',
      addressCountry: 'IQ',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      opens: '09:00',
      closes: '21:00',
    },
    ...(sameAs.length ? { sameAs } : {}),
  };
}
