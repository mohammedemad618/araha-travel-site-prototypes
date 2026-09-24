import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { Destination, Home, ImageData, Localized, Package } from '@/lib/schema';
import { Photo } from '../ui/Photo';
import { Price } from '../ui/Price';
import { Arrow } from '../ui/Arrow';
import { Eyebrow } from '../ui/Eyebrow';
import { SectionHeader } from '../ui/SectionHeader';
import { OpenWhatsAppButton, WhatsAppLink } from '../WhatsApp';
import { CustomTripForm } from '../forms/Forms';
import { Duration, PackageCard } from '../package/PackageCard';

export function IntroLoader() {
  const t = useTranslations('meta');
  return (
    <div
      aria-hidden="true"
      className="intro-loader fixed inset-0 z-200 flex flex-col items-center justify-center gap-5.5 bg-ink"
    >
      <div className="font-display text-[44px] font-medium tracking-[-0.01em] text-ivory">{t('brandWordmark')}</div>
      <div dir="ltr" className="font-latin text-[10px] tracking-[0.42em] text-gold">
        ARIHA · {t('brandSub')}
      </div>
      <div className="relative h-px w-[120px] overflow-hidden bg-ivory/12">
        <span className="intro-line absolute inset-y-0 start-0 bg-gold" />
      </div>
    </div>
  );
}

export function TravelStyles({ styles, locale }: { styles: Home['styles']; locale: Locale }) {
  const t = useTranslations('home');
  return (
    <section id="styles" className="bg-ivory pt-[clamp(88px,11vw,168px)] pb-[clamp(72px,9vw,140px)]">
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
                <Photo image={s.image} locale={locale} sizes="(min-width: 1100px) 16vw, (min-width: 760px) 33vw, 72vw" />
              </span>
              <span
                className="pointer-events-none absolute inset-0"
                style={{ background: 'linear-gradient(to top,rgba(11,29,38,.92) 0%,rgba(11,29,38,.35) 45%,rgba(11,29,38,0) 70%)' }}
              />
              <span dir="ltr" className="pointer-events-none absolute end-4.5 top-4.5 font-latin text-[11px] tracking-[0.14em] text-ivory/80">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pt-5.5 pb-6 text-ivory">
                <span dir="ltr" className="mb-2.5 block text-start font-latin text-[10px] tracking-[0.28em] text-gold uppercase">
                  {s.style}
                </span>
                <span className="mb-1.5 block font-display text-[clamp(22px,1.9vw,28px)] font-medium">{s.title[locale]}</span>
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
  locale,
}: {
  featured: Package;
  others: Package[];
  destinations: Map<string, Destination>;
  locale: Locale;
}) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const tp = useTranslations('package');
  const fd = destinations.get(featured.destination)!;
  return (
    <section id="packages" className="bg-ivory pb-[clamp(96px,11vw,168px)]">
      <div className="container-x">
        <div className="mb-[clamp(72px,9vw,128px)] h-px bg-ink/12" />
        <div data-reveal className="mb-[clamp(40px,5vw,72px)] flex flex-wrap items-end justify-between gap-7">
          <div>
            <Eyebrow className="mb-5.5">{t('packagesEyebrow')}</Eyebrow>
            <h2 className="heading-xl m-0 mb-4.5 text-ink">{t('packagesTitle')}</h2>
            <p className="m-0 max-w-[460px] text-[17px] leading-[1.8] text-muted">{t('packagesIntro')}</p>
          </div>
          <Link href="/packages" className="flex items-center gap-3 border-b border-gold pb-2 text-[15px] text-ink">
            {tc('allPackages')} <Arrow />
          </Link>
        </div>

        <div className="no-scrollbar grid snap-x snap-mandatory auto-cols-[86%] grid-flow-col gap-4 overflow-x-auto pb-2 md:auto-cols-auto md:grid-flow-row-dense md:grid-cols-12 md:gap-x-[clamp(20px,2vw,32px)] md:gap-y-[clamp(48px,4vw,64px)] md:overflow-visible md:pb-0">
          <article className="group relative min-h-[560px] snap-start overflow-hidden rounded-[2px] bg-slate-2 md:col-span-12 md:min-h-[620px] lg:col-span-7 lg:row-span-2 lg:min-h-[720px]">
            <span className="absolute inset-0 transition-transform duration-[1600ms] ease-soft group-hover:scale-[1.05]">
              <Photo image={featured.image} locale={locale} sizes="(min-width: 1100px) 58vw, 100vw" />
            </span>
            <span
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(to top,rgba(11,29,38,.96) 0%,rgba(11,29,38,.55) 40%,rgba(11,29,38,0) 68%)' }}
            />
            <div className="pointer-events-none absolute inset-x-6 top-6 flex items-center justify-between">
              {featured.badge && (
                <span className="rounded-[1px] bg-ivory px-3.5 py-[7px] text-[12.5px] text-ink">{featured.badge[locale]}</span>
              )}
              <span dir="ltr" className="font-latin text-[11px] tracking-[0.24em] text-ivory">
                N° 01
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-[clamp(24px,3vw,44px)] text-ivory">
              <div className="mb-3.5 flex items-center gap-3 text-sm text-gold">
                <span>{fd.name[locale]}</span>
                <span className="h-px w-4.5 bg-gold" aria-hidden="true" />
                <span dir="ltr" className="font-latin text-[11px] tracking-[0.26em]">
                  {fd.label}
                </span>
              </div>
              <h3 className="m-0 mb-5 font-display text-[clamp(36px,4.2vw,64px)] leading-[1.08] font-medium tracking-[-0.01em]">
                <Link href={`/packages/${featured.slug}`} className="hover:text-ivory">
                  {featured.title[locale]}
                </Link>
              </h3>
              <div className="mb-6.5 flex flex-wrap gap-x-5.5 gap-y-2.5 text-[14.5px] text-sand">
                <span>
                  <Duration days={featured.days} nights={featured.nights} />
                </span>
                {featured.highlights.map((h) => (
                  <span key={h.en} className="flex gap-5.5">
                    <span className="opacity-40" aria-hidden="true">|</span>
                    {h[locale]}
                  </span>
                ))}
              </div>
              <div className="relative mb-6 h-px bg-ivory/20">
                <div className="absolute start-0 top-0 h-px w-16 bg-gold transition-[width] duration-1000 ease-soft group-hover:w-full" />
              </div>
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <div className="mb-1 text-[13px] text-mist">{tc('from')}</div>
                  <Price value={featured.price} className="text-[clamp(26px,2.4vw,34px)]" />
                </div>
                <div className="flex flex-wrap gap-2.5">
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
  wide: { cell: 'col-span-2 md:col-span-6 lg:col-span-12', title: 'text-[clamp(36px,4vw,60px)]', desc: 'block' },
  mid: { cell: 'col-span-1 md:col-span-3', title: 'text-2xl md:text-[32px]', desc: 'hidden md:block' },
} as const;

export function DestinationsGrid({ destinations, locale }: { destinations: Destination[]; locale: Locale }) {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  return (
    <section id="destinations" className="bg-ink py-[clamp(96px,11vw,168px)] text-ivory">
      <div className="container-x">
        <SectionHeader dark eyebrow={t('destinationsEyebrow')} title={t('destinationsTitle')} intro={t('destinationsIntro')} />
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
                sizes={d.homeLayout === 'mid' ? '(min-width: 1100px) 25vw, 50vw' : '(min-width: 1100px) 50vw, 100vw'}
              />
            </span>
            <span
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(to top,rgba(11,29,38,.9) 0%,rgba(11,29,38,.3) 50%,rgba(11,29,38,.05) 100%)' }}
            />
            <span
              dir="ltr"
              className="pointer-events-none absolute inset-x-5 top-4.5 flex justify-between font-latin text-[10.5px] tracking-[0.22em] text-ivory/78"
            >
              <span>{d.coord}</span>
              <span>{d.label}</span>
            </span>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 p-[clamp(18px,2.4vw,32px)]">
              <span className={`mb-2 block font-display leading-[1.1] font-medium ${l.title}`}>{d.name[locale]}</span>
              <span className={`mb-3.5 max-w-[360px] text-[14.5px] leading-[1.7] text-mist ${l.desc}`}>{d.tagline[locale]}</span>
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
    <section id="services" className="scroll-mt-20 bg-ivory py-[clamp(96px,11vw,168px)]">
      <div className="container-x">
        <div
          data-reveal
          className="mb-[clamp(48px,6vw,88px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-end gap-x-20 gap-y-8"
        >
          <div>
            <Eyebrow className="mb-5.5">{t('servicesEyebrow')}</Eyebrow>
            <h2 className="m-0 font-display text-[clamp(34px,4.6vw,68px)] leading-[1.12] font-medium tracking-[-0.01em] text-balance text-ink">
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
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-x-[clamp(24px,3vw,48px)] p-0">
          {services.map((s, i) => (
            <li key={s.title.en} className="group relative border-t border-ink/14 pt-8 pb-11">
              <div className="absolute start-0 -top-px h-px w-0 bg-gold transition-[width] duration-900 ease-soft group-hover:w-full" />
              <div className="mb-7 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold" aria-hidden="true">
                  <span className="h-[7px] w-[7px] rotate-45 bg-gold" />
                </span>
                <span dir="ltr" className="font-latin text-xs tracking-[0.14em] text-bronze">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="m-0 mb-2.5 font-display text-[22px] font-medium text-ink">{s.title[locale]}</h3>
              <p className="m-0 max-w-[300px] text-[15px] leading-[1.8] text-muted">{s.description[locale]}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CustomTrip({ id = 'custom' }: { id?: string }) {
  const t = useTranslations('home');
  const tw = useTranslations('whatsapp');
  return (
    <section id={id} className="scroll-mt-20 bg-sand py-[clamp(96px,11vw,160px)]">
      <div className="container-x grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-[clamp(48px,7vw,120px)]">
        <div data-reveal>
          <Eyebrow tone="ink" className="mb-6.5">
            {t('customEyebrow')}
          </Eyebrow>
          <p className="m-0 mb-3 font-display text-[clamp(20px,1.8vw,26px)] font-normal text-ink-2">{t('customKicker')}</p>
          <h2 className="m-0 mb-7.5 font-display text-[clamp(44px,6.4vw,104px)] leading-[1.04] font-medium tracking-[-0.015em] text-balance text-ink">
            {t('customTitle')}
          </h2>
          <p className="m-0 mb-7.5 max-w-[460px] text-[17.5px] leading-[1.9] text-muted-2">{t('customIntro')}</p>
          <WhatsAppLink
            text={tw('planTrip')}
            source="custom-trip"
            className="inline-flex items-center gap-2.5 border-b border-ink pb-1.5 text-[15px] text-ink"
          >
            {t('customWhatsapp')} <Arrow />
          </WhatsAppLink>
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
    <section id="offer" className="relative flex min-h-[clamp(600px,88vh,860px)] items-center overflow-hidden bg-ink text-ivory">
      <div data-parallax="0.14" className="absolute inset-x-0 -top-[12%] -bottom-[12%] bg-slate">
        <Photo image={offer.image} locale={locale} sizes="100vw" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 ltr:rotate-180"
        style={{ background: 'linear-gradient(to left,rgba(11,29,38,.92) 0%,rgba(11,29,38,.6) 50%,rgba(11,29,38,.2) 100%)' }}
      />
      <div className="container-x relative z-2 py-[clamp(80px,10vw,120px)]">
        <div data-reveal>
          <div className="mb-7 flex items-center gap-3.5">
            <span className="h-px w-10 bg-gold" aria-hidden="true" />
            <span dir="ltr" className="font-latin text-[11px] font-semibold tracking-[0.32em] text-gold">
              {offer.eyebrow}
            </span>
          </div>
          <h2 className="m-0 mb-6.5 font-display text-[clamp(68px,12vw,196px)] leading-[0.95] font-semibold tracking-[-0.025em]">
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
          <div className="mt-11 text-[13.5px] text-fog">{offer.note[locale]}</div>
        </div>
      </div>
    </section>
  );
}

export function WhyUs({ benefits, locale }: { benefits: Home['benefits']; locale: Locale }) {
  const t = useTranslations('home');
  return (
    <section id="why" className="bg-ivory py-[clamp(96px,11vw,168px)]">
      <div className="container-x">
        <div data-reveal className="mb-[clamp(56px,7vw,100px)]">
          <Eyebrow className="mb-5.5">{t('whyEyebrow')}</Eyebrow>
          <h2 className="m-0 max-w-[14ch] font-display text-[clamp(36px,5.4vw,84px)] leading-[1.08] font-medium tracking-[-0.015em] text-balance text-ink">
            {t('whyTitle')}
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-[clamp(28px,3vw,56px)] gap-y-12">
          {benefits.map((b, i) => (
            <div key={b.title.en} data-reveal className="border-t border-ink pt-6.5">
              <div dir="ltr" className="mb-10 text-start font-latin text-[13px] font-semibold tracking-[0.14em] text-bronze">
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

export function Stories({
  stories,
  destinations,
  locale,
}: {
  stories: { quote: Localized; name: Localized; destination: string; image: ImageData }[];
  destinations: Map<string, Destination>;
  locale: Locale;
}) {
  const t = useTranslations('home');
  return (
    <section id="stories" className="bg-ink-2 pt-[clamp(96px,11vw,168px)] pb-[clamp(120px,13vw,200px)] text-ivory">
      <div className="container-x">
        <SectionHeader
          dark
          eyebrow={t('storiesEyebrow')}
          title={t('storiesTitle')}
          intro={t('storiesIntro')}
          className="mb-[clamp(48px,6vw,88px)]!"
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
              <blockquote className="m-0 mb-5.5 font-display text-[clamp(20px,1.7vw,25px)] leading-[1.6] font-light text-pretty text-ivory">
                <span className="text-gold">&ldquo;</span>
                {s.quote[locale]}
                <span className="text-gold">&rdquo;</span>
              </blockquote>
              <figcaption className="flex items-center gap-3 text-sm text-fog">
                <span className="h-px w-5.5 bg-gold" aria-hidden="true" />
                {s.name[locale]}
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
  return (
    <section
      id="contact"
      className="relative flex min-h-[clamp(640px,92vh,920px)] items-center justify-center overflow-hidden bg-ink text-center text-ivory"
    >
      <div data-parallax="0.14" className="absolute inset-x-0 -top-[12%] -bottom-[12%] bg-slate">
        <Photo image={image} locale={locale} sizes="100vw" />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center,rgba(11,29,38,.55) 0%,rgba(11,29,38,.82) 75%)' }}
      />
      <div data-reveal className="relative z-2 max-w-[980px] px-[clamp(20px,4vw,64px)] py-[120px]">
        <div dir="ltr" className="mb-7 font-latin text-[11px] font-semibold tracking-[0.34em] text-gold">
          {t('finalEyebrow')}
        </div>
        <h2 className="m-0 mb-7 font-display text-[clamp(52px,8vw,128px)] leading-[1.02] font-medium tracking-[-0.02em]">
          {t('finalTitle')}
        </h2>
        <p className="mx-auto mt-0 mb-11 max-w-[480px] text-[clamp(16px,1.4vw,19px)] leading-[1.9] font-light text-mist">
          {t('finalIntro')}
        </p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <a
            href={`tel:${phone}`}
            className="rounded-[1px] bg-gold px-[34px] py-4.5 text-[15.5px] font-medium text-ink transition-colors hover:bg-sand hover:text-ink"
          >
            {t('finalCall')}
          </a>
          <WhatsAppLink
            text={tw('planTrip')}
            source="final-cta"
            className="flex items-center gap-2.5 rounded-[1px] border border-ivory/50 px-[34px] py-4.5 text-[15.5px] text-ivory transition-colors hover:border-ivory hover:text-ivory"
          >
            <span className="h-[7px] w-[7px] rounded-full bg-whatsapp" aria-hidden="true" />
            {tc('whatsapp')}
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}
