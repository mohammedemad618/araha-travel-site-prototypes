'use client';

import { useEffect, useState } from 'react';
import type { DepartureStatus } from './constants';

// Live prices and seats from the Niura ERP, read in the browser through the
// site's own /erp-api proxy. The prices built into the page stay as the
// fallback: without the ERP (or if it is slow) visitors see the last build.

export type LiveDeparture = { date: string; status: DepartureStatus; seatsLeft?: number; price?: number };
export type LivePackage = { price: number; childPrice?: number; departures: LiveDeparture[] };

/** The public site key; a test can also set window.__NIURA_ERP_KEY__ before the page loads. */
const siteKey = () =>
  process.env.NEXT_PUBLIC_ERP_KEY ||
  (typeof window !== 'undefined' ? (window as { __NIURA_ERP_KEY__?: string }).__NIURA_ERP_KEY__ : undefined);
const CACHE = 'niura-catalog';
const MAX_AGE = 30_000;

type Payload = { at: number; packages: Record<string, LivePackage> };

let pending: Promise<Record<string, LivePackage> | null> | null = null;

function readCache(): Payload | null {
  try {
    const raw = sessionStorage.getItem(CACHE);
    const data = raw ? (JSON.parse(raw) as Payload) : null;
    return data && Date.now() - data.at < MAX_AGE ? data : null;
  } catch {
    return null;
  }
}

/** Keeps only what the site shows, for packages priced in dinars (like the site). */
export function parseCatalog(data: unknown): Record<string, LivePackage> | null {
  const list = (data as { packages?: unknown })?.packages;
  if (!Array.isArray(list)) return null;
  const out: Record<string, LivePackage> = {};
  for (const p of list as Record<string, unknown>[]) {
    if (typeof p.slug !== 'string' || p.currency !== 'IQD' || typeof p.price !== 'number') continue;
    const departures = Array.isArray(p.departures) ? (p.departures as Record<string, unknown>[]) : [];
    out[p.slug] = {
      price: Math.round(p.price),
      childPrice: typeof p.childPrice === 'number' ? Math.round(p.childPrice) : undefined,
      departures: departures
        .filter((d) => typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
        .map((d) => ({
          date: d.date as string,
          status: (['available', 'limited', 'soldout'].includes(d.status as string)
            ? d.status
            : 'available') as DepartureStatus,
          seatsLeft: typeof d.seatsLeft === 'number' ? d.seatsLeft : undefined,
          price: typeof d.price === 'number' ? Math.round(d.price) : undefined,
        })),
    };
  }
  return out;
}

function load(): Promise<Record<string, LivePackage> | null> {
  const key = siteKey();
  if (!key || typeof window === 'undefined') return Promise.resolve(null);
  pending ??= (async () => {
    const cached = readCache();
    if (cached) return cached.packages;
    try {
      const res = await fetch(`/erp-api/v1/catalog?key=${encodeURIComponent(key)}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return null;
      const packages = parseCatalog(await res.json());
      if (packages)
        try {
          sessionStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), packages }));
        } catch {
          // Private mode: no cache, still live.
        }
      return packages;
    } catch {
      return null;
    }
  })();
  return pending;
}

/** The live price and dates of one package, or null until (and unless) they arrive. */
export function useLivePackage(slug: string): LivePackage | null {
  const [live, setLive] = useState<LivePackage | null>(null);
  useEffect(() => {
    let active = true;
    load().then((all) => active && setLive(all?.[slug] ?? null));
    return () => {
      active = false;
    };
  }, [slug]);
  return live;
}
