import 'server-only';
import { ObjectId } from 'mongodb';
import { getDb } from './db';
import { nextNumber } from './counters';
import type { Booking, BookingStatus, Currency, Departure, Payment, Tenant, TravelPackage } from './types';

/** Bookings that hold seats on a departure. */
export const SEAT_HOLDING: BookingStatus[] = ['draft', 'confirmed', 'completed'];

export function bookingTotals(b: Pick<Booking, 'items' | 'discount' | 'costs'>) {
  const subtotal = b.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const total = Math.max(0, subtotal - (b.discount || 0));
  const costTotal = b.costs.reduce((s, c) => s + c.amountInBooking, 0);
  return { subtotal, total, costTotal };
}

/** Recomputes the stored totals and paid amount of a booking from its parts. */
export async function recalcBooking(tenantId: ObjectId, bookingId: ObjectId): Promise<void> {
  const db = await getDb();
  const booking = await db.collection<Booking>('bookings').findOne({ _id: bookingId, tenantId });
  if (!booking) return;
  const { total, costTotal } = bookingTotals(booking);
  const payments = await db
    .collection<Payment>('payments')
    .find({ tenantId, bookingId, voided: false }, { projection: { kind: 1, amountInBooking: 1 } })
    .toArray();
  const paid = payments.reduce(
    (s, p) => s + (p.kind === 'refund' ? -p.amountInBooking : p.amountInBooking),
    0,
  );
  await db
    .collection('bookings')
    .updateOne({ _id: bookingId, tenantId }, { $set: { total, costTotal, paid, updatedAt: new Date() } });
}

export async function seatsBooked(
  tenantId: ObjectId,
  departureId: ObjectId,
  excludeBooking?: ObjectId,
): Promise<number> {
  const db = await getDb();
  const match: Record<string, unknown> = { tenantId, departureId, status: { $in: SEAT_HOLDING } };
  if (excludeBooking) match._id = { $ne: excludeBooking };
  const [row] = await db
    .collection('bookings')
    .aggregate<{ n: number }>([
      { $match: match },
      { $group: { _id: null, n: { $sum: { $add: ['$adults', '$children'] } } } },
    ])
    .toArray();
  return row?.n ?? 0;
}

/** Seats booked per departure, for a list of departures. */
export async function seatsByDeparture(
  tenantId: ObjectId,
  departureIds: ObjectId[],
): Promise<Map<string, number>> {
  if (!departureIds.length) return new Map();
  const db = await getDb();
  const rows = await db
    .collection('bookings')
    .aggregate<{ _id: ObjectId; n: number }>([
      { $match: { tenantId, departureId: { $in: departureIds }, status: { $in: SEAT_HOLDING } } },
      { $group: { _id: '$departureId', n: { $sum: { $add: ['$adults', '$children'] } } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

/** Sale lines for a package departure: adults and children at the departure's prices. */
export function packageItems(
  pkg: TravelPackage,
  dep: Departure | null,
  adults: number,
  children: number,
  labels: { adult: string; child: string },
) {
  const adultPrice = dep?.price ?? pkg.price;
  const items = [];
  if (adults > 0)
    items.push({
      _id: new ObjectId(),
      description: `${pkg.title} — ${labels.adult}`,
      qty: adults,
      unitPrice: adultPrice,
    });
  if (children > 0)
    items.push({
      _id: new ObjectId(),
      description: `${pkg.title} — ${labels.child}`,
      qty: children,
      unitPrice: pkg.childPrice ?? adultPrice,
    });
  return items;
}

export async function newBookingNumber(tenant: Tenant): Promise<string> {
  return nextNumber(tenant._id, tenant.settings.bookingPrefix || 'BK', 'booking');
}

export function balanceOf(b: Pick<Booking, 'total' | 'paid'>): number {
  return b.total - b.paid;
}

export function paymentState(b: Pick<Booking, 'total' | 'paid'>): 'unpaid' | 'partial' | 'paidFull' {
  if (b.total > 0 && b.paid >= b.total) return 'paidFull';
  if (b.paid > 0) return 'partial';
  return 'unpaid';
}

export type BookingCurrency = Currency;
