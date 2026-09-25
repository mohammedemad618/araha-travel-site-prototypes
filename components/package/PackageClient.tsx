'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Minus, Plus, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { Package } from '@/lib/schema';
import type { DepartureStatus } from '@/lib/constants';
import { formatPrice } from '@/lib/format';
import { track } from '@/lib/analytics';
import { useModal } from '@/lib/useModal';
import { Arrow } from '../ui/Arrow';
import { Price } from '../ui/Price';
import { WhatsAppGlyph } from '../ui/Glyphs';
import { WhatsAppLink, useWhatsApp } from '../WhatsApp';
import { BookingForm } from '../forms/Forms';

export function Itinerary({ days }: { days: Package['itinerary'] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('package');
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const allOpen = open.size === days.length;
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(days.map((_, i) => i)))}
          className="border-b border-gold pb-1 text-sm text-ink"
        >
          {allOpen ? t('collapseAll') : t('expandAll')}
        </button>
      </div>
      <ol className="relative m-0 list-none p-0">
        {/* Timeline rail */}
        <span
          className="absolute start-[19px] top-2 bottom-2 w-px bg-ink/15 md:start-[23px]"
          aria-hidden="true"
        />
        {days.map((d, i) => {
          const isOpen = open.has(i);
          const id = `day-${i}`;
          return (
            <li key={i} className="relative ps-14 md:ps-16">
              <span
                className={`absolute start-0 top-5 flex h-10 w-10 items-center justify-center rounded-full border font-latin text-sm md:h-12 md:w-12 ${
                  isOpen ? 'border-ink bg-ink text-ivory' : 'border-ink/25 bg-ivory text-ink'
                }`}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="m-0">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={id}
                  className="flex w-full items-center justify-between gap-4 py-6 text-start text-ink"
                >
                  <span>
                    <span className="block text-[13.5px] text-bronze">{t('dayLabel', { n: i + 1 })}</span>
                    <span className="block font-display text-[clamp(19px,1.7vw,24px)] font-medium">
                      {d.title[locale]}
                    </span>
                  </span>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/25 text-lg leading-none"
                    aria-hidden="true"
                  >
                    {isOpen ? <Minus size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
                  </span>
                </button>
              </h3>
              <div id={id} hidden={!isOpen} className="flex flex-col gap-3.5 border-b border-ink/10 pb-7">
                <p className="m-0 max-w-[620px] text-base leading-[1.95] text-muted">
                  {d.description[locale]}
                </p>
                {d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {d.tags.map((g) => (
                      <span
                        key={g.en}
                        className="rounded-[1px] border border-ink/18 px-3 py-1.5 text-[12.5px] text-ink-2"
                      >
                        {g[locale]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type DepartureOption = { date: string; label: string; status: DepartureStatus; note?: string };

const STATUS_STYLE: Record<DepartureStatus, string> = {
  available: 'bg-whatsapp',
  limited: 'bg-gold',
  soldout: 'bg-ash',
  request: 'bg-fog',
};

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const t = useTranslations('package');
  const btn =
    'flex h-9 w-9 items-center justify-center rounded-full border border-ivory/30 text-ivory transition-colors hover:border-gold disabled:opacity-35';
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <div className="text-[14.5px] text-ivory">{label}</div>
        <div className="text-[12px] text-fog">{hint}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={t('decrease', { label })}
        >
          <Minus size={14} aria-hidden="true" />
        </button>
        <output className="w-5 text-center font-latin text-[15px] text-ivory" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={t('increase', { label })}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Slide-in panel for the booking request. Rendered in <body> so the fixed header can't cover it. */
function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tn = useTranslations('nav');
  useModal(ref, open, onClose, 'input,select,textarea');
  if (!open) return null;
  return createPortal(
    <div data-modal-root className="fixed inset-0 z-100">
      <div className="absolute inset-0 bg-ink/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-y-0 end-0 flex w-full max-w-[460px] flex-col overflow-y-auto bg-ink px-7 py-7 text-ivory shadow-[0_0_80px_rgba(0,0,0,.4)]"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="m-0 font-display text-[24px] font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tn('close')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/25 text-ivory"
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

const VISIBLE_DATES = 3;

export function EnquiryCard({
  title,
  price,
  childPrice,
  priceNote,
  departures,
  phone,
  phoneDisplay,
  usd,
}: {
  title: string;
  price: number;
  childPrice?: number;
  priceNote: string;
  departures: DepartureOption[];
  phone: string;
  phoneDisplay: string;
  /** Approximate USD price and its explanation, when the owner has set an exchange rate. */
  usd?: { amount: string; note: string };
}) {
  const t = useTranslations('package');
  const tc = useTranslations('common');
  // Build-time dates are re-filtered in the browser so a date never stays bookable after it passes.
  const [options, setOptions] = useState(departures);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setOptions(departures.filter((d) => d.date >= today));
  }, [departures]);
  const firstOpen = Math.max(
    0,
    options.findIndex((d) => d.status !== 'soldout'),
  );
  const [sel, setSel] = useState(firstOpen);
  useEffect(() => setSel(firstOpen), [firstOpen]);
  const [showAll, setShowAll] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  const picked = options[sel];
  const travellers = t('travellersSummary', { adults, children });
  const waText = t('waMessageFull', { title, date: picked?.label ?? tc('onRequest'), travellers });
  const estimate = adults * price + (childPrice !== undefined ? children * childPrice : 0);
  // Always keep the selected date visible, even when the list is collapsed.
  const shown = showAll ? options : options.filter((_, i) => i < VISIBLE_DATES || i === sel);

  // Arrow keys move the selection (roving tabindex, mirrored in RTL).
  const onRadioKey = (e: React.KeyboardEvent, i: number) => {
    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = i;
    if (e.key === forward || e.key === 'ArrowDown') next = (i + 1) % options.length;
    else if (e.key === backward || e.key === 'ArrowUp') next = (i - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    else return;
    e.preventDefault();
    if (next >= VISIBLE_DATES) setShowAll(true);
    setSel(next);
    requestAnimationFrame(() => radios.current[next]?.focus());
  };

  return (
    <aside
      id="enquire"
      data-fab-avoid
      data-hide-booking-bar
      className="scroll-mt-28 rounded-[2px] bg-ink px-7 py-7 text-ivory max-lg:mb-20 lg:sticky lg:top-[92px] lg:max-h-[calc(100svh-112px)] lg:overflow-y-auto lg:overscroll-contain"
    >
      <div className="eyebrow mb-3 text-gold">{t('enquireEyebrow')}</div>
      <div className="mb-5 border-b border-ivory/14 pb-5">
        <div className="mb-1.5 text-[13px] text-fog">{t('perPerson')}</div>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <Price value={price} className="text-[36px] leading-none" unitClassName="text-base text-gold" />
          {usd && (
            <span className="text-[14px] text-fog" title={usd.note}>
              {usd.amount}
            </span>
          )}
        </div>
        <div className="mt-2 text-[12.5px] text-fog">{priceNote}</div>
        {childPrice !== undefined && (
          <div className="mt-1 text-[12.5px] text-fog">
            {t('childPrice', { price: formatPrice(childPrice) })}
          </div>
        )}
      </div>

      <div className="mb-2 text-[13px] text-fog" id="dep-label">
        {t('departures')}
      </div>
      {options.length > 0 ? (
        <div className="mb-5">
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-labelledby="dep-label">
            {shown.map((d) => {
              const i = options.indexOf(d);
              const checked = sel === i;
              const soldOut = d.status === 'soldout';
              return (
                <button
                  key={d.date}
                  ref={(el) => {
                    radios.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-disabled={soldOut || undefined}
                  tabIndex={checked ? 0 : -1}
                  onClick={() => setSel(i)}
                  onKeyDown={(e) => onRadioKey(e, i)}
                  className={`flex items-center justify-between rounded-[1px] border px-3.5 py-2.5 text-start text-[14px] transition-colors ${
                    checked
                      ? 'border-ivory bg-ivory text-ink'
                      : 'border-ivory/20 text-ivory hover:border-ivory/60'
                  } ${soldOut ? 'opacity-60' : ''}`}
                >
                  <span className="flex flex-col">
                    <span className={soldOut ? 'line-through' : ''}>{d.label}</span>
                    {d.note && (
                      <span className={`text-[12px] ${checked ? 'text-muted' : 'text-fog'}`}>{d.note}</span>
                    )}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-[12px] ${checked ? 'text-muted' : 'text-fog'}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[d.status]}`}
                      aria-hidden="true"
                    />
                    {t(`status.${d.status}`)}
                  </span>
                </button>
              );
            })}
          </div>
          {options.length > VISIBLE_DATES && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="mt-2 text-[13px] text-sand underline underline-offset-4"
            >
              {showAll ? t('fewerDates') : t('moreDates', { count: options.length - VISIBLE_DATES })}
            </button>
          )}
          {picked?.status === 'soldout' && (
            <p className="m-0 mt-2 text-[12.5px] text-sand">{t('soldOutNote')}</p>
          )}
        </div>
      ) : (
        <p className="m-0 mb-5 text-sm leading-[1.8] text-sand">{t('noDepartures')}</p>
      )}

      <div className="flex flex-col gap-2.5">
        <WhatsAppLink
          text={waText}
          source="package-enquiry"
          className="flex items-center justify-between rounded-[1px] bg-gold px-5 py-3.5 text-[15.5px] font-medium text-ink transition-colors hover:bg-sand hover:text-ink"
        >
          <span className="flex items-center gap-2.5">
            <WhatsAppGlyph size={18} />
            {t('whatsappCta')}
          </span>
          <Arrow />
        </WhatsAppLink>
        <button
          type="button"
          onClick={() => {
            setDrawer(true);
            track('booking_open', { package: title });
          }}
          className="flex items-center justify-between rounded-[1px] border border-ivory/40 px-5 py-3.5 text-[15px] text-ivory transition-colors hover:border-ivory"
        >
          <span>{t('requestCta')}</span>
          <Arrow className="text-gold" />
        </button>
        <a
          href={`tel:${phone}`}
          className="flex items-center justify-between px-1 pt-1 text-[14px] text-mist hover:text-ivory"
        >
          <span>{tc('callUs')}</span>
          <span dir="ltr" lang="en" className="font-latin text-[13px] text-fog">
            {phoneDisplay}
          </span>
        </a>
      </div>

      <div className="mt-5 border-t border-ivory/14 pt-3">
        <div className="mb-1 text-[13px] text-fog">{t('travellers')}</div>
        <Stepper
          label={t('adults')}
          hint={t('adultsHint')}
          value={adults}
          min={1}
          max={20}
          onChange={setAdults}
        />
        <Stepper
          label={t('children')}
          hint={t('childrenHint')}
          value={children}
          min={0}
          max={10}
          onChange={setChildren}
        />
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-ivory/10 pt-3">
          <span className="text-[13.5px] text-mist">{t('estimate')}</span>
          <Price value={estimate} className="text-[22px]" unitClassName="text-xs text-gold" />
        </div>
        <p className="m-0 mt-1 text-[12px] leading-[1.6] text-fog">
          {t('estimateNote')} {children > 0 && childPrice === undefined ? t('childPriceOnRequest') : ''}
        </p>
      </div>

      <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 border-t border-ivory/10 p-0 pt-4 text-[12.5px] text-fog">
        {(t.raw('reassure') as string[]).map((r) => (
          <li key={r} className="flex items-center gap-2">
            <Check size={14} strokeWidth={1.75} className="text-gold" aria-hidden="true" />
            {r}
          </li>
        ))}
      </ul>

      <Drawer open={drawer} onClose={closeDrawer} title={t('bookingTitle')}>
        <p className="m-0 mb-1 text-[14.5px] leading-[1.8] text-mist">{t('bookingIntro')}</p>
        <p className="m-0 text-[14px] text-sand">
          {title}
          {picked ? ` · ${picked.label}` : ''} · {travellers}
        </p>
        <BookingForm
          packageTitle={title}
          departures={options.map((d) => d.label)}
          departure={picked?.label}
          onDepartureChange={(label) =>
            setSel(
              Math.max(
                0,
                options.findIndex((d) => d.label === label),
              ),
            )
          }
          travellers={travellers}
        />
      </Drawer>
    </aside>
  );
}

/**
 * Price + actions bar on phones and tablets. It hides while the hero price or
 * the booking card is on screen, so the price is never shown twice.
 */
export function MobileBookingBar({ price }: { price: number }) {
  const tc = useTranslations('common');
  const tp = useTranslations('package');
  const { toggle } = useWhatsApp();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const targets = document.querySelectorAll('[data-hide-booking-bar]');
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setHidden(visible.size > 0);
    });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={`fixed inset-x-0 bottom-0 z-70 flex items-center gap-2.5 border-t border-ivory/10 bg-ink/97 px-3.5 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] text-ivory backdrop-blur-[14px] transition-[transform,opacity] duration-300 md:inset-x-auto md:start-1/2 md:bottom-4 md:w-[min(560px,calc(100%-32px))] md:-translate-x-1/2 md:rounded-[4px] md:border md:rtl:translate-x-1/2 lg:hidden ${
        hidden ? 'pointer-events-none translate-y-full opacity-0 md:translate-y-[calc(100%+16px)]' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] text-fog">{tc('from')}</div>
        <Price value={price} className="text-[19px] whitespace-nowrap" unitClassName="text-xs text-gold" />
      </div>
      <a
        href="#enquire"
        className="flex min-h-[52px] items-center rounded-[2px] border border-ivory/30 px-4 text-[14.5px] text-ivory"
      >
        {tp('pickDate')}
      </a>
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-[52px] items-center gap-2 rounded-[2px] bg-gold px-4 text-[15px] font-medium text-ink"
      >
        <WhatsAppGlyph size={18} />
        {tc('whatsapp')}
      </button>
    </div>
  );
}
