import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getDestinations } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { DestinationMosaic, CustomTrip } from '@/components/sections/HomeSections';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'destinations' });
  return pageMetadata({
    locale,
    path: 'destinations',
    title: t('metaTitle'),
    description: t('metaDescription'),
    image: getDestinations()[0]?.image.src,
  });
}

export default async function DestinationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('destinations');
  const tn = await getTranslations('nav');
  const tc = await getTranslations('common');
  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t('eyebrow')}
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: tn('home'), href: '/' }, { label: tn('destinations') }]}
      />
      <section className="bg-ink pb-[clamp(96px,11vw,168px)] text-ivory">
        <div className="container-x">
          <DestinationMosaic destinations={getDestinations()} locale={locale} cta={tc('seePackages')} />
        </div>
      </section>
      <CustomTrip />
    </>
  );
}
