import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import type { Page } from '@/lib/schema';
import { PageHero } from './PageHero';
import { RichText } from './ui/RichText';

/** Long-form page (about, privacy, terms) rendered from content/pages/*.json. */
export async function ContentPage({
  page,
  locale,
  children,
  credits,
}: {
  page: Page;
  locale: Locale;
  children?: React.ReactNode;
  /** Photographer names, listed at #credits (About page only). */
  credits?: string[];
}) {
  const tn = await getTranslations('nav');
  const tf = await getTranslations('footer');
  const tc = await getTranslations('common');
  return (
    <>
      <PageHero
        locale={locale}
        image={page.image}
        eyebrow={page.eyebrow[locale]}
        title={page.title[locale]}
        intro={page.intro[locale]}
        crumbs={[{ label: tn('home'), href: '/' }, { label: page.title[locale] }]}
      />
      <section className="bg-ivory py-[clamp(72px,9vw,128px)]">
        <div className="container-x grid gap-x-20 gap-y-16 lg:grid-cols-2">
          {page.sections.map((s, i) => (
            <article key={s.heading.en} data-reveal className="border-t border-ink pt-7">
              <div
                aria-hidden="true"
                className="mb-6 font-latin text-[13px] font-semibold tracking-[0.14em] text-bronze"
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <h2 className="m-0 mb-4 font-display text-[clamp(24px,2.2vw,32px)] font-medium text-ink">
                {s.heading[locale]}
              </h2>
              <RichText text={s.body[locale]} className="max-w-[620px] text-[16.5px] text-muted" />
            </article>
          ))}
        </div>
        {credits && credits.length > 0 && (
          <div id="credits" className="container-x mt-20 scroll-mt-28">
            <details className="border-t border-ink/15 pt-6">
              <summary className="cursor-pointer text-[15px] text-ink-2">{tf('credits')}</summary>
              <p lang="en" dir="ltr" className="mt-4 text-[13.5px] leading-[1.8] text-muted">
                {tc('photoCredits', { names: credits.join(', ') })}
              </p>
            </details>
          </div>
        )}
      </section>
      {children}
    </>
  );
}
