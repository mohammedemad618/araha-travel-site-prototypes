'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { Destination } from '@/lib/schema';
import { travelStyles, type TravelStyle } from '@/lib/constants';
import { PackageCard, type PackageSummary } from './PackageCard';
import { OpenWhatsAppButton } from '../WhatsApp';
import { Link } from '@/i18n/navigation';

type Budget = 'any' | 'under1' | '1to2' | 'over2';
type Length = 'any' | 'short' | 'mid' | 'long';
type Filters = { destination: string; style: TravelStyle | 'any'; budget: Budget; length: Length };
const EMPTY: Filters = { destination: 'any', style: 'any', budget: 'any', length: 'any' };

const inBudget = (price: number, b: Budget) =>
  b === 'any' || (b === 'under1' && price < 1_000_000) || (b === '1to2' && price >= 1_000_000 && price <= 2_000_000) || (b === 'over2' && price > 2_000_000);
const inLength = (days: number, l: Length) =>
  l === 'any' || (l === 'short' && days <= 5) || (l === 'mid' && days >= 6 && days <= 7) || (l === 'long' && days >= 8);

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[1px] border px-3.5 py-2 text-[13.5px] transition-colors ${
        active ? 'border-ink bg-ink text-ivory' : 'border-ink/18 text-ink-2 hover:border-ink/50'
      }`}
    >
      {children}
    </button>
  );
}

export function PackagesExplorer({
  packages,
  destinations,
}: {
  packages: PackageSummary[];
  destinations: Pick<Destination, 'slug' | 'name' | 'label'>[];
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations('packages');
  const tc = useTranslations('common');
  const destMap = useMemo(() => new Map(destinations.map((d) => [d.slug, d])), [destinations]);
  const [f, setF] = useState<Filters>(EMPTY);

  // Filters are mirrored in the URL (?style=family&destination=turkey) so they can be shared.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const style = q.get('style');
    setF({
      destination: q.get('destination') && destMap.has(q.get('destination')!) ? q.get('destination')! : 'any',
      style: travelStyles.includes(style as TravelStyle) ? (style as TravelStyle) : 'any',
      budget: (['under1', '1to2', 'over2'].includes(q.get('budget') ?? '') ? q.get('budget') : 'any') as Budget,
      length: (['short', 'mid', 'long'].includes(q.get('length') ?? '') ? q.get('length') : 'any') as Length,
    });
  }, [destMap]);

  const update = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    setF(next);
    const q = new URLSearchParams();
    (Object.entries(next) as [string, string][]).forEach(([k, v]) => v !== 'any' && q.set(k, v));
    const qs = q.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  };

  const results = packages.filter(
    (p) =>
      (f.destination === 'any' || p.destination === f.destination) &&
      (f.style === 'any' || p.styles.includes(f.style)) &&
      inBudget(p.price, f.budget) &&
      inLength(p.days, f.length),
  );
  const dirty = JSON.stringify(f) !== JSON.stringify(EMPTY);
  const label = 'mb-3 block font-latin text-[10.5px] tracking-[0.26em] text-bronze uppercase';

  return (
    <div>
      <div className="mb-14 grid gap-8 border-b border-ink/12 pb-10 lg:grid-cols-[1.3fr_1.3fr_1fr_1fr]">
        <fieldset className="m-0 border-0 p-0">
          <legend className={label}>{t('filterDestination')}</legend>
          <div className="flex flex-wrap gap-2">
            <Chip active={f.destination === 'any'} onClick={() => update({ destination: 'any' })}>
              {t('any')}
            </Chip>
            {destinations.map((d) => (
              <Chip key={d.slug} active={f.destination === d.slug} onClick={() => update({ destination: d.slug })}>
                {d.name[locale]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 border-0 p-0">
          <legend className={label}>{t('filterStyle')}</legend>
          <div className="flex flex-wrap gap-2">
            <Chip active={f.style === 'any'} onClick={() => update({ style: 'any' })}>
              {t('any')}
            </Chip>
            {travelStyles.map((s) => (
              <Chip key={s} active={f.style === s} onClick={() => update({ style: s })}>
                {t(`styles.${s}`)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 border-0 p-0">
          <legend className={label}>{t('filterBudget')}</legend>
          <div className="flex flex-wrap gap-2">
            {(['any', 'under1', '1to2', 'over2'] as const).map((b) => (
              <Chip key={b} active={f.budget === b} onClick={() => update({ budget: b })}>
                {b === 'any' ? t('any') : t(b === 'under1' ? 'budgetUnder1' : b === '1to2' ? 'budget1to2' : 'budgetOver2')}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 border-0 p-0">
          <legend className={label}>{t('filterDuration')}</legend>
          <div className="flex flex-wrap gap-2">
            {(['any', 'short', 'mid', 'long'] as const).map((l) => (
              <Chip key={l} active={f.length === l} onClick={() => update({ length: l })}>
                {l === 'any' ? t('any') : t(l === 'short' ? 'durationShort' : l === 'mid' ? 'durationMid' : 'durationLong')}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="m-0 font-body text-[15px] font-normal text-muted" aria-live="polite">
          {t('results', { count: results.length })}
        </h2>
        {dirty && (
          <button type="button" onClick={() => update(EMPTY)} className="border-b border-gold pb-1 text-sm text-ink">
            {t('reset')}
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-[clamp(20px,2vw,32px)] gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <PackageCard key={p.slug} pkg={p} destination={destMap.get(p.destination)!} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-5 rounded-[2px] bg-sand p-[clamp(28px,4vw,56px)]">
          <p className="m-0 max-w-[560px] text-[17px] leading-[1.85] text-muted-2">{t('empty')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/#custom" className="rounded-[1px] bg-ink px-6 py-3.5 text-[15px] text-ivory hover:text-ivory">
              {t('emptyCta')}
            </Link>
            <OpenWhatsAppButton className="rounded-[1px] border border-ink/30 px-6 py-3.5 text-[15px] text-ink">
              {tc('whatsapp')}
            </OpenWhatsAppButton>
          </div>
        </div>
      )}
    </div>
  );
}
