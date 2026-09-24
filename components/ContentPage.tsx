import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import type { Page } from '@/lib/schema';
import { PageHero } from './PageHero';

/** Long-form page (about, privacy, terms) rendered from content/pages/*.json. */
export async function ContentPage({ page, locale, children }: { page: Page; locale: Locale; children?: React.ReactNode }) {
  const tn = await getTranslations('nav');
  return (
    <>
      <PageHero
        locale={locale}
        image={page.image}
        eyebrow={page.eyebrow}
        title={page.title[locale]}
        intro={page.intro[locale]}
        crumbs={[{ label: tn('home'), href: '/' }, { label: page.title[locale] }]}
      />
      <section className="bg-ivory py-[clamp(72px,9vw,128px)]">
        <div className="container-x grid gap-x-20 gap-y-16 lg:grid-cols-2">
          {page.sections.map((s, i) => (
            <article key={s.heading.en} data-reveal className="border-t border-ink pt-7">
              <div dir="ltr" className="mb-8 text-start font-latin text-[13px] font-semibold tracking-[0.14em] text-bronze rtl:text-end">
                {String(i + 1).padStart(2, '0')}
              </div>
              <h2 className="m-0 mb-4 font-display text-[clamp(24px,2.2vw,32px)] font-medium text-ink">{s.heading[locale]}</h2>
              <div className="prose-ariha max-w-[620px] text-[16.5px] text-muted">
                {s.body[locale].split(/\n{2,}/).map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      {children}
    </>
  );
}
