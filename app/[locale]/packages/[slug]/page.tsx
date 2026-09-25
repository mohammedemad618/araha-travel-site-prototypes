import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { X } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import {
  getDestination,
  getPackage,
  getPackages,
  getSite,
  getVisa,
  openDepartureDates,
  upcomingDepartures,
} from '@/lib/content';
import { formatDate, formatPrice } from '@/lib/format';
import { absoluteUrl, fillPrice, localizedPath, ogImageUrl, pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { Price } from '@/components/ui/Price';
import { Arrow } from '@/components/ui/Arrow';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon, type AnyIconName } from '@/components/ui/Icon';
import { JsonLd } from '@/components/JsonLd';
import { Duration, PackageCard, toSummary } from '@/components/package/PackageCard';
import { EnquiryCard, Itinerary, MobileBookingBar } from '@/components/package/PackageClient';
import { Gallery } from '@/components/package/Gallery';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getPackages().map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const pkg = getPackage(slug);
  if (!pkg) return {};
  return pageMetadata({
    locale,
    path: `packages/${slug}`,
    title: pkg.seo?.title?.[locale] ?? pkg.title[locale],
    description: fillPrice(pkg.seo?.description?.[locale] ?? pkg.lead[locale], formatPrice(pkg.price)),
    image: pkg.image.src,
  });
}

export default async function PackagePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const pkg = getPackage(slug);
  if (!pkg) notFound();
  const dest = getDestination(pkg.destination)!;
  const visa = getVisa(pkg.destination);
  const site = getSite();
  const t = await getTranslations('package');
  const tc = await getTranslations('common');
  const tn = await getTranslations('nav');
  const tv = await getTranslations('visa');
  const ts = await getTranslations('packages.styles');
  const departures = upcomingDepartures(pkg);
  const related = getPackages()
    .filter((p) => p.slug !== pkg.slug)
    .sort((a, b) => Number(b.destination === pkg.destination) - Number(a.destination === pkg.destination))
    .slice(0, 3);
  const url = absoluteUrl(localizedPath(locale, `packages/${pkg.slug}`));
  const { usdRate, rateUpdated } = site.pricing;
  const usd =
    usdRate && usdRate > 0
      ? {
          amount: t('usdApprox', { usd: formatPrice(Math.round(pkg.price / usdRate)) }),
          note: t('usdNote', {
            rate: formatPrice(usdRate),
            date: rateUpdated ? formatDate(rateUpdated, locale) : '—',
          }),
        }
      : undefined;

  const facts: { icon: AnyIconName; k: string; v: React.ReactNode }[] = [
    { icon: 'clock', k: t('duration'), v: <Duration days={pkg.days} nights={pkg.nights} /> },
    { icon: 'route', k: t('route'), v: pkg.facts.route[locale] },
    { icon: 'bed', k: t('stay'), v: pkg.facts.stay[locale] },
    { icon: 'plane', k: t('flights'), v: pkg.facts.flights[locale] },
    { icon: 'sun', k: t('season'), v: pkg.facts.season[locale] },
    { icon: 'users', k: t('group'), v: pkg.facts.group[locale] },
  ];

  const crumbs = [
    { label: tn('home'), href: '/', path: '' },
    { label: tn('packages'), href: '/packages', path: 'packages' },
    { label: dest.name[locale], href: `/destinations/${dest.slug}`, path: `destinations/${dest.slug}` },
    { label: pkg.title[locale], path: `packages/${pkg.slug}` },
  ];

  return (
    <>
      <PageHero
        locale={locale}
        tall
        image={pkg.image}
        eyebrow={[dest.label, ...pkg.facts.route.en.split('→').map((x) => x.trim())].join(' · ')}
        title={pkg.title[locale]}
        crumbs={crumbs}
      >
        <div data-hide-booking-bar className="border-s border-gold/60 ps-6">
          <div className="mb-1.5 text-sm text-mist">{tc('from')}</div>
          <Price
            value={pkg.price}
            className="text-[clamp(36px,3.6vw,52px)] leading-none"
            unitClassName="text-[0.45em] text-gold"
          />
          {usd && <div className="mt-1.5 text-sm text-fog">{usd.amount}</div>}
          <div className="mt-2 text-[13px] text-fog">{pkg.priceNote[locale]}</div>
          {pkg.priceValidUntil && (
            <div className="mt-1 text-[13px] text-sand">
              {t('priceValid', { date: formatDate(pkg.priceValidUntil, locale) })}
            </div>
          )}
        </div>
      </PageHero>

      <section aria-label={t('facts')} className="border-b border-ink/12 bg-ivory">
        <div className="container-x">
          <dl className="m-0 grid grid-cols-2 gap-px bg-ink/10 md:grid-cols-3 lg:grid-cols-6">
            {facts.map((f) => (
              <div key={f.k} className="relative bg-ivory py-6 ps-10 pe-1 md:ps-12 md:pe-4">
                <dt className="mb-1 text-[13px] text-muted">
                  <Icon name={f.icon} size={22} className="absolute start-1 top-6 text-bronze md:start-3" />
                  {f.k}
                </dt>
                <dd className="m-0 font-display text-[16.5px] font-medium text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-ivory py-[clamp(64px,8vw,120px)]">
        <div className="container-x grid items-start gap-[clamp(48px,6vw,112px)] lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="flex min-w-0 flex-col gap-[clamp(64px,7vw,104px)]">
            <div data-reveal>
              <Eyebrow className="mb-5.5">{t('overviewEyebrow')}</Eyebrow>
              <h2 className="m-0 mb-7 font-display text-[clamp(32px,3.6vw,52px)] font-medium text-ink">
                {t('overview')}
              </h2>
              <p className="m-0 mb-5.5 font-display text-[clamp(20px,1.8vw,26px)] leading-[1.8] font-light text-pretty text-ink-2">
                {pkg.lead[locale]}
              </p>
              <p className="m-0 max-w-[680px] text-[16.5px] leading-[1.95] text-muted">
                {pkg.overview[locale]}
              </p>
            </div>

            <div data-reveal className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-12">
              <div>
                <h3 className="m-0 mb-5.5 border-b border-ink pb-4.5 font-display text-[26px] font-medium text-ink">
                  {t('includes')}
                </h3>
                <ul className="m-0 list-none p-0">
                  {pkg.includes.map((x) => (
                    <li
                      key={x.en}
                      className="flex items-start gap-3 border-b border-ink/10 py-[13px] text-[15.5px] text-ink-2"
                    >
                      <Icon name="check" size={18} className="mt-0.5 shrink-0 text-bronze" />
                      {x[locale]}
                    </li>
                  ))}
                </ul>
              </div>
              {pkg.excludes.length > 0 && (
                <div>
                  <h3 className="m-0 mb-5.5 border-b border-ink pb-4.5 font-display text-[26px] font-medium text-ink">
                    {t('excludes')}
                  </h3>
                  <ul className="m-0 list-none p-0">
                    {pkg.excludes.map((x) => (
                      <li
                        key={x.en}
                        className="flex items-start gap-3 border-b border-ink/10 py-[13px] text-[15.5px] text-muted"
                      >
                        <X
                          size={18}
                          strokeWidth={1.5}
                          className="mt-0.5 shrink-0 text-muted"
                          aria-hidden="true"
                        />
                        {x[locale]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {visa && (
              <div data-reveal className="rounded-[2px] border border-ink/12 bg-sand/40 p-6 md:p-8">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <Icon name="passport" size={22} className="text-bronze" />
                  <h3 className="m-0 font-display text-[22px] font-medium text-ink">{t('goodToKnow')}</h3>
                  <span className="rounded-full bg-ink px-3 py-1 text-[12.5px] text-ivory">
                    {tv(`status.${visa.status}`)}
                  </span>
                </div>
                <p className="m-0 mb-2 text-[13.5px] text-bronze">{t('visaFor')}</p>
                <p className="m-0 mb-4 max-w-[680px] text-[15.5px] leading-[1.9] text-ink-2">
                  {visa.summary[locale]}
                </p>
                <Link
                  href={`/visa#${visa.destination}`}
                  className="border-b border-gold pb-1 text-[14.5px] text-ink"
                >
                  {t('visaMore')} <Arrow />
                </Link>
              </div>
            )}

            <div>
              <Eyebrow className="mb-5.5">{t('itineraryEyebrow')}</Eyebrow>
              <h2 className="m-0 mb-5 font-display text-[clamp(32px,3.6vw,52px)] font-medium text-ink">
                {t('itinerary')}
              </h2>
              <Itinerary days={pkg.itinerary} />
            </div>
          </div>

          <EnquiryCard
            title={pkg.title[locale]}
            price={pkg.price}
            childPrice={pkg.childPrice}
            priceNote={pkg.priceNote[locale]}
            departures={departures.map((d) => ({
              date: d.date,
              label: formatDate(d.date, locale),
              status: d.status,
              note: d.note?.[locale] || undefined,
            }))}
            phone={site.phone}
            phoneDisplay={site.phoneDisplay}
            usd={usd}
          />
        </div>
      </section>

      {pkg.gallery.length > 0 && (
        <section className="bg-ink py-[clamp(80px,9vw,136px)] text-ivory">
          <div className="container-x">
            <div
              data-reveal
              className="mb-[clamp(32px,4vw,52px)] flex flex-wrap items-end justify-between gap-4"
            >
              <div>
                <Eyebrow tone="gold" className="mb-5.5">
                  {t('galleryEyebrow')}
                </Eyebrow>
                <h2 className="m-0 font-display text-[clamp(32px,4vw,60px)] font-medium">{t('gallery')}</h2>
              </div>
              <span className="text-[14px] text-fog">{t('photos', { count: pkg.gallery.length })}</span>
            </div>
            <Gallery images={pkg.gallery} />
          </div>
        </section>
      )}

      <section className="bg-ivory pt-[clamp(80px,9vw,136px)] pb-[clamp(120px,12vw,160px)]">
        <div className="container-x">
          <div className="mb-[clamp(32px,4vw,52px)] flex flex-wrap items-end justify-between gap-6">
            <h2 className="m-0 font-display text-[clamp(30px,3.6vw,52px)] font-medium text-ink">
              {t('related')}
            </h2>
            <Link href="/packages" className="border-b border-gold pb-1.5 text-[15px] text-ink">
              {tc('allPackages')} <Arrow />
            </Link>
          </div>
          <div className="no-scrollbar grid snap-x snap-mandatory auto-cols-[86%] grid-flow-col gap-4 overflow-x-auto md:auto-cols-auto md:grid-flow-row md:grid-cols-3 md:gap-[clamp(20px,2vw,32px)] md:overflow-visible">
            {related.map((p) => (
              <PackageCard
                key={p.slug}
                pkg={toSummary(p)}
                destination={getDestination(p.destination)!}
                locale={locale}
                departures={openDepartureDates(p)}
              />
            ))}
          </div>
        </div>
      </section>

      <MobileBookingBar price={pkg.price} />

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'TouristTrip',
            name: pkg.title[locale],
            description: pkg.lead[locale],
            url,
            image: ogImageUrl(pkg.image.src),
            touristType: pkg.styles.map((s) => ts(s)),
            itinerary: {
              '@type': 'ItemList',
              numberOfItems: pkg.itinerary.length,
              itemListElement: pkg.itinerary.map((d, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: d.title[locale],
                description: d.description[locale],
              })),
            },
            provider: { '@id': absoluteUrl('/#organization') },
            offers: {
              '@type': 'Offer',
              price: pkg.price,
              priceCurrency: 'IQD',
              url,
              availability: departures.some((d) => d.status !== 'soldout')
                ? 'https://schema.org/InStock'
                : 'https://schema.org/PreOrder',
              ...(pkg.priceValidUntil ? { priceValidUntil: pkg.priceValidUntil } : {}),
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: pkg.price,
                priceCurrency: 'IQD',
                referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: 'person' },
              },
            },
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
