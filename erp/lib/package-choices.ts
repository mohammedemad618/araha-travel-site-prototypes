import 'server-only';
import type { ObjectId } from 'mongodb';
import { tenantRepo } from './repo';
import { seatsByDeparture } from './bookings';
import { formatDate, todayISO } from './dates';

/** Active packages with their upcoming departures and seats left, for booking forms. */
export async function packageChoices(tenantId: ObjectId, lang: 'ar' | 'en', include?: ObjectId) {
  const r = await tenantRepo(tenantId);
  const [packages, departures] = await Promise.all([
    r.packages
      .find({ $or: [{ active: true }, ...(include ? [{ _id: include }] : [])] })
      .sort({ title: 1 })
      .toArray(),
    r.departures
      .find({ date: { $gte: todayISO() } })
      .sort({ date: 1 })
      .toArray(),
  ]);
  const seats = await seatsByDeparture(
    tenantId,
    departures.map((d) => d._id),
  );
  return packages.map((p) => ({
    id: String(p._id),
    title: p.title,
    currency: p.currency,
    departures: departures
      .filter((d) => String(d.packageId) === String(p._id))
      .map((d) => ({
        id: String(d._id),
        label: formatDate(d.date, lang),
        left: d.capacity - (seats.get(String(d._id)) ?? 0),
        closed: d.closed,
      })),
  }));
}
