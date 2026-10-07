import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seatsByDeparture } from '@/lib/bookings';
import { todayISO } from '@/lib/dates';
import { fromMinor } from '@/lib/money';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp, tenantByKey } from '@/lib/public-api';
import { mediaPath } from '@/lib/media';
import { MEDIA_PREFIX, SINGLE_KEY, compact, singleKinds } from '@/lib/site-content';
import type { Departure, SiteContent, TravelPackage } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Replaces "media:<id>" image sources with full links the website's build can download. */
function withImageUrls(value: unknown, origin: string): unknown {
  if (Array.isArray(value)) return value.map((v) => withImageUrls(v, origin));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        k === 'src' && typeof v === 'string' && v.startsWith(MEDIA_PREFIX)
          ? `${origin}${mediaPath(v.slice(MEDIA_PREFIX.length))}`
          : withImageUrls(v, origin),
      ]),
    );
  }
  return value;
}

/**
 * Website content edited in the back office, shaped like the website's own
 * content files, for its build. Package prices, durations and dates come from
 * inventory. Everything here is shown publicly on the website.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = await tenantByKey(url.searchParams.get('key') ?? req.headers.get('x-api-key'));
  const headers = { 'Cache-Control': 'no-store' };
  if (!tenant) return NextResponse.json({ error: 'invalid_key' }, { status: 401, headers });
  if (!(await rateLimit(`content:${tenant._id}:${clientIp(req.headers)}`, 60, 600)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers });

  const origin = process.env.PUBLIC_URL?.replace(/\/+$/, '') || url.origin;
  const db = await getDb();
  const [pages, packages, departures] = await Promise.all([
    db.collection<SiteContent>('siteContent').find({ tenantId: tenant._id }).sort({ key: 1 }).toArray(),
    db.collection<TravelPackage>('packages').find({ tenantId: tenant._id }).toArray(),
    db
      .collection<Departure>('departures')
      .find({ tenantId: tenant._id, date: { $gte: todayISO() } })
      .sort({ date: 1 })
      .toArray(),
  ]);
  const seats = await seatsByDeparture(
    tenant._id,
    departures.map((d) => d._id),
  );
  const shape = (data: Record<string, unknown>) =>
    withImageUrls(compact(data), origin) as Record<string, unknown>;

  const hidden: string[] = [];
  const outPackages = pages
    .filter((p) => p.kind === 'package')
    .flatMap((p) => {
      const pkg = packages.find((x) => x.slug === p.key);
      const { hidden: isHidden, ...data } = p.data as Record<string, unknown> & { hidden?: boolean };
      if (!pkg || !pkg.active || isHidden) {
        hidden.push(p.key);
        return [];
      }
      return [
        {
          ...shape(data),
          slug: p.key,
          days: pkg.days,
          nights: pkg.nights,
          price: fromMinor(pkg.price, pkg.currency),
          ...(pkg.childPrice !== undefined ? { childPrice: fromMinor(pkg.childPrice, pkg.currency) } : {}),
          departures: departures
            .filter((d) => String(d.packageId) === String(pkg._id))
            .map((d) => {
              const left = Math.max(0, d.capacity - (seats.get(String(d._id)) ?? 0));
              return {
                date: d.date,
                status: d.closed || left === 0 ? 'soldout' : left <= 5 ? 'limited' : 'available',
              };
            }),
        },
      ];
    });

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      packages: outPackages,
      hiddenPackages: hidden,
      visas: pages.filter((p) => p.kind === 'visa').map((p) => ({ ...shape(p.data), destination: p.key })),
      destinations: pages
        .filter((p) => p.kind === 'destination')
        .map((p) => ({ ...shape(p.data), slug: p.key })),
      guides: pages.filter((p) => p.kind === 'guide').map((p) => ({ ...shape(p.data), slug: p.key })),
      pages: Object.fromEntries(pages.filter((p) => p.kind === 'page').map((p) => [p.key, shape(p.data)])),
      // Sections the website has once; null until they are imported or saved.
      ...Object.fromEntries(
        singleKinds.map((k) => {
          const page = pages.find((p) => p.kind === k && p.key === SINGLE_KEY);
          return [k, page ? shape(page.data) : null];
        }),
      ),
    },
    { headers },
  );
}
