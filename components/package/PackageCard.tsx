import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { Destination, Package } from '@/lib/schema';

export type PackageSummary = Pick<
  Package,
  'slug' | 'title' | 'destination' | 'styles' | 'days' | 'nights' | 'price' | 'highlights' | 'image'
>;

export function toSummary(p: Package): PackageSummary {
  const { slug, title, destination, styles, days, nights, price, highlights, image } = p;
  return { slug, title, destination, styles, days, nights, price, highlights, image };
}
import { Photo } from '../ui/Photo';
import { Price } from '../ui/Price';
import { Arrow } from '../ui/Arrow';
import { WhatsAppLink } from '../WhatsApp';

export function Duration({ days, nights }: { days: number; nights: number }) {
  const t = useTranslations('common');
  return <>{t('duration', { days: t('days', { count: days }), nights: t('nights', { count: nights }) })}</>;
}

export function PackageCard({
  pkg,
  destination,
  locale,
  className = '',
  imageClassName = 'aspect-[4/3]',
  sizes = '(min-width: 1100px) 33vw, (min-width: 760px) 50vw, 86vw',
}: {
  pkg: PackageSummary;
  destination: Pick<Destination, 'name' | 'label'>;
  locale: Locale;
  className?: string;
  imageClassName?: string;
  sizes?: string;
}) {
  const t = useTranslations('common');
  const tp = useTranslations('package');
  const href = `/packages/${pkg.slug}`;
  return (
    <article className={`group flex min-w-0 snap-start flex-col ${className}`}>
      <Link href={href} className={`relative block overflow-hidden rounded-[2px] bg-slate-2 ${imageClassName}`} tabIndex={-1} aria-hidden="true">
        <span className="absolute inset-0 transition-transform duration-[1400ms] ease-soft group-hover:scale-[1.06]">
          <Photo image={pkg.image} locale={locale} sizes={sizes} />
        </span>
        <span className="pointer-events-none absolute end-4 top-4 rounded-[1px] bg-ink/78 px-3 py-1.5 text-[12.5px] text-ivory">
          <Duration days={pkg.days} nights={pkg.nights} />
        </span>
      </Link>
      <div className="flex flex-1 flex-col pt-5.5">
        <div className="mb-2.5 flex items-center gap-2.5 text-[13.5px] text-bronze">
          <span>{destination.name[locale]}</span>
          <span className="h-px w-3.5 bg-bronze" aria-hidden="true" />
          <span dir="ltr" className="font-latin text-[10.5px] tracking-[0.24em]">
            {destination.label}
          </span>
        </div>
        <h3 className="m-0 mb-2.5 font-display text-[clamp(22px,1.9vw,28px)] font-medium text-ink">
          <Link href={href} className="hover:text-bronze">
            {pkg.title[locale]}
          </Link>
        </h3>
        <p className="m-0 mb-5 text-[14.5px] leading-[1.7] text-muted">
          {pkg.highlights.map((h) => h[locale]).join(' · ')}
        </p>
        <div className="relative mt-auto mb-4.5 h-px bg-ink/14">
          <div className="absolute start-0 top-0 h-px w-0 bg-gold transition-[width] duration-900 ease-soft group-hover:w-full" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <div className="mb-0.5 text-[12.5px] text-muted">{t('from')}</div>
            <Price value={pkg.price} className="text-[22px] text-ink" unitClassName="text-[13px] text-bronze" />
          </div>
          <div className="flex items-center gap-4 text-sm transition-opacity duration-500 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
            <WhatsAppLink
              text={tp('waMessage', { title: pkg.title[locale] })}
              source="package-card"
              className="py-2 text-muted hover:text-ink"
            >
              {t('enquire')}
            </WhatsAppLink>
            <Link href={href} className="border-b border-gold pt-2 pb-1 text-ink">
              {t('viewDetails')} <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
