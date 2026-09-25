'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus, X } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { whatsappLink } from '@/lib/format';
import { track } from '@/lib/analytics';
import { Arrow } from './ui/Arrow';
import { WhatsAppGlyph } from './ui/Glyphs';
import { CallbackForm } from './forms/Forms';
import { inertOutside } from '@/lib/useModal';
import { useWhatsApp, type Hours } from './WhatsAppContext';

export { OpenWhatsAppButton, WhatsAppLink, WhatsAppProvider, useWhatsApp } from './WhatsAppContext';

/** Height of the strip at the bottom of the viewport the floating button occupies. */
const FAB_BAND = 110;
const DESKTOP_QUERY = '(min-width: 68.75rem)';

/** Whether the office is open right now, in Baghdad time. `null` until mounted (avoids hydration mismatch). */
function useOfficeOpen(hours: Hours): boolean | null {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Baghdad',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date());
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
      const now = `${get('hour')}:${get('minute')}`;
      setOpen(hours.days.includes(get('weekday')) && now >= hours.opens && now < hours.closes);
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [hours]);
  return open;
}

export function WhatsAppPanel() {
  const t = useTranslations('whatsapp');
  const tn = useTranslations('nav');
  const { open, hide, toggle, number, hours } = useWhatsApp();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [modal, setModal] = useState(false);
  const [callback, setCallback] = useState(false);
  const [compact, setCompact] = useState(false);
  const [avoid, setAvoid] = useState(false);
  const officeOpen = useOfficeOpen(hours);
  const options = t.raw('options') as string[];
  // Package pages already carry WhatsApp in the booking card and mobile bar.
  const onPackage = /^\/packages\/[^/]+\/?$/.test(pathname);

  useEffect(() => {
    if (!open) {
      setCallback(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    // Below lg the panel covers the page behind a backdrop, so it acts as a modal.
    const isModal = !window.matchMedia(DESKTOP_QUERY).matches;
    setModal(isModal);
    const restore = isModal && rootRef.current ? inertOutside(rootRef.current) : undefined;
    return () => {
      window.removeEventListener('keydown', onKey);
      restore?.();
    };
  }, [open, hide]);

  // Shrink the floating button to an icon after scrolling, and hide it while a
  // sidebar card or the footer passes through the band it sits in.
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const targets = document.querySelectorAll('[data-fab-avoid], footer');
    const visible = new Set<Element>();
    let io: IntersectionObserver | undefined;
    const observe = () => {
      io?.disconnect();
      visible.clear();
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
          setAvoid(visible.size > 0);
        },
        { rootMargin: `-${Math.max(0, window.innerHeight - FAB_BAND)}px 0px 0px 0px` },
      );
      targets.forEach((el) => io!.observe(el));
    };
    observe();
    window.addEventListener('resize', observe);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', observe);
      io?.disconnect();
    };
  }, [pathname]);

  const status = officeOpen === null ? t('online') : officeOpen ? t('openNow') : t('closedNow');

  return (
    <>
      {open && (
        <div ref={rootRef}>
          <div className="fixed inset-0 z-75 bg-ink/40 lg:hidden" onClick={hide} aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal={modal}
            aria-labelledby="wa-title"
            className="fixed start-2.5 end-2.5 bottom-[84px] z-80 max-h-[calc(100svh-110px)] overflow-y-auto rounded-[3px] bg-ivory shadow-[0_30px_80px_rgba(11,29,38,.35)] md:start-auto md:end-7 md:bottom-24 md:w-[380px]"
          >
            <div className="sticky top-0 z-1 flex items-start justify-between gap-4 bg-ink px-6 pt-6 pb-5.5 text-ivory">
              <div>
                <div id="wa-title" className="mb-2 font-display text-[21px] font-medium">
                  {t('title')}
                </div>
                <div className="flex items-center gap-2 text-[13px] text-fog">
                  <span
                    className={`h-[7px] w-[7px] rounded-full ${officeOpen === false ? 'bg-ash' : 'animate-pulse-dot bg-whatsapp'}`}
                    aria-hidden="true"
                  />
                  {status}
                </div>
              </div>
              <button
                type="button"
                onClick={hide}
                aria-label={tn('close')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ivory/25 text-ivory"
              >
                <X size={18} strokeWidth={1.5} aria-hidden="true" />
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
                  className="flex min-h-[52px] items-center justify-between gap-3 border-b border-ink/10 text-[15.5px] text-ink transition-colors hover:text-bronze"
                >
                  <span className="flex items-center gap-3">
                    <WhatsAppGlyph size={16} className="text-whatsapp" />
                    {o}
                  </span>
                  <Arrow className="text-bronze" />
                </a>
              ))}
              <button
                type="button"
                onClick={() => setCallback((v) => !v)}
                aria-expanded={callback}
                aria-controls="wa-callback"
                className="flex min-h-[52px] items-center justify-between text-start text-[15.5px] font-medium text-ink"
              >
                {t('callback')}
                {callback ? (
                  <Minus size={18} strokeWidth={1.5} className="text-bronze" aria-hidden="true" />
                ) : (
                  <Plus size={18} strokeWidth={1.5} className="text-bronze" aria-hidden="true" />
                )}
              </button>
              <div id="wa-callback" hidden={!callback}>
                <p className="m-0 mb-2 text-[13.5px] leading-[1.7] text-muted">{t('callbackHint')}</p>
                <CallbackForm />
              </div>
            </div>
          </div>
        </div>
      )}
      {!onPackage && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          data-inert-with-menu
          aria-label={compact ? t('open') : undefined}
          className={`fixed end-7 bottom-7 z-70 hidden h-14 items-center gap-3 rounded-[40px] border border-gold/60 bg-ink text-[15px] text-ivory shadow-[0_14px_40px_rgba(11,29,38,.3)] transition-[opacity,transform,padding] duration-300 hover:border-gold md:flex ${
            compact ? 'w-14 justify-center px-0' : 'ps-[18px] pe-[22px]'
          } ${avoid && !open ? 'pointer-events-none translate-y-24 opacity-0' : ''}`}
        >
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-whatsapp text-ink"
            aria-hidden="true"
          >
            <WhatsAppGlyph size={17} />
          </span>
          {!compact && <span>{open ? tn('close') : t('open')}</span>}
        </button>
      )}
    </>
  );
}
