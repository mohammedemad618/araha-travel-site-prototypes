'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { whatsappLink } from '@/lib/format';
import { track } from '@/lib/analytics';

// Shared WhatsApp state and links. Kept apart from the panel (which renders the
// call-back form) so the forms can use these without a circular import.

export type Hours = { days: string[]; opens: string; closes: string };
type Ctx = {
  open: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  number: string;
  hours: Hours;
};
const WhatsAppContext = createContext<Ctx | null>(null);

export function useWhatsApp(): Ctx {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) throw new Error('useWhatsApp must be used inside <WhatsAppProvider>');
  return ctx;
}

export function WhatsAppProvider({
  number,
  hours,
  children,
}: {
  number: string;
  hours: Hours;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const show = useCallback(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    // Return focus to whatever opened the panel (WCAG 2.4.3).
    requestAnimationFrame(() => openerRef.current?.focus({ preventScroll: true }));
  }, []);
  const toggle = useCallback(() => (open ? hide() : show()), [open, hide, show]);
  const value = useMemo(
    () => ({ open, show, hide, toggle, number, hours }),
    [open, show, hide, toggle, number, hours],
  );
  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>;
}

/** Any button that opens the quick-contact panel. */
export function OpenWhatsAppButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { show } = useWhatsApp();
  return (
    <button type="button" className={className} onClick={show} aria-haspopup="dialog">
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
