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
  address,
  hours,
}: {
  query: string;
  locale: string;
  title: string;
  loadLabel: string;
  openLabel: string;
  address?: string;
  hours?: string;
}) {
  const [load, setLoad] = useState(false);
  const q = encodeURIComponent(query);
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2px] bg-sand sm:aspect-[16/9] md:aspect-[16/6]">
      {load ? (
        <iframe
          title={title}
          src={`https://www.google.com/maps?q=${q}&output=embed&hl=${locale}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-ink">
          {/* A faint street grid hints at a map without loading one. */}
          <span
            className="pointer-events-none absolute inset-0 opacity-60"
            aria-hidden="true"
            style={{
              backgroundImage:
                'linear-gradient(rgba(11,29,38,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(11,29,38,.07) 1px,transparent 1px),linear-gradient(35deg,transparent 48%,rgba(201,151,85,.35) 49%,rgba(201,151,85,.35) 51%,transparent 52%)',
              backgroundSize: '56px 56px,56px 56px,100% 100%',
            }}
          />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-ink text-gold shadow-[0_10px_30px_rgba(11,29,38,.25)]">
            <MapPin size={26} strokeWidth={1.5} aria-hidden="true" />
          </span>
          {address && (
            <p className="relative m-0 max-w-[420px] font-display text-[clamp(17px,1.6vw,21px)] leading-[1.6] font-medium">
              {address}
            </p>
          )}
          {hours && <p className="relative m-0 -mt-2 text-[14px] text-muted">{hours}</p>}
          <div className="relative flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setLoad(true)}
              className="rounded-[1px] bg-ink px-5 py-3 text-[14.5px] font-medium text-ivory"
            >
              {loadLabel}
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${q}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[1px] border border-ink/30 bg-ivory/70 px-5 py-3 text-[14.5px] text-ink"
            >
              {openLabel}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
