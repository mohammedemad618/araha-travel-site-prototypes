import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seatsByDeparture } from '@/lib/bookings';
import { todayISO } from '@/lib/dates';
import { fromMinor } from '@/lib/money';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp, tenantByKey } from '@/lib/public-api';
import type { Departure, TravelPackage } from '@/lib/types';

/**
 * Public prices and departure availability for a company's website. Read by
 * the site at build time (and safe to read from browsers): no customer data.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = await tenantByKey(url.searchParams.get('key') ?? req.headers.get('x-api-key'));
  const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' };
  if (!tenant) return NextResponse.json({ error: 'invalid_key' }, { status: 401, headers });
  if (!(await rateLimit(`catalog:${clientIp(req.headers)}`, 120, 600)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers });

  const db = await getDb();
  const [packages, departures] = await Promise.all([
    db.collection<TravelPackage>('packages').find({ tenantId: tenant._id, active: true }).toArray(),
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
  return NextResponse.json(
    {
      company: tenant.name,
      updatedAt: new Date().toISOString(),
      packages: packages.map((p) => ({
        slug: p.slug,
        title: p.title,
        currency: p.currency,
        price: fromMinor(p.price, p.currency),
        childPrice: p.childPrice !== undefined ? fromMinor(p.childPrice, p.currency) : undefined,
        departures: departures
          .filter((d) => String(d.packageId) === String(p._id))
          .map((d) => {
            const left = Math.max(0, d.capacity - (seats.get(String(d._id)) ?? 0));
            return {
              date: d.date,
              price: d.price !== undefined ? fromMinor(d.price, p.currency) : undefined,
              seatsLeft: left,
              status: d.closed || left === 0 ? 'soldout' : left <= 5 ? 'limited' : 'available',
            };
          }),
      })),
    },
    { headers },
  );
}
