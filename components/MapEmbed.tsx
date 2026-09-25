'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';

/** Google Maps loads only when the visitor asks for it (privacy + performance), with a styled fallback. */
export function MapEmbed({
  query,
  locale,
  title,
  loadLabel,
  openLabel,
}: {
  query: string;
  locale: string;
  title: string;
  loadLabel: string;
  openLabel: string;
}) {
  const [load, setLoad] = useState(false);
  const q = encodeURIComponent(query);
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[2px] bg-sand md:aspect-[16/7]">
      {load ? (
        <iframe
          title={title}
          src={`https://www.google.com/maps?q=${q}&output=embed&hl=${locale}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="brand-pattern absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink p-6 text-center text-ivory">
          <MapPin size={36} strokeWidth={1.25} className="text-gold" aria-hidden="true" />
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setLoad(true)}
              className="rounded-[1px] bg-gold px-5 py-3 text-[14.5px] font-medium text-ink"
            >
              {loadLabel}
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${q}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[1px] border border-ivory/40 px-5 py-3 text-[14.5px] text-ivory"
            >
              {openLabel}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
