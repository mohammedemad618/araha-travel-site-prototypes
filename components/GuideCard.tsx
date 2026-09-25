import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { Guide } from '@/lib/schema';
import { formatDate } from '@/lib/format';
import { Photo } from './ui/Photo';

export function readMinutes(guide: Guide, locale: Locale): number {
  const words = guide.sections.reduce(
    (n, s) => n + s.body[locale].split(/\s+/).length + s.heading[locale].split(/\s+/).length,
    0,
  );
  return Math.max(2, Math.round(words / 200));
}

export function GuideCard({ guide, locale }: { guide: Guide; locale: Locale }) {
  const t = useTranslations('guides');
  return (
    <article className="group relative flex flex-col">
      <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-[2px] bg-slate-2">
        <span className="absolute inset-0 transition-transform duration-[1400ms] ease-soft group-hover:scale-[1.05]">
          <Photo
            image={guide.image}
            locale={locale}
            sizes="(min-width: 1100px) 33vw, (min-width: 760px) 50vw, 100vw"
          />
        </span>
        <span className="absolute start-4 top-4 rounded-[1px] bg-ivory px-3 py-1.5 text-[12.5px] text-ink">
          {t(`category.${guide.category}`)}
        </span>
      </div>
      <div className="mb-2 flex gap-3 text-[13px] text-muted">
        <span>{formatDate(guide.date, locale)}</span>
        <span aria-hidden="true">·</span>
        <span>{t('readTime', { minutes: readMinutes(guide, locale) })}</span>
      </div>
      <h3 className="m-0 mb-3 font-display text-[clamp(21px,1.8vw,26px)] leading-[1.35] font-medium text-ink">
        <Link
          href={`/guides/${guide.slug}`}
          className="after:absolute after:inset-0 after:content-[''] hover:text-bronze"
        >
          {guide.title[locale]}
        </Link>
      </h3>
      <p className="m-0 text-[15px] leading-[1.8] text-muted">{guide.excerpt[locale]}</p>
    </article>
  );
}
