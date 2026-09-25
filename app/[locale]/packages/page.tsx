import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getDestinations, getPackages, openDeparturesBySlug } from '@/lib/content';
import { absoluteUrl, localizedPath, pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { PackagesExplorer } from '@/components/package/PackagesExplorer';
import { toSummary } from '@/components/package/PackageCard';
import { CustomTrip } from '@/components/sections/HomeSections';
import { JsonLd } from '@/components/JsonLd';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'packages' });
  return pageMetadata({
    locale,
    path: 'packages',
    title: t('metaTitle'),
    description: t('metaDescription'),
    image: getPackages()[0]?.image.src,
  });
}

export default async function PackagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('packages');
  const tn = await getTranslations('nav');
  const packages = getPackages();
  const destinations = getDestinations();
  const nextDepartures = openDeparturesBySlug(packages);

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t('eyebrow')}
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: tn('home'), href: '/' }, { label: tn('packages') }]}
      />
      <section className="bg-ivory py-[clamp(64px,8vw,120px)]">
        <div className="container-x">
          <PackagesExplorer
            packages={packages.map(toSummary)}
            destinations={destinations.map(({ slug, name, label }) => ({ slug, name, label }))}
            nextDepartures={nextDepartures}
          />
        </div>
      </section>
      <CustomTrip />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: packages.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: absoluteUrl(localizedPath(locale, `packages/${p.slug}`)),
            name: p.title[locale],
          })),
        }}
      />
    </>
  );
}
