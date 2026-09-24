import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getFaqs } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { JsonLd } from '@/components/JsonLd';
import { OpenWhatsAppButton } from '@/components/WhatsApp';
import { Arrow } from '@/components/ui/Arrow';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });
  return pageMetadata({ locale, path: 'faq', title: t('metaTitle'), description: t('metaDescription') });
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('faq');
  const tn = await getTranslations('nav');
  const faqs = getFaqs();

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t('eyebrow')}
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: tn('home'), href: '/' }, { label: tn('faq') }]}
      />
      <section className="bg-ivory py-[clamp(72px,9vw,128px)]">
        <div className="container-x grid items-start gap-16 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border-t border-ink">
            {faqs.map((f) => (
              <details key={f.question.en} className="group border-b border-ink/14">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6.5 font-display text-[clamp(19px,1.7vw,24px)] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.question[locale]}
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/25 text-lg leading-none transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="m-0 max-w-[720px] pb-7.5 text-base leading-[1.95] text-muted">{f.answer[locale]}</p>
              </details>
            ))}
          </div>
          <aside className="rounded-[2px] bg-ink p-8 text-ivory lg:sticky lg:top-[104px]">
            <h2 className="m-0 mb-6 font-display text-[26px] font-medium">{t('more')}</h2>
            <OpenWhatsAppButton className="flex w-full items-center justify-between rounded-[1px] bg-gold px-5 py-4 text-[15.5px] font-medium text-ink">
              {tn('contact')} <Arrow />
            </OpenWhatsAppButton>
          </aside>
        </div>
      </section>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.question[locale],
            acceptedAnswer: { '@type': 'Answer', text: f.answer[locale] },
          })),
        }}
      />
    </>
  );
}
