'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { Package } from '@/lib/schema';
import { Arrow } from '../ui/Arrow';
import { Price } from '../ui/Price';
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
      <ol className="m-0 list-none border-t border-ink p-0">
        {days.map((d, i) => {
          const isOpen = open.has(i);
          const id = `day-${i}`;
          return (
            <li key={i} className="relative border-b border-ink/14">
              <div
                className="absolute start-0 -top-px h-px bg-gold transition-[width] duration-900 ease-soft"
                style={{ width: isOpen ? '100%' : '0%' }}
              />
              <h3 className="m-0">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={id}
                  className="grid w-full grid-cols-[1fr_36px] items-center gap-4 py-6.5 text-start text-ink md:grid-cols-[140px_1fr_36px]"
                >
                  <span className="col-span-full text-sm text-bronze md:col-span-1">{t('dayLabel', { n: i + 1 })}</span>
                  <span className="font-display text-[clamp(19px,1.7vw,24px)] font-medium">{d.title[locale]}</span>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/25 text-lg leading-none"
                    aria-hidden="true"
                  >
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
              </h3>
              <div id={id} hidden={!isOpen} className="flex flex-col gap-3.5 pb-7.5 md:ps-[156px]">
                <p className="m-0 max-w-[620px] text-base leading-[1.95] text-muted">{d.description[locale]}</p>
                {d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {d.tags.map((g) => (
                      <span key={g.en} className="rounded-[1px] border border-ink/18 px-3 py-1.5 text-[12.5px] text-ink-2">
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

export function EnquiryCard({
  title,
  price,
  departures,
  phone,
  phoneDisplay,
}: {
  title: string;
  price: number;
  departures: string[];
  phone: string;
  phoneDisplay: string;
}) {
  const t = useTranslations('package');
  const tc = useTranslations('common');
  const [date, setDate] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const picked = departures[date];
  const waText = picked ? t('waMessageDate', { title, date: picked }) : t('waMessage', { title });

  return (
    <aside id="enquire" className="scroll-mt-28 rounded-[2px] bg-ink px-8 py-9 text-ivory lg:sticky lg:top-[104px]">
      <div className="eyebrow mb-4.5 text-[10.5px] text-gold">{t('enquireEyebrow')}</div>
      <h2 className="m-0 mb-6.5 font-display text-[26px] leading-[1.3] font-medium">{t('enquireTitle')}</h2>
      <div className="mb-6 border-y border-ivory/14 py-5.5">
        <div className="mb-1.5 text-[13px] text-fog">{t('perPerson')}</div>
        <Price value={price} className="text-[40px] leading-none" unitClassName="text-base text-gold" />
      </div>
      <div className="mb-2.5 text-[13px] text-fog">{t('departures')}</div>
      {departures.length > 0 ? (
        <div className="mb-7 flex flex-wrap gap-2" role="radiogroup" aria-label={t('departures')}>
          {departures.map((d, i) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={date === i}
              onClick={() => setDate(i)}
              className={`rounded-[1px] border px-3.5 py-2.5 text-[13.5px] transition-colors ${
                date === i ? 'border-ivory bg-ivory text-ink' : 'border-ivory/25 text-ivory hover:border-ivory/60'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      ) : (
        <p className="m-0 mb-7 text-sm leading-[1.8] text-sand">{t('noDepartures')}</p>
      )}
      <div className="flex flex-col gap-2.5">
        <WhatsAppLink
          text={waText}
          source="package-enquiry"
          className="flex items-center justify-between rounded-[1px] bg-gold px-5 py-[17px] text-[15.5px] font-medium text-ink transition-colors hover:bg-sand hover:text-ink"
        >
          <span className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-ink" aria-hidden="true" />
            {t('whatsappCta')}
          </span>
          <Arrow />
        </WhatsAppLink>
        <a
          href={`tel:${phone}`}
          className="flex items-center justify-between rounded-[1px] border border-ivory/35 px-5 py-4 text-[15px] text-ivory transition-colors hover:border-ivory hover:text-ivory"
        >
          <span>{tc('callUs')}</span>
          <span dir="ltr" className="font-latin text-[13px] text-fog">
            {phoneDisplay}
          </span>
        </a>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          aria-controls="booking-form"
          className="flex items-center justify-between border-b border-gold/50 pt-3.5 pb-1 text-[15px] text-ivory"
        >
          <span>{t('requestCta')}</span>
          <span className="text-gold" aria-hidden="true">
            {showForm ? '−' : '+'}
          </span>
        </button>
      </div>
      <div id="booking-form" hidden={!showForm}>
        <BookingForm packageTitle={title} departures={departures} />
      </div>
    </aside>
  );
}

export function MobileBookingBar({ price }: { price: number }) {
  const tc = useTranslations('common');
  const tp = useTranslations('package');
  const { toggle } = useWhatsApp();
  return (
    <div className="fixed inset-x-0 bottom-0 z-70 flex items-center gap-2.5 border-t border-ivory/10 bg-ink/97 px-3.5 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] text-ivory backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] text-fog">{tc('from')}</div>
        <Price value={price} className="text-[19px] whitespace-nowrap" unitClassName="text-xs text-gold" />
      </div>
      <a
        href="#enquire"
        className="flex min-h-[52px] items-center rounded-[2px] border border-ivory/30 px-4 text-[14.5px] text-ivory"
      >
        {tp('bookShort')}
      </a>
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-[52px] items-center gap-2.5 rounded-[2px] bg-gold px-5 text-[15px] font-medium text-ink"
      >
        <span className="h-2 w-2 rounded-full bg-ink" aria-hidden="true" />
        {tc('whatsapp')}
      </button>
    </div>
  );
}
