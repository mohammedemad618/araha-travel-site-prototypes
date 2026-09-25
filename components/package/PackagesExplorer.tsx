'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { Destination } from '@/lib/schema';
import { travelStyles, type TravelStyle } from '@/lib/constants';
import { useModal } from '@/lib/useModal';
import { PackageCard, type PackageSummary } from './PackageCard';
import { OpenWhatsAppButton } from '../WhatsApp';
import { Link } from '@/i18n/navigation';

type Budget = 'any' | 'under1' | '1to2' | 'over2';
type Length = 'any' | 'short' | 'mid' | 'long';
type Filters = { destination: string; style: TravelStyle | 'any'; budget: Budget; length: Length };
const EMPTY: Filters = { destination: 'any', style: 'any', budget: 'any', length: 'any' };
const BUDGETS = ['any', 'under1', '1to2', 'over2'] as const;
const LENGTHS = ['any', 'short', 'mid', 'long'] as const;
const BUDGET_KEY = { under1: 'budgetUnder1', '1to2': 'budget1to2', over2: 'budgetOver2' } as const;
const LENGTH_KEY = { short: 'durationShort', mid: 'durationMid', long: 'durationLong' } as const;

const inBudget = (price: number, b: Budget) =>
  b === 'any' ||
  (b === 'under1' && price < 1_000_000) ||
  (b === '1to2' && price >= 1_000_000 && price <= 2_000_000) ||
  (b === 'over2' && price > 2_000_000);
const inLength = (days: number, l: Length) =>
  l === 'any' ||
  (l === 'short' && days <= 5) ||
  (l === 'mid' && days >= 6 && days <= 7) ||
  (l === 'long' && days >= 8);

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 shrink-0 rounded-[1px] border px-3.5 py-2 text-[14px] whitespace-nowrap transition-colors ${
        active ? 'border-ink bg-ink text-ivory' : 'border-ink/25 text-ink-2 hover:border-ink/60'
      }`}
    >
      {children}
    </button>
  );
}

export function PackagesExplorer({
  packages,
  destinations,
  nextDepartures,
}: {
  packages: PackageSummary[];
  destinations: Pick<Destination, 'slug' | 'name' | 'label'>[];
  nextDepartures: Record<string, string[]>;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations('packages');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const destMap = useMemo(() => new Map(destinations.map((d) => [d.slug, d])), [destinations]);
  const [f, setF] = useState<Filters>(EMPTY);
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Filters are mirrored in the URL (?style=family&destination=turkey) so they can be shared.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const pick = <T extends string>(key: string, allowed: readonly T[]) =>
      (allowed as readonly string[]).includes(q.get(key) ?? '') ? (q.get(key) as T) : ('any' as T);
    setF({
      destination: destMap.has(q.get('destination') ?? '') ? q.get('destination')! : 'any',
      style: pick('style', travelStyles),
      budget: pick('budget', BUDGETS),
      length: pick('length', LENGTHS),
    });
  }, [destMap]);

  const closeSheet = useCallback(() => setSheet(false), []);
  useModal(sheetRef, sheet, closeSheet, 'button');

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
  const secondaryCount = [f.style, f.budget, f.length].filter((v) => v !== 'any').length;
  const dirty = f.destination !== 'any' || secondaryCount > 0;
  const legend = 'mb-3 block text-[14px] font-medium text-ink-2';

  const destinationChips = (
    <>
      <Chip active={f.destination === 'any'} onClick={() => update({ destination: 'any' })}>
        {t('any')}
      </Chip>
      {destinations.map((d) => (
        <Chip key={d.slug} active={f.destination === d.slug} onClick={() => update({ destination: d.slug })}>
          {d.name[locale]}
        </Chip>
      ))}
    </>
  );

  const secondary = (
    <>
      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{t('filterStyle')}</legend>
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
        <legend className={legend}>{t('filterBudget')}</legend>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => (
            <Chip key={b} active={f.budget === b} onClick={() => update({ budget: b })}>
              {b === 'any' ? t('any') : t(BUDGET_KEY[b])}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="m-0 border-0 p-0">
        <legend className={legend}>{t('filterDuration')}</legend>
        <div className="flex flex-wrap gap-2">
          {LENGTHS.map((l) => (
            <Chip key={l} active={f.length === l} onClick={() => update({ length: l })}>
              {l === 'any' ? t('any') : t(LENGTH_KEY[l])}
            </Chip>
          ))}
        </div>
      </fieldset>
    </>
  );

  return (
    <div>
      {/* Phones: one scrollable row of destinations plus a sheet for the other filters. */}
      <div className="mb-8 md:hidden">
        <div
          className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
          role="group"
          aria-label={t('filterDestination')}
        >
          {destinationChips}
        </div>
        <button
          type="button"
          onClick={() => setSheet(true)}
          aria-haspopup="dialog"
          className="mt-3 flex min-h-11 items-center gap-2 rounded-[1px] border border-ink/25 px-4 text-[14.5px] text-ink"
        >
          <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden="true" />
          {t('filters')}
          {secondaryCount > 0 && (
            <span className="rounded-full bg-ink px-2 text-xs text-ivory">{secondaryCount}</span>
          )}
        </button>
      </div>

      {sheet && (
        <div data-modal-root className="fixed inset-0 z-90 md:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={closeSheet} aria-hidden="true" />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('filters')}
            className="absolute inset-x-0 bottom-0 flex max-h-[85svh] flex-col rounded-t-[12px] bg-ivory"
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
              <span className="font-display text-lg font-medium text-ink">{t('filters')}</span>
              <button
                type="button"
                onClick={closeSheet}
                aria-label={tn('close')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 text-ink"
              >
                <X size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-7 overflow-y-auto px-5 py-6">{secondary}</div>
            <div className="flex gap-3 border-t border-ink/10 px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => update({ style: 'any', budget: 'any', length: 'any' })}
                className="px-3 text-sm text-ink underline"
              >
                {t('reset')}
              </button>
              <button
                type="button"
                onClick={() => results.length > 0 && closeSheet()}
                aria-disabled={results.length === 0}
                className="min-h-12 flex-1 rounded-[1px] bg-ink px-5 text-[15px] text-ivory aria-disabled:cursor-not-allowed aria-disabled:bg-sand aria-disabled:text-ink"
              >
                {results.length === 0 ? t('noResultsApply') : t('showResults', { count: results.length })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Larger screens: every filter inline. */}
      <div className="mb-14 hidden gap-8 border-b border-ink/12 pb-10 md:grid md:grid-cols-2 lg:grid-cols-[1.3fr_1.3fr_1fr_1fr]">
        <fieldset className="m-0 border-0 p-0">
          <legend className={legend}>{t('filterDestination')}</legend>
          <div className="flex flex-wrap gap-2">{destinationChips}</div>
        </fieldset>
        {secondary}
      </div>

      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="m-0 font-body text-[15px] font-normal text-muted" aria-live="polite">
          {t('results', { count: results.length })}
        </h2>
        {dirty && (
          <button
            type="button"
            onClick={() => update(EMPTY)}
            className="border-b border-gold pb-1 text-sm text-ink"
          >
            {t('reset')}
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-[clamp(20px,2vw,32px)] gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <PackageCard
              key={p.slug}
              pkg={p}
              destination={destMap.get(p.destination)!}
              locale={locale}
              departures={nextDepartures[p.slug]}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-5 rounded-[2px] bg-sand p-[clamp(28px,4vw,56px)]">
          <p className="m-0 max-w-[560px] text-[17px] leading-[1.85] text-muted-2">{t('empty')}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/#custom"
              className="rounded-[1px] bg-ink px-6 py-3.5 text-[15px] text-ivory hover:text-ivory"
            >
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
