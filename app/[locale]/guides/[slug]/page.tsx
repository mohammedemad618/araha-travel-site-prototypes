import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { getDestination, getGuide, getGuides, getPackages, getSite } from '@/lib/content';
import { formatDate } from '@/lib/format';
import { absoluteUrl, localizedPath, ogImageUrl, pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { RichText } from '@/components/ui/RichText';
import { JsonLd } from '@/components/JsonLd';
import { GuideCard, readMinutes } from '@/components/GuideCard';
import { PackageCard, toSummary } from '@/components/package/PackageCard';
import { WhatsAppLink } from '@/components/WhatsApp';
import { WhatsAppGlyph } from '@/components/ui/Icon';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getGuides().map((g) => ({ locale, slug: g.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return pageMetadata({
    locale,
    path: `guides/${slug}`,
    title: g.seo?.title?.[locale] ?? g.title[locale],
    description: g.seo?.description?.[locale] ?? g.excerpt[locale],
    image: g.image.src,
  });
}

export default async function GuidePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const g = getGuide(slug);
  if (!g) notFound();
  const t = await getTranslations('guides');
  const tn = await getTranslations('nav');
  const tw = await getTranslations('whatsapp');
  const site = getSite();
  const packages = g.destination
    ? getPackages()
        .filter((p) => p.destination === g.destination)
        .slice(0, 3)
    : getPackages().slice(0, 3);
  const others = getGuides()
    .filter((x) => x.slug !== g.slug)
    .slice(0, 3);
  const url = absoluteUrl(localizedPath(locale, `guides/${g.slug}`));

  return (
    <>
      <PageHero
        locale={locale}
        image={g.image}
        eyebrow={t(`category.${g.category}`)}
        title={g.title[locale]}
        intro={g.excerpt[locale]}
        crumbs={[
          { label: tn('home'), href: '/' },
          { label: tn('guides'), href: '/guides' },
          { label: g.title[locale] },
        ]}
      />
      <article className="bg-ivory py-[clamp(56px,7vw,104px)]">
        <div className="container-x">
          <div className="mx-auto max-w-[760px]">
            <div className="mb-10 flex flex-wrap gap-3 border-b border-ink/10 pb-6 text-[14px] text-muted">
              <span>{t('published', { date: formatDate(g.date, locale) })}</span>
              <span aria-hidden="true">·</span>
              <span>{t('readTime', { minutes: readMinutes(g, locale) })}</span>
            </div>
            {g.sections.map((s) => (
              <section key={s.heading.en} className="mb-10">
                <h2 className="m-0 mb-4 font-display text-[clamp(24px,2.4vw,32px)] leading-[1.35] font-medium text-ink">
                  {s.heading[locale]}
                </h2>
                <RichText text={s.body[locale]} className="text-[17px] text-ink-2" />
              </section>
            ))}
            <div className="mt-14 flex flex-wrap items-center justify-between gap-5 rounded-[2px] bg-ink p-7 text-ivory">
              <p className="m-0 font-display text-[21px] font-medium">{t('cta')}</p>
              <WhatsAppLink
                text={`${tw('planTrip')} — ${g.title[locale]}`}
                source={`guide-${g.slug}`}
                className="inline-flex items-center gap-2 rounded-[1px] bg-gold px-5 py-3 text-[15px] font-medium text-ink"
              >
                <WhatsAppGlyph size={17} />
                {tw('chat')}
              </WhatsAppLink>
            </div>
          </div>
        </div>
      </article>
      {packages.length > 0 && (
        <section className="bg-ivory pb-[clamp(80px,9vw,128px)]">
          <div className="container-x">
            <h2 className="m-0 mb-10 font-display text-[clamp(28px,3vw,44px)] font-medium text-ink">
              {t('packages')}
            </h2>
            <div className="grid grid-cols-1 gap-x-[clamp(20px,2vw,32px)] gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((p) => (
                <PackageCard
                  key={p.slug}
                  pkg={toSummary(p)}
                  destination={getDestination(p.destination)!}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </section>
      )}
      {others.length > 0 && (
        <section className="border-t border-ink/10 bg-ivory py-[clamp(80px,9vw,128px)]">
          <div className="container-x">
            <h2 className="m-0 mb-10 font-display text-[clamp(28px,3vw,44px)] font-medium text-ink">
              {t('related')}
            </h2>
            <div className="grid grid-cols-1 gap-x-[clamp(20px,2vw,32px)] gap-y-14 md:grid-cols-3">
              {others.map((o) => (
                <GuideCard key={o.slug} guide={o} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: g.title[locale],
          description: g.excerpt[locale],
          image: ogImageUrl(g.image.src),
          datePublished: g.date,
          dateModified: g.date,
          inLanguage: locale,
          mainEntityOfPage: url,
          author: { '@type': 'Organization', name: site.name[locale] },
          publisher: { '@id': absoluteUrl('/#organization') },
        }}
      />
    </>
  );
}
