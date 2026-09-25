import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import {
  getDestination,
  getDestinations,
  getGuides,
  getPackages,
  getVisa,
  openDepartureDates,
} from '@/lib/content';
import { formatDate, formatPrice } from '@/lib/format';
import { absoluteUrl, fillPrice, localizedPath, ogImageUrl, pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Photo } from '@/components/ui/Photo';
import { Arrow } from '@/components/ui/Arrow';
import { Icon, type AnyIconName } from '@/components/ui/Icon';
import { JsonLd } from '@/components/JsonLd';
import { PackageCard, toSummary } from '@/components/package/PackageCard';
import { GuideCard } from '@/components/GuideCard';
import { CustomTrip } from '@/components/sections/HomeSections';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getDestinations().map((d) => ({ locale, slug: d.slug })));
}

/** Lowest package price for a destination, formatted (empty when it has no packages). */
function fromPrice(slug: string): string {
  const prices = getPackages()
    .filter((p) => p.destination === slug)
    .map((p) => p.price);
  return prices.length ? formatPrice(Math.min(...prices)) : '';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = getDestination(slug);
  if (!d) return {};
  return pageMetadata({
    locale,
    path: `destinations/${slug}`,
    title: d.seo?.title?.[locale] ?? d.name[locale],
    // {price} in an SEO description becomes the lowest package price for this destination.
    description: fillPrice(d.seo?.description?.[locale] ?? d.description[locale], fromPrice(slug)),
    image: d.image.src,
  });
}

export default async function DestinationPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = getDestination(slug);
  if (!d) notFound();
  const t = await getTranslations('destinations');
  const tn = await getTranslations('nav');
  const tv = await getTranslations('visa');
  const tg = await getTranslations('guides');
  const visa = getVisa(d.slug);
  const packages = getPackages().filter((p) => p.destination === d.slug);
  const guides = getGuides()
    .filter((g) => g.destination === d.slug)
    .slice(0, 3);
  const others = getDestinations().filter((x) => x.slug !== d.slug);

  const glance = (
    [
      ['plane', t('flightTime'), d.glance.flightTime?.[locale]],
      ['money', t('currency'), d.glance.currency?.[locale]],
      ['languages', t('language'), d.glance.language?.[locale]],
      ['clock', t('timeDifference'), d.glance.timeDifference?.[locale]],
      ['sun', t('bestSeason'), d.bestSeason[locale]],
    ] as [AnyIconName, string, string | undefined][]
  ).filter(([, , v]) => v);

  const crumbs = [
    { label: tn('home'), href: '/', path: '' },
    { label: tn('destinations'), href: '/destinations', path: 'destinations' },
    { label: d.name[locale], path: `destinations/${d.slug}` },
  ];

  return (
    <>
      <PageHero
        locale={locale}
        image={d.image}
        eyebrow={`${d.label} · ${d.coord}`}
        title={d.name[locale]}
        intro={d.tagline[locale]}
        crumbs={crumbs}
      />
      <section className="bg-ivory py-[clamp(64px,8vw,120px)]">
        <div className="container-x grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
          <p
            data-reveal
            className="m-0 font-display text-[clamp(20px,1.8vw,26px)] leading-[1.8] font-light text-pretty text-ink-2"
          >
            {d.description[locale]}
          </p>
          <aside data-fab-avoid className="self-start rounded-[2px] border border-ink/12 p-6">
            <h2 className="m-0 mb-4 text-[14px] font-medium text-bronze">{t('glance')}</h2>
            <dl className="m-0 flex flex-col gap-4">
              {glance.map(([icon, k, v]) => (
                <div key={k} className="relative ps-8">
                  <dt className="text-[13px] text-muted">
                    <Icon name={icon} size={20} className="absolute start-0 top-0.5 text-bronze" />
                    {k}
                  </dt>
                  <dd className="m-0 text-[15.5px] text-ink">{v}</dd>
                </div>
              ))}
              {visa && (
                <div className="relative border-t border-ink/10 ps-8 pt-4">
                  <dt className="text-[13px] text-muted">
                    <Icon name="passport" size={20} className="absolute start-0 top-4.5 text-bronze" />
                    {t('visa')}
                  </dt>
                  <dd className="m-0">
                    <span className="text-[15.5px] text-ink">{tv(`status.${visa.status}`)}</span>
                    <Link
                      href={`/visa#${d.slug}`}
                      className="ms-2 text-[13.5px] text-bronze underline underline-offset-4"
                    >
                      {tv('lastVerified', { date: formatDate(visa.lastVerified, locale) })}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      </section>
      <section className="bg-ivory pb-[clamp(96px,11vw,160px)]">
        <div className="container-x">
          <div className="mb-[clamp(32px,4vw,52px)] h-px bg-ink/12" />
          <Eyebrow className="mb-5.5">{tn('packages')}</Eyebrow>
          <h2 className="heading-xl m-0 mb-12 text-ink">{t('packagesIn', { name: d.name[locale] })}</h2>
          {packages.length > 0 ? (
            <div
              className={`grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-[clamp(20px,2vw,32px)] gap-y-14 ${
                packages.length === 1 ? 'max-w-[640px]' : ''
              }`}
            >
              {packages.map((p) => (
                <PackageCard
                  key={p.slug}
                  pkg={toSummary(p)}
                  destination={d}
                  locale={locale}
                  departures={openDepartureDates(p)}
                />
              ))}
            </div>
          ) : (
            <p className="m-0 max-w-[560px] text-[17px] leading-[1.85] text-muted">{t('noPackages')}</p>
          )}
        </div>
      </section>
      {guides.length > 0 && (
        <section className="border-t border-ink/10 bg-ivory py-[clamp(72px,8vw,120px)]">
          <div className="container-x">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 className="m-0 font-display text-[clamp(28px,3vw,44px)] font-medium text-ink">
                {tg('title')}
              </h2>
              <Link href="/guides" className="border-b border-gold pb-1 text-[15px] text-ink">
                {tg('all')} <Arrow />
              </Link>
            </div>
            {guides.length === 1 ? (
              <GuideCard guide={guides[0]!} locale={locale} featured />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-[clamp(20px,2vw,32px)] gap-y-14">
                {guides.map((g) => (
                  <GuideCard key={g.slug} guide={g} locale={locale} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
      <CustomTrip />
      <section className="bg-ink py-[clamp(80px,9vw,136px)] text-ivory">
        <div className="container-x">
          <h2 className="m-0 mb-10 font-display text-[clamp(30px,3.6vw,52px)] font-medium">{t('other')}</h2>
          <div className="no-scrollbar grid snap-x auto-cols-[72%] grid-flow-col gap-3 overflow-x-auto md:auto-cols-auto md:grid-flow-row md:grid-cols-5 md:overflow-visible">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/destinations/${o.slug}`}
                className="group relative block aspect-[3/4] snap-start overflow-hidden rounded-[2px] bg-slate text-ivory hover:text-ivory"
              >
                <span className="absolute inset-0 transition-transform duration-[1400ms] ease-soft group-hover:scale-[1.06]">
                  <Photo image={o.image} locale={locale} sizes="(min-width: 760px) 20vw, 72vw" />
                </span>
                <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/90 via-ink/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-5">
                  {locale === 'ar' && (
                    <span
                      lang="en"
                      dir="ltr"
                      aria-hidden="true"
                      className="mb-2 block font-latin text-[10px] tracking-[0.24em] text-gold"
                    >
                      {o.label}
                    </span>
                  )}
                  <span className="font-display text-2xl font-medium">{o.name[locale]}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'TouristDestination',
            name: d.name[locale],
            description: d.description[locale],
            url: absoluteUrl(localizedPath(locale, `destinations/${d.slug}`)),
            image: ogImageUrl(d.image.src),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.label,
              item: absoluteUrl(localizedPath(locale, c.path)),
            })),
          },
        ]}
      />
    </>
  );
}
