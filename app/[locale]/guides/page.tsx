import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getGuides } from '@/lib/content';
import { absoluteUrl, localizedPath, pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { GuideCard } from '@/components/GuideCard';
import { JsonLd } from '@/components/JsonLd';
import { CustomTrip } from '@/components/sections/HomeSections';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guides' });
  return pageMetadata({
    locale,
    path: 'guides',
    title: t('metaTitle'),
    description: t('metaDescription'),
    image: getGuides()[0]?.image.src,
  });
}

export default async function GuidesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('guides');
  const tn = await getTranslations('nav');
  const guides = getGuides();
  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t('eyebrow')}
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: tn('home'), href: '/' }, { label: tn('guides') }]}
      />
      <section className="bg-ivory py-[clamp(64px,8vw,120px)]">
        <div className="container-x grid grid-cols-1 gap-x-[clamp(20px,2vw,32px)] gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => (
            <GuideCard key={g.slug} guide={g} locale={locale} />
          ))}
        </div>
      </section>
      <CustomTrip />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: t('title'),
          url: absoluteUrl(localizedPath(locale, 'guides')),
          blogPost: guides.map((g) => ({
            '@type': 'BlogPosting',
            headline: g.title[locale],
            url: absoluteUrl(localizedPath(locale, `guides/${g.slug}`)),
            datePublished: g.date,
          })),
        }}
      />
    </>
  );
}
