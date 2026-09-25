import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { Destination, Package } from '@/lib/schema';
import { Photo } from '../ui/Photo';
import { Price } from '../ui/Price';
import { Arrow } from '../ui/Arrow';
import { Check } from 'lucide-react';
import { NextDeparture } from './NextDeparture';
import { WhatsAppLink } from '../WhatsApp';

export type PackageSummary = Pick<
  Package,
  | 'slug'
  | 'title'
  | 'destination'
  | 'styles'
  | 'days'
  | 'nights'
  | 'price'
  | 'priceNote'
  | 'highlights'
  | 'image'
  | 'badge'
>;

export function toSummary(p: Package): PackageSummary {
  const { slug, title, destination, styles, days, nights, price, priceNote, highlights, image, badge } = p;
  return { slug, title, destination, styles, days, nights, price, priceNote, highlights, image, badge };
}

export function Duration({ days, nights }: { days: number; nights: number }) {
  const t = useTranslations('common');
  return <>{t('duration', { days: t('days', { count: days }), nights: t('nights', { count: nights }) })}</>;
}

export function PackageCard({
  pkg,
  destination,
  locale,
  departures = [],
  className = '',
  imageClassName = 'aspect-[4/3]',
  sizes = '(min-width: 1100px) 33vw, (min-width: 760px) 50vw, 86vw',
}: {
  pkg: PackageSummary;
  destination: Pick<Destination, 'name' | 'label'>;
  locale: Locale;
  /** ISO dates of the open departures, soonest first. */
  departures?: string[];
  className?: string;
  imageClassName?: string;
  sizes?: string;
}) {
  const t = useTranslations('common');
  const tp = useTranslations('package');
  const href = `/packages/${pkg.slug}`;
  return (
    <article className={`group relative flex min-w-0 snap-start flex-col ${className}`}>
      <div className={`relative overflow-hidden rounded-[2px] bg-slate-2 ${imageClassName}`}>
        <span className="absolute inset-0 transition-transform duration-[1400ms] ease-soft group-hover:scale-[1.06]">
          <Photo image={pkg.image} locale={locale} sizes={sizes} />
        </span>
        <span className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-start justify-between gap-2">
          {pkg.badge ? (
            <span className="rounded-[1px] bg-ivory px-3 py-1.5 text-[12.5px] text-ink">
              {pkg.badge[locale]}
            </span>
          ) : (
            <span />
          )}
          <span className="rounded-[1px] bg-ink/80 px-3 py-1.5 text-[12.5px] text-ivory">
            <Duration days={pkg.days} nights={pkg.nights} />
          </span>
        </span>
        <NextDeparture
          dates={departures}
          locale={locale}
          className="pointer-events-none absolute start-4 bottom-4 flex items-center gap-1.5 rounded-[1px] bg-ink/80 px-3 py-1.5 text-[12.5px] text-ivory"
        />
      </div>
      <div className="flex flex-1 flex-col pt-5.5">
        <div className="mb-2.5 flex items-center gap-2.5 text-[13.5px] text-bronze">
          <span>{destination.name[locale]}</span>
          {locale === 'ar' && (
            <>
              <span className="h-px w-3.5 bg-bronze" aria-hidden="true" />
              <span
                lang="en"
                dir="ltr"
                aria-hidden="true"
                className="font-latin text-[10.5px] tracking-[0.24em]"
              >
                {destination.label}
              </span>
            </>
          )}
        </div>
        <h3 className="m-0 mb-3 font-display text-[clamp(22px,1.9vw,28px)] font-medium text-ink">
          {/* The stretched link makes the whole card clickable while keeping one tab stop. */}
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] hover:text-bronze">
            {pkg.title[locale]}
          </Link>
        </h3>
        <ul className="m-0 mb-5 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[13.5px] text-muted">
          {pkg.highlights.map((h) => (
            <li key={h.en} className="flex items-center gap-1.5">
              <Check size={14} strokeWidth={1.5} className="text-bronze" aria-hidden="true" />
              {h[locale]}
            </li>
          ))}
        </ul>
        <div className="relative mt-auto mb-4.5 h-px bg-ink/14">
          <div className="absolute start-0 top-0 h-px w-0 bg-gold transition-[width] duration-900 ease-soft group-hover:w-full" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <div className="mb-0.5 text-[12.5px] text-muted">{t('from')}</div>
            <Price
              value={pkg.price}
              className="text-[22px] text-ink"
              unitClassName="text-[13px] text-bronze"
            />
            <div className="text-[12px] text-muted">{pkg.priceNote[locale]}</div>
          </div>
          <div className="relative z-1 flex items-center gap-4 text-sm">
            <WhatsAppLink
              text={tp('waMessage', { title: pkg.title[locale] })}
              source="package-card"
              className="py-2 text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              {t('enquire')}
            </WhatsAppLink>
            <span aria-hidden="true" className="border-b border-gold pt-2 pb-1 text-ink">
              {t('viewDetails')} <Arrow />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
