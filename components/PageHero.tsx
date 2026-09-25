import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { ImageData } from '@/lib/schema';
import { Photo } from './ui/Photo';
import { isLatin } from './ui/En';

export type Crumb = { label: string; href?: string };

/** Dark banner used at the top of every inner page (keeps the transparent header readable). */
export async function PageHero({
  locale,
  eyebrow,
  title,
  intro,
  image,
  crumbs,
  tall = false,
  children,
  below,
}: {
  locale: Locale;
  eyebrow: string;
  title: string;
  intro?: string;
  image?: ImageData;
  crumbs: Crumb[];
  tall?: boolean;
  /** Rendered at the end of the hero row (e.g. the price block). */
  children?: React.ReactNode;
  /** Rendered under the title block (e.g. filter chips or a photo-count button). */
  below?: React.ReactNode;
}) {
  const t = await getTranslations('common');
  const latin = isLatin(eyebrow);
  return (
    <section
      className={`relative flex flex-col justify-end overflow-hidden bg-ink text-ivory ${
        tall ? 'min-h-[max(620px,92svh)]' : image ? 'min-h-[520px] md:min-h-[600px]' : 'brand-pattern'
      }`}
    >
      {image && (
        <>
          <div data-parallax="0.16" className="absolute inset-x-0 -top-[10%] -bottom-[10%] bg-slate">
            <Photo image={image} locale={locale} sizes="100vw" priority />
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to top,rgba(11,29,38,.95) 0%,rgba(11,29,38,.45) 45%,rgba(11,29,38,.3) 70%,rgba(11,29,38,.65) 100%)',
            }}
          />
        </>
      )}
      <div
        className={`container-x relative z-2 flex flex-wrap items-end justify-between gap-9 ${
          image ? 'pt-[140px] pb-[clamp(48px,8vh,96px)]' : 'pt-[128px] pb-12 md:pt-[160px] md:pb-16'
        }`}
      >
        <div className="max-w-[900px]">
          <nav aria-label={t('breadcrumb')} className="mb-6">
            <ol className="m-0 flex list-none flex-wrap items-center gap-2.5 p-0 text-[13.5px] text-mist">
              {crumbs.map((c, i) => (
                <li key={`${i}-${c.label}`} className="flex items-center gap-2.5">
                  {i > 0 && (
                    <span className="opacity-50" aria-hidden="true">
                      /
                    </span>
                  )}
                  {c.href ? (
                    <Link href={c.href} className="text-mist hover:text-gold">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-ivory">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="mb-5 flex items-center gap-3.5">
            <span className="h-px w-10 shrink-0 bg-gold" aria-hidden="true" />
            <span {...(latin ? { lang: 'en', dir: 'ltr' as const } : {})} className="eyebrow text-sand">
              {eyebrow}
            </span>
          </div>
          <h1
            className={`m-0 mb-5 font-display leading-[1.04] font-medium tracking-[-0.02em] text-balance ${
              image ? 'text-[clamp(44px,7vw,112px)]' : 'text-[clamp(38px,5.2vw,76px)]'
            }`}
          >
            {title}
          </h1>
          {intro && (
            <p className="m-0 max-w-[640px] text-[clamp(16px,1.35vw,19px)] leading-[1.85] text-mist">
              {intro}
            </p>
          )}
          {below}
        </div>
        {children}
      </div>
    </section>
  );
}
