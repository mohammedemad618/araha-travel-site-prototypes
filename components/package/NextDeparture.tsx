'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/format';

/**
 * The next open departure. The list comes from the last build; the browser drops
 * dates that have passed since then, so cards never advertise a trip that has left.
 */
export function NextDeparture({
  dates,
  locale,
  className,
}: {
  dates: string[];
  locale: Locale;
  className: string;
}) {
  const [next, setNext] = useState(dates[0]);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setNext(dates.find((d) => d >= today));
  }, [dates]);
  if (!next) return null;
  return (
    <span className={className}>
      <CalendarDays size={14} strokeWidth={1.5} className="text-gold" aria-hidden="true" />
      {formatDate(next, locale)}
    </span>
  );
}
