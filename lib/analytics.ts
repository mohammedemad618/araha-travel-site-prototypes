type EventProps = Record<string, string | number>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, options?: { props?: EventProps }) => void;
  }
}

/** Sends a conversion event to whichever analytics provider is configured (if any). */
export function track(event: string, props: EventProps = {}): void {
  if (typeof window === 'undefined') return;
  window.gtag?.('event', event, props);
  window.plausible?.(event, { props });
}
