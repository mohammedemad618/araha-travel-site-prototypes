import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale, routing, type Locale } from '@/i18n/routing';
import { getSite, hasPlaceholderContacts } from '@/lib/content';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
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

// The brand intro plays once per device (first visit only).
const INTRO_SCRIPT =
  "try{if(localStorage.getItem('ariha-intro'))document.documentElement.classList.add('intro-seen');else localStorage.setItem('ariha-intro','1')}catch(e){}";

// Only the namespaces used by client components are sent to the browser.
const CLIENT_NAMESPACES = ['meta', 'nav', 'common', 'form', 'whatsapp', 'package', 'packages', 'home'];

let warned = false;

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
  const messages = await getMessages();
  const clientMessages = Object.fromEntries(
    Object.entries(messages).filter(([k]) => CLIENT_NAMESPACES.includes(k)),
  );
  if (!warned && hasPlaceholderContacts()) {
    warned = true;
    console.warn(
      '\n⚠  content/settings/site.json still contains placeholder contact details. Replace them before launch.\n',
    );
  }

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${alexandria.variable} ${plexArabic.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="fixed start-4 top-4 z-100 -translate-y-24 bg-gold px-4 py-2 text-ink transition-transform focus:translate-y-0"
        >
          {t('skip')}
        </a>
        <NextIntlClientProvider messages={clientMessages}>
          <WhatsAppProvider number={site.whatsapp} hours={site.openingHours}>
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
      addressLocality: locale === 'ar' ? 'الموصل' : 'Mosul',
      addressRegion: locale === 'ar' ? 'نينوى' : 'Nineveh',
      addressCountry: 'IQ',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: site.openingHours.days,
      opens: site.openingHours.opens,
      closes: site.openingHours.closes,
    },
    ...(site.trust.since ? { foundingDate: String(site.trust.since) } : {}),
    ...(site.license
      ? { hasCredential: { '@type': 'EducationalOccupationalCredential', name: site.license[locale] } }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}
