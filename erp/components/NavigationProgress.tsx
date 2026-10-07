'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/client';

/**
 * A thin bar at the top of the window from the moment an internal link is
 * clicked until the next page arrives, so a click never looks ignored while
 * the server prepares the page. It only watches; navigation is unchanged.
 */
export function NavigationProgress() {
  const { t } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);

  // The new page has arrived.
  useEffect(() => setActive(false), [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setActive(true);
    };
    // Capture phase: Next's links cancel the browser's own navigation in their
    // click handler, so by the time the click bubbles up it looks handled.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Never leave the bar running if a navigation is abandoned.
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setActive(false), 15000);
    return () => clearTimeout(id);
  }, [active]);

  if (!active) return null;
  return (
    <div className="nav-progress no-print" role="status">
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}
