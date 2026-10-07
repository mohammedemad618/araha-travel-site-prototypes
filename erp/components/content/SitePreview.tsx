'use client';

import { useState } from 'react';
import { Check, Monitor, Smartphone, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { imagePreviewUrl } from './MediaPicker';

// A live picture of the page being edited, drawn in the website's colours and
// layout from the editor's current values (nothing is saved or sent). It is an
// approximation: the real page is built by the website with its own design.

type Json = Record<string, unknown>;
type Lang = 'ar' | 'en';
type Loc = { ar?: string; en?: string } | undefined;

/** Extra facts the preview needs that live outside the page (prices, names). */
export type PreviewExtras = {
  price?: string;
  childPrice?: string;
  days?: number;
  nights?: number;
  departures?: string[];
  destinations?: Record<string, Loc>;
  packages?: Record<string, Loc>;
};

const NAVY = '#0B1D26';
const GOLD = '#C99755';

const pick = (v: unknown, lang: Lang): string => {
  const o = (v ?? {}) as { ar?: string; en?: string };
  return (lang === 'ar' ? o.ar || o.en : o.en || o.ar) || '';
};
const list = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});

/** Paragraphs split by blank lines; lines starting with "- " become bullets (as on the website). */
function Body({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {text.split(/\n\s*\n/).map((block, i) => {
        const lines = block.split('\n').filter(Boolean);
        if (lines.length && lines.every((l) => l.trim().startsWith('- ')))
          return (
            <ul key={i} className="m-0 flex list-disc flex-col gap-1 ps-5">
              {lines.map((l, j) => (
                <li key={j}>{l.trim().slice(2)}</li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="m-0 whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function Img({
  src,
  siteUrl,
  className = '',
  alt = '',
}: {
  src: unknown;
  siteUrl?: string;
  className?: string;
  alt?: string;
}) {
  const url = typeof src === 'string' && src ? imagePreviewUrl(src, siteUrl) : null;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={`object-cover ${className}`} />
  ) : (
    <div className={`bg-[#E8DDCB] ${className}`} />
  );
}

function Hero({
  image,
  siteUrl,
  eyebrow,
  title,
  children,
}: {
  image: unknown;
  siteUrl?: string;
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden" style={{ background: NAVY }}>
      <Img src={obj(image).src} siteUrl={siteUrl} className="absolute inset-0 h-full w-full opacity-60" />
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to top, ${NAVY}, transparent 70%)` }}
      />
      <div className="relative flex min-h-[240px] flex-col justify-end gap-2 p-6 text-[#F7F3EC]">
        {eyebrow && (
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase opacity-90">
            <span className="inline-block h-px w-6" style={{ background: GOLD }} />
            {eyebrow}
          </div>
        )}
        <h1 className="m-0 text-[30px] leading-tight font-semibold">{title || '…'}</h1>
        {children}
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3 px-6 py-5">
    {title && <h2 className="m-0 text-[18px] font-semibold text-[#0B1D26]">{title}</h2>}
    {children}
  </section>
);

function PackagePreview({ v, lang, siteUrl, x, t }: Ctx) {
  const facts = obj(v.facts);
  return (
    <>
      <Hero
        image={v.image}
        siteUrl={siteUrl}
        eyebrow={pick(x.destinations?.[String(v.destination)], lang) || String(v.destination ?? '')}
        title={pick(v.title, lang)}
      >
        <div className="mt-2 flex flex-wrap items-end gap-4">
          {x.price && (
            <div>
              <div className="text-[12px] opacity-80">{t('preview.from')}</div>
              <div className="text-[24px] font-semibold">
                {x.price} <span style={{ color: GOLD }}>{t('preview.iqd')}</span>
              </div>
              <div className="text-[12px] opacity-80">{pick(v.priceNote, lang)}</div>
            </div>
          )}
          {pick(v.badge, lang) && (
            <span
              className="rounded-full px-3 py-1 text-[12px] font-semibold text-[#0B1D26]"
              style={{ background: GOLD }}
            >
              {pick(v.badge, lang)}
            </span>
          )}
        </div>
      </Hero>
      {x.days !== undefined && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-[#E8DDCB] px-6 py-3 text-[13px] text-[#0B1D26]/80">
          <span>{t('preview.duration', { days: x.days, nights: x.nights ?? 0 })}</span>
          {x.departures?.length ? (
            <span>{t('preview.nextDates', { dates: x.departures.slice(0, 3).join(' · ') })}</span>
          ) : null}
        </div>
      )}
      <Section>
        <p className="m-0 text-[17px] leading-relaxed text-[#0B1D26]">{pick(v.lead, lang)}</p>
        <Body text={pick(v.overview, lang)} className="text-[14px] leading-relaxed text-[#0B1D26]/80" />
        <div className="flex flex-wrap gap-2">
          {list(v.highlights).map((h, i) => (
            <span key={i} className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-[12.5px]">
              {pick(h, lang)}
            </span>
          ))}
        </div>
      </Section>
      <Section title={t('preview.facts')}>
        <dl className="m-0 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
          {(['route', 'stay', 'flights', 'season', 'group'] as const).map((k) => (
            <div key={k} className="rounded-lg bg-white p-3">
              <dt className="text-[11px] tracking-wide text-[#0B1D26]/55 uppercase">
                {t(`website.f.${k === 'group' ? 'groupSize' : k}`)}
              </dt>
              <dd className="m-0 mt-1 font-medium">{pick(facts[k], lang) || '—'}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title={t('website.f.itinerary')}>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {list(v.itinerary).map((d, i) => (
            <li key={i} className="flex gap-3 rounded-lg bg-white p-4">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-[#F7F3EC]"
                style={{ background: NAVY }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="font-semibold">{pick(d.title, lang)}</div>
                <Body text={pick(d.description, lang)} className="mt-1 text-[13.5px] text-[#0B1D26]/75" />
                {list(d.tags).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {list(d.tags).map((tag, j) => (
                      <span key={j} className="rounded bg-[#F7F3EC] px-2 py-0.5 text-[11.5px]">
                        {pick(tag, lang)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Section>
      <Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="m-0 mb-2 text-[15px] font-semibold">{t('website.f.included')}</h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13.5px]">
              {list(v.includes).map((it, i) => (
                <li key={i} className="flex gap-2">
                  <Check size={15} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
                  {pick(it, lang)}
                </li>
              ))}
            </ul>
          </div>
          {list(v.excludes).length > 0 && (
            <div>
              <h3 className="m-0 mb-2 text-[15px] font-semibold">{t('website.f.excluded')}</h3>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13.5px] text-[#0B1D26]/70">
                {list(v.excludes).map((it, i) => (
                  <li key={i} className="flex gap-2">
                    <X size={15} className="mt-0.5 shrink-0" />
                    {pick(it, lang)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>
      {list(v.gallery).length > 0 && (
        <Section title={t('website.f.gallery')}>
          <div className="grid grid-cols-3 gap-2">
            {list(v.gallery).map((g, i) => (
              <Img
                key={i}
                src={g.src}
                siteUrl={siteUrl}
                alt={pick(g.alt, lang)}
                className="aspect-[4/3] w-full rounded-md"
              />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function DestinationPreview({ v, lang, siteUrl, t }: Ctx) {
  const glance = obj(v.glance);
  return (
    <>
      <Hero
        image={v.image}
        siteUrl={siteUrl}
        eyebrow={`${v.label ?? ''} · ${v.coord ?? ''}`}
        title={pick(v.name, lang)}
      >
        <p className="m-0 text-[15px] opacity-90">{pick(v.tagline, lang)}</p>
      </Hero>
      <Section>
        <Body text={pick(v.description, lang)} className="text-[14.5px] leading-relaxed" />
        <p className="m-0 text-[13.5px]">
          <strong>{t('website.f.bestSeason')}:</strong> {pick(v.bestSeason, lang)}
        </p>
      </Section>
      <Section title={t('website.f.glance')}>
        <dl className="m-0 grid grid-cols-2 gap-3 text-[13px]">
          {(['flightTime', 'currency', 'language', 'timeDifference'] as const).map((k) =>
            pick(glance[k], lang) ? (
              <div key={k} className="rounded-lg bg-white p-3">
                <dt className="text-[11px] text-[#0B1D26]/55">{t(`website.f.${k}`)}</dt>
                <dd className="m-0 mt-1 font-medium">{pick(glance[k], lang)}</dd>
              </div>
            ) : null,
          )}
        </dl>
      </Section>
    </>
  );
}

const VISA_TONE: Record<string, string> = {
  'visa-free': '#2f7d4f',
  'on-arrival': '#2f6f9f',
  'e-visa': GOLD,
  'visa-required': '#a3412f',
};

function VisaPreview({ v, lang, x, contentKey, t }: Ctx) {
  const status = String(v.status ?? '');
  const docs = list(v.documents);
  const exemptions = list(v.exemptions);
  return (
    <Section>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[20px] font-semibold">
            {pick(x.destinations?.[contentKey], lang) || contentKey}
          </h2>
          <span
            className="rounded-full px-3 py-1 text-[12px] font-semibold text-white"
            style={{ background: VISA_TONE[status] ?? NAVY }}
          >
            {t(`website.visaStatuses.${status}`)}
          </span>
        </div>
        <Body text={pick(v.summary, lang)} className="mt-3 text-[14px]" />
        <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
          {pick(v.processingTime, lang) && (
            <div>
              <div className="text-[11px] text-[#0B1D26]/55">{t('website.f.processingTime')}</div>
              {pick(v.processingTime, lang)}
            </div>
          )}
          {pick(v.stay, lang) && (
            <div>
              <div className="text-[11px] text-[#0B1D26]/55">{t('website.f.visaStay')}</div>
              {pick(v.stay, lang)}
            </div>
          )}
        </div>
        <h3 className="m-0 mt-4 text-[14px] font-semibold">{t('website.f.howToApply')}</h3>
        <Body text={pick(v.howToApply, lang)} className="mt-1 text-[13.5px]" />
        {docs.length > 0 && (
          <>
            <h3 className="m-0 mt-4 text-[14px] font-semibold">{t('website.f.documents')}</h3>
            <ul className="m-0 mt-1 list-disc ps-5 text-[13.5px]">
              {docs.map((d, i) => (
                <li key={i}>{pick(d, lang)}</li>
              ))}
            </ul>
          </>
        )}
        {exemptions.length > 0 && (
          <>
            <h3 className="m-0 mt-4 text-[14px] font-semibold">{t('website.f.exemptions')}</h3>
            <ul className="m-0 mt-1 list-disc ps-5 text-[13.5px]">
              {exemptions.map((d, i) => (
                <li key={i}>{pick(d, lang)}</li>
              ))}
            </ul>
          </>
        )}
        <Body text={pick(v.notes, lang)} className="mt-4 text-[13px] text-[#0B1D26]/70" />
        <p className="m-0 mt-4 text-[12px] text-[#0B1D26]/55">
          {t('website.f.lastVerified')}: <span dir="ltr">{String(v.lastVerified ?? '')}</span>
        </p>
      </div>
    </Section>
  );
}

function ArticlePreview({ v, lang, siteUrl, t, kind }: Ctx) {
  const isGuide = kind === 'guide';
  return (
    <>
      {isGuide || obj(v.image).src ? (
        <Hero
          image={v.image}
          siteUrl={siteUrl}
          eyebrow={isGuide ? t(`website.guideCategories.${String(v.category)}`) : pick(v.eyebrow, lang)}
          title={pick(v.title, lang)}
        >
          {isGuide && (
            <span className="text-[12px] opacity-80" dir="ltr">
              {String(v.date ?? '')}
            </span>
          )}
        </Hero>
      ) : (
        <div className="px-6 pt-8">
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: GOLD }}>
            {pick(v.eyebrow, lang)}
          </div>
          <h1 className="m-0 mt-2 text-[30px] font-semibold text-[#0B1D26]">{pick(v.title, lang) || '…'}</h1>
        </div>
      )}
      <Section>
        <p className="m-0 text-[16px] leading-relaxed">{pick(isGuide ? v.excerpt : v.intro, lang)}</p>
        {list(v.sections).map((s, i) => (
          <div key={i} className="mt-2">
            <h2 className="m-0 mb-2 text-[18px] font-semibold">{pick(s.heading, lang)}</h2>
            <Body text={pick(s.body, lang)} className="text-[14px] leading-relaxed text-[#0B1D26]/85" />
          </div>
        ))}
      </Section>
    </>
  );
}

function FaqPreview({ v, lang, t }: Ctx) {
  return (
    <Section title={t('website.tabs.faq')}>
      {list(v.items).map((q, i) => (
        <details key={i} className="rounded-lg bg-white p-4" open={i === 0}>
          <summary className="cursor-pointer font-semibold">{pick(q.question, lang) || '…'}</summary>
          <Body text={pick(q.answer, lang)} className="mt-2 text-[13.5px] text-[#0B1D26]/80" />
        </details>
      ))}
    </Section>
  );
}

function TestimonialsPreview({ v, lang, siteUrl, x, t }: Ctx) {
  return (
    <Section title={t('website.tabs.testimonials')}>
      <div className="grid gap-3 sm:grid-cols-2">
        {list(v.items).map((r, i) => (
          <figure key={i} className={`m-0 rounded-xl bg-white p-4 ${r.verified ? '' : 'opacity-45'}`}>
            <div className="flex items-center gap-3">
              <Img src={obj(r.image).src} siteUrl={siteUrl} className="h-11 w-11 rounded-full" />
              <div>
                <figcaption className="font-semibold">{pick(r.name, lang)}</figcaption>
                <div className="text-[12px] text-[#0B1D26]/60">
                  {pick(x.destinations?.[String(r.destination)], lang)}
                </div>
              </div>
            </div>
            <blockquote className="m-0 mt-3 text-[13.5px]">“{pick(r.quote, lang)}”</blockquote>
            {!r.verified && (
              <p className="m-0 mt-2 text-[11.5px] font-semibold text-[#a3412f]">{t('preview.notShown')}</p>
            )}
          </figure>
        ))}
      </div>
    </Section>
  );
}

function HomePreview({ v, lang, siteUrl, x, t }: Ctx) {
  const hero = obj(v.hero);
  const lines = list(hero.headline);
  const slides = list(hero.slides);
  const offer = obj(v.offer);
  return (
    <>
      <Hero
        image={obj(slides[0]).image}
        siteUrl={siteUrl}
        eyebrow={String(hero.eyebrow ?? '')}
        title={pick(lines[0], lang)}
      >
        <div className="text-[30px] leading-tight font-semibold" style={{ color: GOLD }}>
          {pick(lines[1], lang)}
        </div>
        <p className="m-0 max-w-md text-[14px] opacity-90">{pick(hero.intro, lang)}</p>
        {slides.length > 1 && (
          <div className="mt-2 flex gap-2">
            {slides.map((s, i) => (
              <span key={i} className="rounded bg-white/15 px-2 py-0.5 text-[11.5px]">
                {pick(s.place, lang)}
              </span>
            ))}
          </div>
        )}
      </Hero>
      {list(v.trustPoints).length > 0 && (
        <div className="grid grid-cols-2 gap-2 px-6 py-4 sm:grid-cols-4">
          {list(v.trustPoints).map((p, i) => (
            <div key={i} className="rounded-lg bg-white p-3 text-[12.5px]">
              <div className="font-semibold">{pick(p.title, lang)}</div>
              <div className="text-[#0B1D26]/65">{pick(p.description, lang)}</div>
            </div>
          ))}
        </div>
      )}
      <Section title={t('website.f.travelStyles')}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {list(v.styles).map((s, i) => (
            <div key={i} className="relative overflow-hidden rounded-lg">
              <Img src={obj(s.image).src} siteUrl={siteUrl} className="aspect-[4/3] w-full" />
              <div
                className="absolute inset-x-0 bottom-0 p-2 text-[13px] font-semibold text-white"
                style={{ background: `linear-gradient(to top, ${NAVY}cc, transparent)` }}
              >
                {pick(s.title, lang)}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title={t('website.f.featured')}>
        <p className="m-0 text-[14px]">
          {pick(x.packages?.[String(v.featuredPackage)], lang) || String(v.featuredPackage ?? '')}
        </p>
      </Section>
      <Section title={t('website.f.servicesSection')}>
        <div className="grid gap-2 sm:grid-cols-2">
          {list(v.services).map((s, i) => (
            <div key={i} className="rounded-lg bg-white p-3 text-[13px]">
              <div className="font-semibold">{pick(s.title, lang)}</div>
              <div className="text-[#0B1D26]/70">{pick(s.description, lang)}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title={t('website.f.benefits')}>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13.5px]">
          {list(v.benefits).map((b, i) => (
            <li key={i}>
              <strong>{pick(b.title, lang)}</strong> — {pick(b.description, lang)}
            </li>
          ))}
        </ul>
      </Section>
      <div className="mx-6 mb-5 overflow-hidden rounded-xl text-[#F7F3EC]" style={{ background: NAVY }}>
        <div className="grid sm:grid-cols-2">
          <div className="flex flex-col gap-1 p-5">
            <div className="text-[11px] tracking-[0.18em] uppercase" style={{ color: GOLD }}>
              {String(offer.eyebrow ?? '')}
            </div>
            <div className="text-[20px] font-semibold">{pick(offer.title, lang)}</div>
            <div className="text-[13px] opacity-85">{pick(offer.route, lang)}</div>
            <div className="text-[12px] opacity-70">{pick(offer.note, lang)}</div>
            <div className="mt-1 text-[12px]" style={{ color: GOLD }}>
              {pick(x.packages?.[String(offer.package)], lang)}
            </div>
          </div>
          <Img src={obj(offer.image).src} siteUrl={siteUrl} className="h-full min-h-[140px] w-full" />
        </div>
      </div>
    </>
  );
}

function SitePreviewCard({ v, lang, t }: Ctx) {
  const trust = obj(v.trust);
  const social = obj(v.social);
  return (
    <div className="px-6 py-6 text-[#F7F3EC]" style={{ background: NAVY }}>
      <div className="text-[22px] font-semibold">{pick(v.name, lang)}</div>
      <div className="text-[13px]" style={{ color: GOLD }}>
        {pick(v.tagline, lang)}
      </div>
      <p className="m-0 mt-3 max-w-lg text-[13px] opacity-80">{pick(v.description, lang)}</p>
      <dl className="m-0 mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
        {[
          [t('website.f.phoneDisplay'), String(v.phoneDisplay ?? '')],
          [t('website.f.whatsappDisplay'), String(v.whatsappDisplay ?? '')],
          [t('website.f.email'), String(v.email ?? '')],
          [t('website.f.address'), pick(v.address, lang)],
          [t('website.f.hoursText'), pick(v.hours, lang)],
          [t('website.f.license'), pick(v.license, lang)],
        ]
          .map(([k, val]) => [k ?? '', val ?? ''] as const)
          .filter(([, val]) => val)
          .map(([k, val]) => (
            <div key={k}>
              <dt className="text-[11px] opacity-60">{k}</dt>
              <dd className="m-0" dir={/^[+\d\s()@.\-a-z]+$/i.test(val) ? 'ltr' : undefined}>
                {val}
              </dd>
            </div>
          ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
        {Object.entries(social)
          .filter(([, url]) => url)
          .map(([name]) => (
            <span key={name} className="rounded-full border border-white/25 px-3 py-1 capitalize">
              {name}
            </span>
          ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-[12.5px]" style={{ color: GOLD }}>
        {trust.since ? <span>{t('preview.since', { year: String(trust.since) })}</span> : null}
        {trust.travellers ? <span>{t('preview.travellers', { n: String(trust.travellers) })}</span> : null}
        {trust.googleRating ? <span>★ {String(trust.googleRating)}</span> : null}
      </div>
    </div>
  );
}

type Ctx = {
  v: Json;
  lang: Lang;
  siteUrl?: string;
  x: PreviewExtras;
  contentKey: string;
  kind: string;
  t: ReturnType<typeof useI18n>['t'];
};

const RENDER: Record<string, (c: Ctx) => React.ReactNode> = {
  package: PackagePreview,
  destination: DestinationPreview,
  visa: VisaPreview,
  guide: ArticlePreview,
  page: ArticlePreview,
  faq: FaqPreview,
  testimonials: TestimonialsPreview,
  home: HomePreview,
  site: SitePreviewCard,
};

/** The preview frame with language and device switches. */
export function SitePreview({
  kind,
  contentKey,
  value,
  extras,
  siteUrl,
}: {
  kind: string;
  contentKey: string;
  value: Json;
  extras: PreviewExtras;
  siteUrl?: string;
}) {
  const { t, lang: uiLang } = useI18n();
  const [lang, setLang] = useState<Lang>(uiLang === 'en' ? 'en' : 'ar');
  const [mobile, setMobile] = useState(false);
  const Render = RENDER[kind];
  const toggle = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-[12.5px] ${active ? 'bg-ink text-white' : 'text-muted hover:bg-ink/6'}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-semibold">{t('preview.title')}</div>
        <div className="flex items-center gap-1" role="group" aria-label={t('preview.language')}>
          <button
            type="button"
            className={toggle(lang === 'ar')}
            aria-pressed={lang === 'ar'}
            onClick={() => setLang('ar')}
          >
            العربية
          </button>
          <button
            type="button"
            className={toggle(lang === 'en')}
            aria-pressed={lang === 'en'}
            onClick={() => setLang('en')}
          >
            English
          </button>
          <span className="mx-1 h-4 w-px bg-line" />
          <button
            type="button"
            className={toggle(!mobile)}
            aria-pressed={!mobile}
            aria-label={t('preview.desktop')}
            onClick={() => setMobile(false)}
          >
            <Monitor size={15} />
          </button>
          <button
            type="button"
            className={toggle(mobile)}
            aria-pressed={mobile}
            aria-label={t('preview.mobile')}
            onClick={() => setMobile(true)}
          >
            <Smartphone size={15} />
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-[#F7F3EC]">
        <div
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          lang={lang}
          data-testid="site-preview"
          className={`mx-auto bg-[#F7F3EC] text-[#0B1D26] transition-[max-width] ${mobile ? 'max-w-[390px] border-x border-[#E8DDCB]' : 'max-w-none'}`}
        >
          {Render ? (
            <Render
              v={value}
              lang={lang}
              siteUrl={siteUrl}
              x={extras}
              contentKey={contentKey}
              kind={kind}
              t={t}
            />
          ) : null}
        </div>
      </div>
      <p className="m-0 text-[12px] text-faint">{t('preview.note')}</p>
    </div>
  );
}
