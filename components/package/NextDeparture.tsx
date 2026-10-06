'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/format';
import { useLivePackage } from '@/lib/live-catalog';

/**
 * The next open departure. The list comes from the last build; the browser drops
 * dates that have passed since then, so cards never advertise a trip that has left.
 */
export function NextDeparture({
  dates,
  locale,
  className,
  slug,
}: {
  dates: string[];
  locale: Locale;
  className: string;
  /** With a slug, live dates and seats from the ERP replace the built ones once loaded. */
  slug?: string;
}) {
  const live = useLivePackage(slug ?? '');
  const [next, setNext] = useState(dates[0]);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const open =
      live && slug ? live.departures.filter((d) => d.status !== 'soldout').map((d) => d.date) : dates;
    setNext(open.find((d) => d >= today));
  }, [dates, live, slug]);
  if (!next) return null;
  return (
    <span className={className}>
      <CalendarDays size={14} strokeWidth={1.5} className="text-gold" aria-hidden="true" />
      {formatDate(next, locale)}
    </span>
  );
}
