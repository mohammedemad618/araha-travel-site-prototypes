import { Phone, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { Destination, Home, ImageData, Package, Site, Testimonial } from '@/lib/schema';
import { formatDate } from '@/lib/format';
import { Photo } from '../ui/Photo';
import { Price } from '../ui/Price';
import { Arrow } from '../ui/Arrow';
import { Eyebrow } from '../ui/Eyebrow';
import { Icon, WhatsAppGlyph } from '../ui/Icon';
import { SectionHeader } from '../ui/SectionHeader';
import { OpenWhatsAppButton, WhatsAppLink } from '../WhatsApp';
import { CustomTripForm } from '../forms/Forms';
import { Duration, PackageCard, type PackageSummary } from '../package/PackageCard';
import { NextDeparture } from '../package/NextDeparture';

export function IntroLoader() {
  const t = useTranslations('meta');
  return (
    <div
      aria-hidden="true"
      className="intro-loader fixed inset-0 z-200 flex flex-col items-center justify-center gap-5.5 bg-ink"
    >
      <div className="font-display text-[44px] font-medium tracking-[-0.01em] text-ivory">
        {t('brandWordmark')}
      </div>
      <div dir="ltr" className="font-latin text-[10px] tracking-[0.42em] text-gold">
        ARIHA · {t('brandSub')}
      </div>
      <div className="relative h-px w-[120px] overflow-hidden bg-ivory/12">
        <span className="intro-line absolute inset-y-0 start-0 bg-gold" />
      </div>
    </div>
  );
}

/**
 * Reassurance strip under the hero. Qualitative points come from the CMS; hard
 * numbers (years, travellers, Google rating) appear only once the owner enters them.
 */
export function TrustBar({
  points,
  site,
  locale,
}: {
  points: Home['trustPoints'];
  site: Site;
  locale: Locale;
}) {
  const t = useTranslations('home');
  const stats: { icon: 'star' | 'users' | 'clock' | 'shield'; label: string; href?: string }[] = [];
  const { trust } = site;
  if (trust.googleRating) {
    stats.push({
      icon: 'star',
      label:
        t('statRating', { rating: trust.googleRating }) +
        (trust.googleReviews ? ` · ${t('statReviews', { count: trust.googleReviews })}` : ''),
      href: trust.googleMapsUrl,
    });
  }
  if (trust.since)
    stats.push({ icon: 'clock', label: t('statYears', { count: new Date().getFullYear() - trust.since }) });
  if (trust.travellers)
    stats.push({
      icon: 'users',
      label: t('statTravellers', { count: trust.travellers.toLocaleString('en-US') }),
    });
  if (site.license) stats.push({ icon: 'shield', label: t('licensed'), href: trust.licenceUrl });
  if (!points.length && !stats.length) return null;

  return (
    <section aria-label={t('trustLabel')} className="border-b border-ink/10 bg-ivory">
      <div className="container-x">
        {stats.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap justify-center gap-x-8 gap-y-3 border-b border-ink/10 p-0 py-5 text-[14.5px] text-ink-2">
            {stats.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <Icon name={s.icon} size={18} className="text-bronze" />
                {s.href ? (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-gold/50 underline-offset-4"
                  >
                    {s.label}
                  </a>
                ) : (
                  s.label
                )}
              </li>
            ))}
          </ul>
        )}
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 py-8 md:gap-x-6 md:gap-y-7 md:py-9 lg:grid-cols-4">
          {points.map((p) => (
            <li key={p.title.en} className="flex items-center gap-2.5 md:items-start md:gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/60 text-bronze md:h-11 md:w-11">
                <Icon name={p.icon} size={18} />
              </span>
              <span>
                <span className="block font-display text-[15px] leading-[1.45] font-medium text-balance text-ink md:text-[16.5px]">
                  {p.title[locale]}
                </span>
                <span className="mt-1 hidden text-[13.5px] leading-[1.7] text-muted md:block">
                  {p.description[locale]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TravelStyles({ styles, locale }: { styles: Home['styles']; locale: Locale }) {
  const t = useTranslations('home');
  return (
    <section id="styles" className="bg-ivory py-[clamp(80px,10vw,150px)]">
      <div className="container-x">
        <SectionHeader eyebrow={t('stylesEyebrow')} title={t('stylesTitle')} intro={t('stylesIntro')} />
        <div className="no-scrollbar grid snap-x snap-mandatory auto-cols-[72%] grid-flow-col gap-3.5 overflow-x-auto pb-2 md:auto-cols-auto md:grid-flow-row md:grid-cols-3 md:gap-4.5 md:overflow-visible md:pb-0 lg:grid-cols-6">
          {styles.map((s, i) => (
            <Link
              key={s.style}
              href={{ pathname: '/packages', query: { style: s.style } }}
              className={`group relative block aspect-[3/4.5] snap-start overflow-hidden rounded-[2px] bg-slate-2 ${
                i % 2 === 1 ? 'lg:mt-14' : ''
              }`}
            >
              <span className="absolute inset-0 transition-transform duration-[1400ms] ease-soft group-hover:scale-[1.07]">
                <Photo
                  image={s.image}
                  locale={locale}
                  sizes="(min-width: 1100px) 16vw, (min-width: 760px) 33vw, 72vw"
                />
              </span>
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top,rgba(11,29,38,.92) 0%,rgba(11,29,38,.35) 45%,rgba(11,29,38,0) 70%)',
                }}
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pt-5.5 pb-6 text-ivory">
                {locale === 'ar' && (
                  <span
                    lang="en"
                    aria-hidden="true"
                    className="mb-2.5 block font-latin text-[10px] tracking-[0.28em] text-gold uppercase"
                  >
                    {s.style}
                  </span>
                )}
                <span className="mb-1.5 block font-display text-[clamp(22px,1.9vw,28px)] font-medium">
                  {s.title[locale]}
                </span>
                <span className="mb-4 block text-sm text-mist">{s.description[locale]}</span>
                <span className="block h-px w-6 bg-gold transition-[width] duration-800 ease-soft group-hover:w-[72px]" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturedPackages({
  featured,
  others,
  destinations,
  nextDepartures,
  locale,
}: {
  featured: Package;
  others: PackageSummary[];
  destinations: Map<string, Destination>;
  /** Formatted next departure per package slug. */
  nextDepartures: Record<string, string[]>;
  locale: Locale;
}) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tp = useTranslations('package');
  const fd = destinations.get(featured.destination)!;
  return (
    <section id="packages" className="bg-ivory pt-[clamp(80px,10vw,150px)] pb-[clamp(96px,11vw,168px)]">
      <div className="container-x">
        <div data-reveal className="mb-[clamp(40px,5vw,72px)] flex flex-wrap items-end justify-between gap-7">
          <div>
            <Eyebrow className="mb-5.5">{t('packagesEyebrow')}</Eyebrow>
            <h2 className="heading-xl m-0 mb-4.5 text-ink">{t('packagesTitle')}</h2>
            <p className="m-0 max-w-[460px] text-[17px] leading-[1.8] text-muted">{t('packagesIntro')}</p>
          </div>
          <Link
            href="/packages"
            className="flex items-center gap-3 border-b border-gold pb-2 text-[15px] text-ink"
          >
            {tc('allPackages')} <Arrow />
          </Link>
        </div>

        <div className="no-scrollbar grid snap-x snap-mandatory auto-cols-[86%] grid-flow-col gap-4 overflow-x-auto pb-2 md:auto-cols-auto md:grid-flow-row-dense md:grid-cols-12 md:gap-x-[clamp(20px,2vw,32px)] md:gap-y-[clamp(48px,4vw,64px)] md:overflow-visible md:pb-0">
          <article className="group relative min-h-[640px] snap-start overflow-hidden rounded-[2px] bg-slate-2 md:col-span-12 md:min-h-[620px] lg:col-span-7 lg:row-span-2 lg:min-h-[720px]">
            <span className="absolute inset-0 transition-transform duration-[1600ms] ease-soft group-hover:scale-[1.05]">
              <Photo image={featured.image} locale={locale} sizes="(min-width: 1100px) 58vw, 100vw" />
            </span>
            {/* On phones the text block is taller, so the scrim reaches higher. */}
            <span
              className="pointer-events-none absolute inset-0 md:hidden"
              style={{
                background:
                  'linear-gradient(to top,rgba(11,29,38,.97) 0%,rgba(11,29,38,.8) 55%,rgba(11,29,38,0) 85%)',
              }}
            />
            <span
              className="pointer-events-none absolute inset-0 hidden md:block"
              style={{
                background:
                  'linear-gradient(to top,rgba(11,29,38,.96) 0%,rgba(11,29,38,.55) 40%,rgba(11,29,38,0) 68%)',
              }}
            />
            <div className="pointer-events-none absolute inset-x-6 top-6 flex items-center justify-between gap-3">
              {featured.badge && (
                <span className="rounded-[1px] bg-ivory px-3.5 py-[7px] text-[12.5px] whitespace-nowrap text-ink">
                  {featured.badge[locale]}
                </span>
              )}
              <NextDeparture
                dates={nextDepartures[featured.slug] ?? []}
                locale={locale}
                className="hidden items-center gap-1.5 rounded-[1px] bg-ink/70 px-3 py-[7px] text-[12.5px] whitespace-nowrap text-ivory md:flex"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-[clamp(24px,3vw,44px)] text-ivory">
              <div className="mb-3.5 flex items-center gap-3 text-sm text-gold">
                <span>{fd.name[locale]}</span>
                {locale === 'ar' && (
                  <>
                    <span className="h-px w-4.5 bg-gold" aria-hidden="true" />
                    <span
                      lang="en"
                      dir="ltr"
                      aria-hidden="true"
                      className="font-latin text-[11px] tracking-[0.26em]"
                    >
                      {fd.label}
                    </span>
                  </>
                )}
              </div>
              <h3 className="m-0 mb-5 font-display text-[clamp(36px,4.2vw,64px)] leading-[1.08] rtl:leading-[1.24] font-medium tracking-[-0.01em]">
                <Link href={`/packages/${featured.slug}`} className="hover:text-ivory">
                  {featured.title[locale]}
                </Link>
              </h3>
              <ul className="m-0 mb-6.5 flex list-none flex-wrap gap-x-5 gap-y-2.5 p-0 text-[14.5px] text-sand">
                <li className="flex items-center gap-2">
                  <Icon name="clock" size={16} className="text-gold" />
                  <Duration days={featured.days} nights={featured.nights} />
                </li>
                {featured.highlights.map((h) => (
                  <li key={h.en} className="flex items-center gap-2">
                    <Icon name="check" size={16} className="text-gold" />
                    {h[locale]}
                  </li>
                ))}
              </ul>
              <div className="relative mb-6 h-px bg-ivory/20">
                <div className="absolute start-0 top-0 h-px w-16 bg-gold transition-[width] duration-1000 ease-soft group-hover:w-full" />
              </div>
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <div className="mb-1 text-[13px] text-mist">{tc('from')}</div>
                  <Price value={featured.price} className="text-[clamp(26px,2.4vw,34px)]" />
                  <div className="mt-1 text-[12.5px] text-fog">{featured.priceNote[locale]}</div>
                </div>
                <div className="flex w-full flex-col gap-2.5 text-center md:w-auto md:flex-row">
                  <Link
                    href={`/packages/${featured.slug}`}
                    className="rounded-[1px] bg-gold px-6 py-3.5 text-[14.5px] font-medium text-ink transition-colors hover:bg-sand hover:text-ink"
                  >
                    {tc('viewDetails')}
                  </Link>
                  <WhatsAppLink
                    text={tp('waMessage', { title: featured.title[locale] })}
                    source="featured-package"
                    className="rounded-[1px] border border-ivory/50 px-5.5 py-3.5 text-[14.5px] text-ivory transition-colors hover:border-ivory hover:text-ivory"
                  >
                    {tc('enquire')}
                  </WhatsAppLink>
                </div>
              </div>
            </div>
          </article>

          {others.map((p, i) => (
            <PackageCard
              key={p.slug}
              pkg={p}
              destination={destinations.get(p.destination)!}
              locale={locale}
              departures={nextDepartures[p.slug]}
              className={i < 2 ? 'md:col-span-6 lg:col-span-5' : 'md:col-span-4'}
              imageClassName={i < 2 ? 'aspect-[4/3] lg:aspect-video' : 'aspect-[4/3]'}
              sizes={i < 2 ? '(min-width: 1100px) 42vw, (min-width: 760px) 50vw, 86vw' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const DEST_LAYOUT = {
  big: { cell: 'col-span-2 row-span-2 md:col-span-6', title: 'text-[clamp(44px,5.2vw,80px)]', desc: 'block' },
  wide: {
    cell: 'col-span-2 md:col-span-6 lg:col-span-12',
    title: 'text-[clamp(36px,4vw,60px)]',
    desc: 'block',
  },
  mid: { cell: 'col-span-1 md:col-span-3', title: 'text-2xl md:text-[32px]', desc: 'hidden md:block' },
} as const;

export function DestinationsGrid({ destinations, locale }: { destinations: Destination[]; locale: Locale }) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  return (
    <section id="destinations" className="bg-ink py-[clamp(96px,11vw,168px)] text-ivory">
      <div className="container-x">
        <SectionHeader
          dark
          eyebrow={t('destinationsEyebrow')}
          title={t('destinationsTitle')}
          intro={t('destinationsIntro')}
        />
        <DestinationMosaic destinations={destinations} locale={locale} cta={tc('seePackages')} />
      </div>
    </section>
  );
}

export function DestinationMosaic({
  destinations,
  locale,
  cta,
}: {
  destinations: Destination[];
  locale: Locale;
  cta: string;
}) {
  return (
    <div className="grid auto-rows-[220px] grid-cols-2 gap-2.5 md:auto-rows-[280px] md:grid-cols-6 md:gap-4 lg:auto-rows-[320px] lg:grid-cols-12">
      {destinations.map((d) => {
        const l = DEST_LAYOUT[d.homeLayout];
        return (
          <Link
            key={d.slug}
            href={`/destinations/${d.slug}`}
            className={`group relative block overflow-hidden rounded-[2px] bg-slate text-ivory hover:text-ivory ${l.cell}`}
          >
            <span className="absolute inset-0 transition-transform duration-[1600ms] ease-soft group-hover:scale-[1.06]">
              <Photo
                image={d.image}
                locale={locale}
                sizes={
                  d.homeLayout === 'mid'
                    ? '(min-width: 1100px) 25vw, 50vw'
                    : '(min-width: 1100px) 50vw, 100vw'
                }
              />
            </span>
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top,rgba(11,29,38,.9) 0%,rgba(11,29,38,.3) 50%,rgba(11,29,38,.05) 100%)',
              }}
            />
            <span
              lang="en"
              dir="ltr"
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-5 top-4.5 flex justify-between font-latin text-[10.5px] tracking-[0.22em] text-ivory/80"
            >
              <span>{d.coord}</span>
              {locale === 'ar' && <span>{d.label}</span>}
            </span>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 p-[clamp(18px,2.4vw,32px)]">
              <span
                className={`mb-2 block font-display leading-[1.1] rtl:leading-[1.24] font-medium ${l.title}`}
              >
                {d.name[locale]}
              </span>
              <span className={`mb-3.5 max-w-[360px] text-[14.5px] leading-[1.7] text-mist ${l.desc}`}>
                {d.tagline[locale]}
              </span>
              <span className="relative inline-flex items-center gap-2.5 pb-1.5 text-[13.5px]">
                {cta} <Arrow />
                <span className="absolute start-0 bottom-0 h-px w-0 bg-gold transition-[width] duration-800 ease-soft group-hover:w-full" />
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function Services({ services, locale }: { services: Home['services']; locale: Locale }) {
  const t = useTranslations('home');
  return (
    <section id="services" className="scroll-mt-20 bg-ivory py-[clamp(88px,10vw,150px)]">
      <div className="container-x">
        <div
          data-reveal
          className="mb-[clamp(44px,5vw,80px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-end gap-x-20 gap-y-8"
        >
          <div>
            <Eyebrow className="mb-5.5">{t('servicesEyebrow')}</Eyebrow>
            <h2 className="m-0 font-display text-[clamp(34px,4.6vw,68px)] leading-[1.12] rtl:leading-[1.24] font-medium tracking-[-0.01em] text-balance text-ink">
              {t('servicesTitle')}
            </h2>
          </div>
          <div className="flex flex-col items-start gap-5.5">
            <p className="m-0 max-w-[480px] text-[17px] leading-[1.85] text-muted">{t('servicesIntro')}</p>
            <OpenWhatsAppButton className="border-b border-gold py-1.5 text-[15px] text-ink">
              {t('servicesCta')} <Arrow />
            </OpenWhatsAppButton>
          </div>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-9 p-0 md:grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] md:gap-x-[clamp(24px,3vw,48px)] md:gap-y-0">
          {services.map((s) => (
            <li key={s.title.en} className="group relative md:border-t md:border-ink/14 md:pt-8 md:pb-11">
              <div className="absolute start-0 -top-px hidden h-px w-0 bg-gold transition-[width] duration-900 ease-soft group-hover:w-full md:block" />
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gold/70 text-bronze md:mb-6">
                <Icon name={s.icon} size={22} />
              </span>
              <h3 className="m-0 mb-2 font-display text-[18px] font-medium text-ink md:text-[22px]">
                {s.title[locale]}
              </h3>
              <p className="m-0 line-clamp-3 max-w-[300px] text-[14px] leading-[1.75] text-muted md:line-clamp-none md:text-[15px]">
                {s.description[locale]}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CustomTrip({ id = 'custom', phone }: { id?: string; phone?: string }) {
  const t = useTranslations('home');
  const tw = useTranslations('whatsapp');
  return (
    <section id={id} className="scroll-mt-20 bg-sand py-[clamp(96px,11vw,160px)]">
      <div className="container-x grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-[clamp(48px,7vw,120px)]">
        <div data-reveal>
          <Eyebrow tone="ink" className="mb-6.5">
            {t('customEyebrow')}
          </Eyebrow>
          <p className="m-0 mb-3 font-display text-[clamp(20px,1.8vw,26px)] font-normal text-ink-2">
            {t('customKicker')}
          </p>
          <h2 className="m-0 mb-7.5 font-display text-[clamp(44px,6.4vw,104px)] leading-[1.04] rtl:leading-[1.24] font-medium tracking-[-0.015em] text-balance text-ink">
            {t('customTitle')}
          </h2>
          <p className="m-0 mb-7.5 max-w-[460px] text-[17.5px] leading-[1.9] text-muted-2">
            {t('customIntro')}
          </p>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
            <WhatsAppLink
              text={tw('planTrip')}
              source="custom-trip"
              className="inline-flex items-center gap-2.5 border-b border-ink pb-1.5 text-[15px] text-ink"
            >
              {t('customWhatsapp')} <Arrow />
            </WhatsAppLink>
            {phone && (
              <a href={`tel:${phone}`} className="inline-flex items-center gap-2 pb-1.5 text-[15px] text-ink">
                <Phone size={16} strokeWidth={1.5} aria-hidden="true" />
                {t('callUs')}
              </a>
            )}
          </div>
        </div>
        <div className="rounded-[2px] bg-ivory p-[clamp(28px,4vw,56px)]">
          <CustomTripForm />
        </div>
      </div>
    </section>
  );
}

export function SeasonalOffer({
  offer,
  pkg,
  locale,
}: {
  offer: Home['offer'];
  pkg: Package;
  locale: Locale;
}) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  return (
    <section
      id="offer"
      className="relative flex min-h-[clamp(560px,80vh,820px)] items-center overflow-hidden bg-ink text-ivory"
    >
      <div data-parallax="0.14" className="absolute inset-x-0 -top-[12%] -bottom-[12%] bg-slate">
        <Photo image={offer.image} locale={locale} sizes="100vw" />
      </div>
      {/* Vertical scrim on phones, side scrim on larger screens (text sits on the start side). */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(11,29,38,.95),rgba(11,29,38,.55)_60%,rgba(11,29,38,.35))] md:bg-[linear-gradient(90deg,rgba(11,29,38,.92),rgba(11,29,38,.6)_50%,rgba(11,29,38,.2))] md:rtl:bg-[linear-gradient(270deg,rgba(11,29,38,.92),rgba(11,29,38,.6)_50%,rgba(11,29,38,.2))]" />
      <div className="container-x relative z-2 py-[clamp(80px,10vw,120px)]">
        <div data-reveal>
          <div className="mb-7 flex items-center gap-3.5">
            <span className="h-px w-10 shrink-0 bg-gold" aria-hidden="true" />
            <span
              lang="en"
              dir="ltr"
              className="font-latin text-[11px] font-semibold tracking-[0.3em] text-sand"
            >
              {offer.eyebrow}
            </span>
          </div>
          <h2 className="m-0 mb-6.5 font-display text-[clamp(64px,11vw,180px)] leading-[0.95] rtl:leading-[1.15] font-semibold tracking-[-0.025em]">
            {offer.title[locale]}
          </h2>
          <div className="mb-11 flex flex-wrap items-center gap-x-7 gap-y-3.5 font-display text-[clamp(20px,2vw,28px)] font-light text-sand">
            <span>{offer.route[locale]}</span>
            <span className="h-px w-7 bg-sand/50" aria-hidden="true" />
            <span>
              <Duration days={pkg.days} nights={pkg.nights} />
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-x-12 gap-y-7">
            <div>
              <div className="mb-1.5 text-sm text-mist">{tc('from')}</div>
              <Price
                value={pkg.price}
                className="text-[clamp(40px,4.4vw,64px)] leading-none text-gold"
                unitClassName="text-[0.42em] text-ivory"
              />
            </div>
            <Link
              href={`/packages/${pkg.slug}`}
              className="flex items-center gap-3.5 rounded-[1px] bg-ivory px-[34px] py-4.5 text-[15.5px] font-medium text-ink transition-colors hover:bg-gold hover:text-ink"
            >
              {t('offerCta')} <Arrow />
            </Link>
          </div>
          <div className="mt-11 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-mist">
            <span>{offer.note[locale]}</span>
            {offer.validUntil && (
              <span className="flex items-center gap-2 text-sand">
                <Icon name="timer" size={16} className="text-gold" />
                {t('offerEnds', { date: formatDate(offer.validUntil, locale) })}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhyUs({ benefits, locale }: { benefits: Home['benefits']; locale: Locale }) {
  const t = useTranslations('home');
  return (
    <section id="why" className="bg-ivory py-[clamp(88px,10vw,150px)]">
      <div className="container-x">
        <div data-reveal className="mb-[clamp(48px,6vw,88px)]">
          <Eyebrow className="mb-5.5">{t('whyEyebrow')}</Eyebrow>
          <h2 className="m-0 max-w-[14ch] font-display text-[clamp(36px,5.4vw,84px)] leading-[1.08] rtl:leading-[1.24] font-medium tracking-[-0.015em] text-balance text-ink">
            {t('whyTitle')}
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-[clamp(28px,3vw,56px)] gap-y-12">
          {benefits.map((b, i) => (
            <div key={b.title.en} data-reveal className="border-t border-ink pt-6.5">
              <div
                aria-hidden="true"
                className="mb-8 font-latin text-[13px] font-semibold tracking-[0.14em] text-bronze"
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 className="m-0 mb-3.5 font-display text-[clamp(24px,2vw,30px)] leading-[1.25] font-medium text-ink">
                {b.title[locale]}
              </h3>
              <p className="m-0 text-[15.5px] leading-[1.85] text-muted">{b.description[locale]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SOURCE_KEY = {
  google: 'sourceGoogle',
  whatsapp: 'sourceWhatsapp',
  instagram: 'sourceInstagram',
  facebook: 'sourceFacebook',
  other: 'sourceOther',
} as const;

/** Rendered only when at least one testimonial has been confirmed as genuine in the CMS. */
export function Stories({
  stories,
  destinations,
  locale,
  reviewsUrl,
}: {
  stories: Testimonial[];
  destinations: Map<string, Destination>;
  locale: Locale;
  reviewsUrl?: string;
}) {
  const t = useTranslations('home');
  if (!stories.length) return null;
  const [open, close] = locale === 'ar' ? ['«', '»'] : ['“', '”'];
  return (
    <section
      id="stories"
      className="bg-ink-2 pt-[clamp(96px,11vw,168px)] pb-[clamp(120px,13vw,200px)] text-ivory"
    >
      <div className="container-x">
        <SectionHeader
          dark
          eyebrow={t('storiesEyebrow')}
          title={t('storiesTitle')}
          intro={t('storiesIntro')}
          className="mb-[clamp(48px,6vw,88px)]!"
          action={
            reviewsUrl ? (
              <a
                href={reviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-b border-gold pb-1.5 text-[15px] text-ivory"
              >
                {t('readReviews')} <Arrow />
              </a>
            ) : undefined
          }
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-x-[clamp(24px,3vw,48px)] gap-y-14">
          {stories.map((s, i) => (
            <figure key={s.name.en} className={`m-0 ${i === 1 ? 'lg:mt-[88px]' : ''}`}>
              <div className="relative mb-7 aspect-[4/5] overflow-hidden rounded-[2px] bg-slate-2">
                <Photo image={s.image} locale={locale} sizes="(min-width: 1100px) 30vw, 100vw" />
                <span className="pointer-events-none absolute end-4 bottom-4 rounded-[1px] bg-ivory px-3 py-1.5 text-[12.5px] text-ink">
                  {destinations.get(s.destination)?.name[locale]}
                </span>
              </div>
              {s.rating && (
                <div
                  className="mb-3 flex gap-1 text-gold"
                  role="img"
                  aria-label={t('ratingLabel', { rating: s.rating })}
                >
                  {Array.from({ length: s.rating }, (_, k) => (
                    <Star key={k} size={16} strokeWidth={1.5} fill="currentColor" aria-hidden="true" />
                  ))}
                </div>
              )}
              <blockquote className="m-0 mb-5.5 font-display text-[clamp(20px,1.7vw,25px)] leading-[1.6] font-light text-pretty text-ivory">
                <span className="text-gold">{open}</span>
                {s.quote[locale]}
                <span className="text-gold">{close}</span>
              </blockquote>
              <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fog">
                <span className="h-px w-5.5 bg-gold" aria-hidden="true" />
                {s.name[locale]}
                {(s.source || s.date) && (
                  <span className="text-[13px] text-fog/80">
                    {s.source &&
                      (s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-gold/50 underline-offset-4"
                        >
                          {t(SOURCE_KEY[s.source])}
                        </a>
                      ) : (
                        t(SOURCE_KEY[s.source])
                      ))}
                    {s.source && s.date && ' · '}
                    {s.date && formatDate(s.date, locale)}
                  </span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ image, locale, phone }: { image: ImageData; locale: Locale; phone: string }) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tw = useTranslations('whatsapp');
  const btn =
    'flex w-full max-w-[340px] items-center justify-center gap-2.5 rounded-[1px] px-[34px] py-4.5 text-[15.5px] md:w-auto';
  return (
    <section
      id="contact"
      className="relative flex min-h-[clamp(600px,88vh,880px)] items-center justify-center overflow-hidden bg-ink text-center text-ivory"
    >
      <div data-parallax="0.14" className="absolute inset-x-0 -top-[12%] -bottom-[12%] bg-slate">
        <Photo image={image} locale={locale} sizes="100vw" />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center,rgba(11,29,38,.6) 0%,rgba(11,29,38,.85) 75%)',
        }}
      />
      <div data-reveal className="relative z-2 max-w-[980px] px-[clamp(20px,4vw,64px)] py-[120px]">
        <Eyebrow tone="gold" className="mb-7 justify-center">
          {t('finalEyebrow')}
        </Eyebrow>
        <h2 className="m-0 mb-7 font-display text-[clamp(48px,7.6vw,120px)] leading-[1.02] rtl:leading-[1.24] font-medium tracking-[-0.02em]">
          {t('finalTitle')}
        </h2>
        <p className="mx-auto mt-0 mb-11 max-w-[480px] text-[clamp(16px,1.4vw,19px)] leading-[1.9] text-mist">
          {t('finalIntro')}
        </p>
        <div className="flex flex-col items-center justify-center gap-3.5 md:flex-row">
          <a
            href={`tel:${phone}`}
            className={`${btn} bg-gold font-medium text-ink transition-colors hover:bg-sand hover:text-ink`}
          >
            <Phone size={17} strokeWidth={1.75} aria-hidden="true" />
            {t('finalCall')}
          </a>
          <WhatsAppLink
            text={tw('planTrip')}
            source="final-cta"
            className={`${btn} border border-ivory/50 text-ivory transition-colors hover:border-ivory hover:text-ivory`}
          >
            <WhatsAppGlyph size={17} className="text-whatsapp" />
            {tc('whatsapp')}
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}
