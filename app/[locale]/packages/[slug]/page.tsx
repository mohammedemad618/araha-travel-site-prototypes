import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { getDestination, getPackage, getPackages, getSite, upcomingDepartures } from '@/lib/content';
import { formatDate } from '@/lib/format';
import { absoluteUrl, localizedPath, pageMetadata } from '@/lib/seo';
import type { ImageData } from '@/lib/schema';
import { PageHero } from '@/components/PageHero';
import { Photo } from '@/components/ui/Photo';
import { Price } from '@/components/ui/Price';
import { Arrow } from '@/components/ui/Arrow';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { JsonLd } from '@/components/JsonLd';
import { Duration, PackageCard } from '@/components/package/PackageCard';
import { EnquiryCard, Itinerary, MobileBookingBar } from '@/components/package/PackageClient';

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
    description: pkg.seo?.description?.[locale] ?? pkg.lead[locale],
    image: pkg.image.src,
  });
}

const GALLERY_PATTERN = ['big', 'n', 'n', 'tall', 'n', 'n'] as const;
const GALLERY_CELL = {
  big: 'col-span-2 row-span-2 md:col-span-6',
  tall: 'col-span-1 row-span-2 md:col-span-3',
  n: 'col-span-1 md:col-span-3',
} as const;

function Gallery({ images, locale, title, intro }: { images: ImageData[]; locale: Locale; title: string; intro?: string }) {
  return (
    <div className="grid auto-rows-[180px] grid-flow-dense grid-cols-2 gap-2 md:auto-rows-[220px] md:grid-cols-12 md:gap-3.5 lg:auto-rows-[280px]" aria-label={title} role="group">
      {images.map((img, i) => {
        const kind = GALLERY_PATTERN[i % GALLERY_PATTERN.length]!;
        return (
          <figure key={img.src + i} className={`relative m-0 overflow-hidden rounded-[2px] bg-slate ${GALLERY_CELL[kind]}`}>
            <Photo image={img} locale={locale} sizes={kind === 'big' ? '(min-width: 760px) 50vw, 100vw' : '(min-width: 760px) 25vw, 50vw'} />
          </figure>
        );
      })}
      {intro && <p className="sr-only">{intro}</p>}
    </div>
  );
}

export default async function PackagePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const pkg = getPackage(slug);
  if (!pkg) notFound();
  const dest = getDestination(pkg.destination)!;
  const site = getSite();
  const t = await getTranslations('package');
  const tc = await getTranslations('common');
  const tn = await getTranslations('nav');
  const departures = upcomingDepartures(pkg);
  const departureLabels = departures.map((d) => formatDate(d, locale));
  const related = getPackages()
    .filter((p) => p.slug !== pkg.slug)
    .sort((a, b) => Number(b.destination === pkg.destination) - Number(a.destination === pkg.destination))
    .slice(0, 3);
  const url = absoluteUrl(localizedPath(locale, `packages/${pkg.slug}`));

  const facts = [
    { en: 'DURATION', k: t('duration'), v: <Duration days={pkg.days} nights={pkg.nights} /> },
    { en: 'ROUTE', k: t('route'), v: pkg.facts.route[locale] },
    { en: 'STAY', k: t('stay'), v: pkg.facts.stay[locale] },
    { en: 'FLIGHTS', k: t('flights'), v: pkg.facts.flights[locale] },
    { en: 'SEASON', k: t('season'), v: pkg.facts.season[locale] },
    { en: 'GROUP', k: t('group'), v: pkg.facts.group[locale] },
  ];

  return (
    <>
      <PageHero
        locale={locale}
        tall
        image={pkg.image}
        eyebrow={[dest.label, ...pkg.facts.route.en.split('→').map((x) => x.trim())].join(' · ')}
        title={pkg.title[locale]}
        crumbs={[
          { label: tn('home'), href: '/' },
          { label: tn('packages'), href: '/packages' },
          { label: dest.name[locale], href: `/destinations/${dest.slug}` },
          { label: pkg.title[locale] },
        ]}
      >
        <div className="border-s border-gold/60 ps-6">
          <div className="mb-1.5 text-sm text-mist">{tc('from')}</div>
          <Price value={pkg.price} className="text-[clamp(36px,3.6vw,52px)] leading-none" unitClassName="text-[0.45em] text-gold" />
          <div className="mt-2 text-[13px] text-fog">{pkg.priceNote[locale]}</div>
        </div>
      </PageHero>

      <section aria-label={t('facts')} className="border-b border-ink/12 bg-ivory">
        <dl className="container-x m-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {facts.map((f) => (
            <div key={f.en} className="border-ink/10 py-7.5 pe-5.5 not-last:border-e">
              <dt className="mb-1 text-[13px] text-muted">
                <span aria-hidden="true" className="mb-2.5 block font-latin text-[10px] tracking-[0.26em] text-bronze">
                  {f.en}
                </span>
                {f.k}
              </dt>
              <dd className="m-0 font-display text-lg font-medium text-ink">{f.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-ivory py-[clamp(72px,9vw,128px)]">
        <div className="container-x grid items-start gap-[clamp(48px,6vw,112px)] lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-[clamp(72px,8vw,112px)]">
            <div data-reveal>
              <Eyebrow className="mb-5.5">{t('overviewEyebrow')}</Eyebrow>
              <h2 className="m-0 mb-7 font-display text-[clamp(32px,3.6vw,52px)] font-medium text-ink">{t('overview')}</h2>
              <p className="m-0 mb-5.5 font-display text-[clamp(20px,1.8vw,26px)] leading-[1.8] font-light text-pretty text-ink-2">
                {pkg.lead[locale]}
              </p>
              <p className="m-0 max-w-[680px] text-[16.5px] leading-[1.95] text-muted">{pkg.overview[locale]}</p>
            </div>

            <div data-reveal className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-12">
              <div>
                <h3 className="m-0 mb-5.5 border-b border-ink pb-4.5 font-display text-[26px] font-medium text-ink">
                  {t('includes')}
                </h3>
                <ul className="m-0 list-none p-0">
                  {pkg.includes.map((x) => (
                    <li key={x.en} className="flex items-baseline gap-3.5 border-b border-ink/10 py-[13px] text-[15.5px] text-ink-2">
                      <span className="relative -top-0.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" aria-hidden="true" />
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
                      <li key={x.en} className="flex items-baseline gap-3.5 border-b border-ink/10 py-[13px] text-[15.5px] text-muted">
                        <span className="relative -top-1 h-px w-2 shrink-0 bg-muted" aria-hidden="true" />
                        {x[locale]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <Eyebrow className="mb-5.5">{t('itineraryEyebrow')}</Eyebrow>
              <h2 className="m-0 mb-5 font-display text-[clamp(32px,3.6vw,52px)] font-medium text-ink">{t('itinerary')}</h2>
              <Itinerary days={pkg.itinerary} />
            </div>
          </div>

          <EnquiryCard
            title={pkg.title[locale]}
            price={pkg.price}
            departures={departureLabels}
            phone={site.phone}
            phoneDisplay={site.phoneDisplay}
          />
        </div>
      </section>

      {pkg.gallery.length > 0 && (
        <section className="bg-ink py-[clamp(88px,10vw,144px)] text-ivory">
          <div className="container-x">
            <div data-reveal className="mb-[clamp(36px,4vw,56px)]">
              <Eyebrow tone="gold" className="mb-5.5">
                {t('galleryEyebrow')}
              </Eyebrow>
              <h2 className="m-0 font-display text-[clamp(32px,4vw,60px)] font-medium">{t('gallery')}</h2>
            </div>
            <Gallery images={pkg.gallery} locale={locale} title={t('gallery')} />
          </div>
        </section>
      )}

      <section className="bg-ivory pt-[clamp(88px,10vw,144px)] pb-[clamp(120px,12vw,160px)]">
        <div className="container-x">
          <div className="mb-[clamp(36px,4vw,56px)] flex flex-wrap items-end justify-between gap-6">
            <h2 className="m-0 font-display text-[clamp(30px,3.6vw,52px)] font-medium text-ink">{t('related')}</h2>
            <Link href="/packages" className="border-b border-gold pb-1.5 text-[15px] text-ink">
              {tc('allPackages')} <Arrow />
            </Link>
          </div>
          <div className="no-scrollbar grid snap-x snap-mandatory auto-cols-[86%] grid-flow-col gap-4 overflow-x-auto md:auto-cols-auto md:grid-flow-row md:grid-cols-3 md:gap-[clamp(20px,2vw,32px)] md:overflow-visible">
            {related.map((p) => (
              <PackageCard key={p.slug} pkg={p} destination={getDestination(p.destination)!} locale={locale} />
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
            image: pkg.image.src,
            touristType: pkg.styles,
            itinerary: {
              '@type': 'ItemList',
              numberOfItems: pkg.itinerary.length,
              itemListElement: pkg.itinerary.map((d, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: { '@type': 'TouristAttraction', name: d.title[locale], description: d.description[locale] },
              })),
            },
            provider: { '@id': absoluteUrl('/#organization') },
            offers: {
              '@type': 'Offer',
              price: pkg.price,
              priceCurrency: 'IQD',
              availability: 'https://schema.org/InStock',
              url,
              ...(departures[0] ? { validFrom: new Date().toISOString().slice(0, 10) } : {}),
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { name: tn('home'), path: '' },
              { name: tn('packages'), path: 'packages' },
              { name: pkg.title[locale], path: `packages/${pkg.slug}` },
            ].map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.name,
              item: absoluteUrl(localizedPath(locale, c.path)),
            })),
          },
        ]}
      />
    </>
  );
}
