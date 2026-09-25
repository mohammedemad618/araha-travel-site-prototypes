import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getDestination, getPackages, getVisas } from '@/lib/content';
import { formatDate } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import type { VisaStatus } from '@/lib/constants';
import { PageHero } from '@/components/PageHero';
import { JsonLd } from '@/components/JsonLd';
import { Arrow } from '@/components/ui/Arrow';
import { Icon, WhatsAppGlyph } from '@/components/ui/Icon';
import { WhatsAppLink } from '@/components/WhatsApp';

type Props = { params: Promise<{ locale: Locale }> };

const STATUS_COLOR: Record<VisaStatus, string> = {
  'visa-free': 'bg-[#1f6f4a] text-ivory',
  'on-arrival': 'bg-[#1f6f4a] text-ivory',
  'e-visa': 'bg-bronze text-ivory',
  'visa-required': 'bg-ink text-ivory',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'visa' });
  return pageMetadata({ locale, path: 'visa', title: t('metaTitle'), description: t('metaDescription') });
}

export default async function VisaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('visa');
  const tn = await getTranslations('nav');
  const visas = getVisas();
  const packages = getPackages();

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t('eyebrow')}
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: tn('home'), href: '/' }, { label: tn('visa') }]}
        below={
          <nav aria-label={t('jump')} className="mt-8 flex flex-wrap gap-2">
            {visas.map((v) => (
              <a
                key={v.destination}
                href={`#${v.destination}`}
                className="rounded-[1px] border border-ivory/30 px-3.5 py-2 text-[14px] text-ivory transition-colors hover:border-gold hover:text-gold"
              >
                {getDestination(v.destination)!.name[locale]}
              </a>
            ))}
          </nav>
        }
      />
      <section className="bg-ivory py-[clamp(56px,7vw,104px)]">
        <div className="container-x">
          <p
            role="note"
            className="m-0 mb-12 flex max-w-[860px] items-start gap-3 rounded-[2px] border border-gold/50 bg-sand/50 p-5 text-[15px] leading-[1.85] text-ink-2"
          >
            <Icon name="shield" size={20} className="mt-1 shrink-0 text-bronze" />
            {t('disclaimer')}
          </p>
          <div className="flex flex-col gap-10">
            {visas.map((v) => {
              const dest = getDestination(v.destination)!;
              const pkgCount = packages.filter((p) => p.destination === v.destination).length;
              const facts = [
                { k: t('howToApply'), v: v.howToApply[locale] },
                v.processingTime && { k: t('processing'), v: v.processingTime[locale] },
                v.stay && { k: t('stay'), v: v.stay[locale] },
              ].filter(Boolean) as { k: string; v: string }[];
              return (
                <article
                  key={v.destination}
                  id={v.destination}
                  className="scroll-mt-28 border-t border-ink pt-8"
                  data-reveal
                >
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <h2 className="m-0 font-display text-[clamp(28px,3vw,42px)] font-medium text-ink">
                      {dest.name[locale]}
                    </h2>
                    <span className={`rounded-full px-3.5 py-1 text-[13px] ${STATUS_COLOR[v.status]}`}>
                      {t(`status.${v.status}`)}
                    </span>
                  </div>
                  <p className="m-0 mb-7 max-w-[820px] font-display text-[clamp(18px,1.6vw,22px)] leading-[1.75] font-light text-ink-2">
                    {v.summary[locale]}
                  </p>
                  <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-6">
                      <dl className="m-0 grid gap-5">
                        {facts.map((f) => (
                          <div key={f.k}>
                            <dt className="mb-1 text-[13.5px] font-medium text-bronze">{f.k}</dt>
                            <dd className="m-0 text-[15.5px] leading-[1.85] text-ink-2">{f.v}</dd>
                          </div>
                        ))}
                      </dl>
                      {v.exemptions.length > 0 && (
                        <div>
                          <h3 className="m-0 mb-2 text-[13.5px] font-medium text-bronze">
                            {t('exemptions')}
                          </h3>
                          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px] leading-[1.8] text-ink-2">
                            {v.exemptions.map((x) => (
                              <li key={x.en} className="flex items-start gap-2.5">
                                <Icon name="check" size={16} className="mt-1.5 shrink-0 text-bronze" />
                                {x[locale]}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {v.notes && (
                        <p className="m-0 rounded-[2px] bg-sand/60 p-4 text-[14.5px] leading-[1.8] text-ink-2">
                          <strong className="font-medium">{t('notes')}: </strong>
                          {v.notes[locale]}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-6">
                      {v.documents.length > 0 && (
                        <div className="rounded-[2px] border border-ink/12 p-5">
                          <h3 className="m-0 mb-3 text-[14px] font-medium text-ink">{t('documents')}</h3>
                          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14.5px] leading-[1.7] text-muted">
                            {v.documents.map((x) => (
                              <li key={x.en} className="flex items-start gap-2.5">
                                <span
                                  className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold"
                                  aria-hidden="true"
                                />
                                {x[locale]}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3">
                        <WhatsAppLink
                          text={t('helpMessage', { country: dest.name[locale] })}
                          source={`visa-${v.destination}`}
                          className="inline-flex items-center gap-2 rounded-[1px] bg-ink px-5 py-3 text-[14.5px] text-ivory"
                        >
                          <WhatsAppGlyph size={16} className="text-whatsapp" />
                          {t('helpCta')}
                        </WhatsAppLink>
                        {pkgCount > 0 && (
                          <Link
                            href={`/destinations/${v.destination}`}
                            className="border-b border-gold pb-1 text-[14.5px] text-ink"
                          >
                            {t('packagesFor', { name: dest.name[locale] })} <Arrow />
                          </Link>
                        )}
                      </div>
                      <div className="text-[13px] leading-[1.8] text-muted">
                        <div>{t('lastVerified', { date: formatDate(v.lastVerified, locale) })}</div>
                        {v.officialUrl && (
                          <a
                            href={v.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-gold/60 underline-offset-4"
                          >
                            {t('official')}
                          </a>
                        )}
                        {v.sources.length > 0 && (
                          <details className="mt-1">
                            <summary className="cursor-pointer">{t('sources')}</summary>
                            <ul className="m-0 mt-1 list-none p-0" lang="en" dir="ltr">
                              {v.sources.map((s) => (
                                <li key={s} className="truncate">
                                  <a
                                    href={s}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline underline-offset-2"
                                  >
                                    {new URL(s).hostname}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: visas.map((v) => ({
            '@type': 'Question',
            name:
              locale === 'ar'
                ? `هل يحتاج حامل الجواز العراقي إلى تأشيرة لـ${getDestination(v.destination)!.name.ar}؟`
                : `Do Iraqi passport holders need a visa for ${getDestination(v.destination)!.name.en}?`,
            acceptedAnswer: { '@type': 'Answer', text: v.summary[locale] },
          })),
        }}
      />
    </>
  );
}
