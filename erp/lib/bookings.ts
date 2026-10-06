import 'server-only';
import type { ObjectId } from 'mongodb';
import { tenantRepo } from './repo';
import { nextNumber } from './counters';
import { lineTotals } from './services';
import type { Booking, BookingStatus, Currency, Tenant } from './types';

/** Bookings that hold seats on a departure. */
export const SEAT_HOLDING: BookingStatus[] = ['draft', 'confirmed', 'completed'];

export function bookingTotals(b: Pick<Booking, 'services' | 'discount'>) {
  return lineTotals(b.services, b.discount);
}

/** Recomputes the stored totals and paid amount of a booking from its parts. */
export async function recalcBooking(tenantId: ObjectId, bookingId: ObjectId): Promise<void> {
  // Company-wide on purpose: totals include every payment, whoever recorded it.
  const r = await tenantRepo(tenantId);
  const booking = await r.bookings.findOne({ _id: bookingId });
  if (!booking) return;
  const { total, costTotal } = bookingTotals(booking);
  const payments = await r.payments
    .find({ bookingId, voided: false }, { projection: { kind: 1, amountInBooking: 1 } })
    .toArray();
  const paid = payments.reduce(
    (s, p) => s + (p.kind === 'refund' ? -p.amountInBooking : p.amountInBooking),
    0,
  );
  await r.bookings.updateOne({ _id: bookingId }, { $set: { total, costTotal, paid, updatedAt: new Date() } });
}

export async function seatsBooked(
  tenantId: ObjectId,
  departureId: ObjectId,
  excludeBooking?: ObjectId,
): Promise<number> {
  // Seats are shared by every branch, so all bookings count.
  const r = await tenantRepo(tenantId);
  const match: Record<string, unknown> = { departureId, status: { $in: SEAT_HOLDING } };
  if (excludeBooking) match._id = { $ne: excludeBooking };
  const [row] = await r.bookings
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
  const r = await tenantRepo(tenantId);
  const rows = await r.bookings
    .aggregate<{ _id: ObjectId; n: number }>([
      { $match: { departureId: { $in: departureIds }, status: { $in: SEAT_HOLDING } } },
      { $group: { _id: '$departureId', n: { $sum: { $add: ['$adults', '$children'] } } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export async function newBookingNumber(tenant: Tenant): Promise<string> {
  return nextNumber(tenant._id, tenant.settings.bookingPrefix || 'BK', 'booking');
}

export async function newQuoteNumber(tenant: Tenant): Promise<string> {
  return nextNumber(tenant._id, tenant.settings.quotePrefix || 'QT', 'quote');
}

export async function newInvoiceNumber(tenant: Tenant): Promise<string> {
  return nextNumber(tenant._id, tenant.settings.invoicePrefix || 'INV', 'invoice');
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
