'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { whatsappLink } from '@/lib/format';
import { track } from '@/lib/analytics';
import { Arrow } from './ui/Arrow';

type Ctx = { open: boolean; setOpen: (v: boolean) => void; toggle: () => void; number: string };
const WhatsAppContext = createContext<Ctx | null>(null);

export function useWhatsApp(): Ctx {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) throw new Error('useWhatsApp must be used inside <WhatsAppProvider>');
  return ctx;
}

export function WhatsAppProvider({ number, children }: { number: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const value = useMemo(() => ({ open, setOpen, toggle, number }), [open, toggle, number]);
  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>;
}

/** Any button that opens the quick-contact panel. */
export function OpenWhatsAppButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { setOpen } = useWhatsApp();
  return (
    <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
      {children}
    </button>
  );
}

/** A direct wa.me link that records a conversion event. */
export function WhatsAppLink({
  text,
  className,
  children,
  source,
}: {
  text: string;
  className?: string;
  children: React.ReactNode;
  source: string;
}) {
  const { number } = useWhatsApp();
  return (
    <a
      href={whatsappLink(number, text)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track('whatsapp_click', { source })}
    >
      {children}
    </a>
  );
}

export function WhatsAppPanel() {
  const t = useTranslations('whatsapp');
  const tn = useTranslations('nav');
  const { open, setOpen, toggle, number } = useWhatsApp();
  const panelRef = useRef<HTMLDivElement>(null);
  const options = t.raw('options') as string[];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="wa-title"
          className="fixed start-2.5 end-2.5 bottom-[84px] z-80 overflow-hidden rounded-[3px] bg-ivory shadow-[0_30px_80px_rgba(11,29,38,.35)] lg:start-auto lg:end-7 lg:bottom-24 lg:w-[380px]"
        >
          <div className="flex items-start justify-between gap-4 bg-ink px-6 pt-6 pb-5.5 text-ivory">
            <div>
              <div id="wa-title" className="mb-2 font-display text-[21px] font-medium">
                {t('title')}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-fog">
                <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-whatsapp" aria-hidden="true" />
                {t('online')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={tn('close')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ivory/25 text-base leading-none text-ivory"
            >
              ×
            </button>
          </div>
          <div className="flex flex-col px-6 pt-2 pb-5">
            {options.map((o) => (
              <a
                key={o}
                href={whatsappLink(number, t('greeting') + o)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('whatsapp_click', { source: 'panel', topic: o })}
                className="flex min-h-[54px] items-center justify-between border-b border-ink/10 text-[15.5px] text-ink transition-colors hover:text-bronze"
              >
                {o}
                <Arrow className="text-bronze" />
              </a>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="fixed bottom-7 z-70 hidden h-14 items-center gap-3 rounded-[40px] border border-gold/60 bg-ink ps-[18px] pe-[22px] text-[15px] text-ivory shadow-[0_14px_40px_rgba(11,29,38,.3)] transition-colors hover:border-gold lg:flex end-7"
      >
        <span
          dir="ltr"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-whatsapp font-latin text-[11px] font-bold text-ink"
          aria-hidden="true"
        >
          WA
        </span>
        <span>{open ? tn('close') : t('open')}</span>
      </button>
    </>
  );
}
