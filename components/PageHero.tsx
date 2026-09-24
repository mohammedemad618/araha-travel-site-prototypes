import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { ImageData } from '@/lib/schema';
import { Photo } from './ui/Photo';

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
}: {
  locale: Locale;
  eyebrow: string;
  title: string;
  intro?: string;
  image?: ImageData;
  crumbs: Crumb[];
  tall?: boolean;
  children?: React.ReactNode;
}) {
  const t = await getTranslations('common');
  return (
    <section
      className={`relative flex flex-col justify-end overflow-hidden bg-ink text-ivory ${
        tall ? 'h-[92svh] min-h-[620px]' : image ? 'min-h-[560px] md:min-h-[640px]' : 'pt-[180px]'
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
                'linear-gradient(to top,rgba(11,29,38,.95) 0%,rgba(11,29,38,.4) 45%,rgba(11,29,38,.25) 70%,rgba(11,29,38,.6) 100%)',
            }}
          />
        </>
      )}
      <div className="container-x relative z-2 flex flex-wrap items-end justify-between gap-9 pt-[140px] pb-[clamp(56px,8vh,96px)]">
        <div className="max-w-[900px]">
          <nav aria-label={t('breadcrumb')} className="mb-7.5">
            <ol className="m-0 flex list-none flex-wrap items-center gap-2.5 p-0 text-[13.5px] text-mist">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-2.5">
                  {i > 0 && <span className="opacity-50" aria-hidden="true">/</span>}
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
          <div className="mb-5.5 flex items-center gap-3.5">
            <span className="h-px w-10 bg-gold" aria-hidden="true" />
            <span dir="ltr" className="font-latin text-[11px] font-semibold tracking-[0.32em] text-gold uppercase">
              {eyebrow}
            </span>
          </div>
          <h1 className="m-0 mb-5 font-display text-[clamp(46px,7vw,112px)] leading-[1.02] font-medium tracking-[-0.02em] text-balance">
            {title}
          </h1>
          {intro && (
            <p className="m-0 max-w-[620px] text-[clamp(16px,1.35vw,19px)] leading-[1.85] font-light text-mist">{intro}</p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
