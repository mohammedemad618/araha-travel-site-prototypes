import 'server-only';
import type { ObjectId } from 'mongodb';
import { getDb } from './db';
import { addDays, todayISO } from './dates';
import { convert } from './money';
import { SEAT_HOLDING } from './bookings';
import type { Booking, Customer, Departure, Lead, Payment, Task, Tenant, TravelPackage } from './types';

/** First day of the month `offset` months from the current one (YYYY-MM-DD). */
export function monthStart(offset = 0): string {
  const [y, m] = todayISO().split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return d.toISOString().slice(0, 10);
}

export async function dashboardData(tenant: Tenant, userId: ObjectId) {
  const db = await getDb();
  const tenantId = tenant._id;
  const cur = tenant.settings.currency;
  const rate = tenant.settings.usdRate;
  const today = todayISO();
  const in30 = addDays(today, 30);
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const since90 = new Date(Date.now() - 90 * 86400_000);
  const monthFrom = monthStart(0);
  const sixMonthsFrom = monthStart(-5);

  const [
    newLeads,
    leadStages90,
    stageCounts,
    bookingsMonth,
    payments,
    openBookings,
    upcomingCount,
    overdueTasks,
    myTasks,
    pendingVisas,
    followUps,
    recentLeads,
  ] = await Promise.all([
    db.collection<Lead>('leads').countDocuments({ tenantId, createdAt: { $gte: since30 } }),
    db
      .collection<Lead>('leads')
      .aggregate<{ _id: string; n: number }>([
        { $match: { tenantId, createdAt: { $gte: since90 } } },
        { $group: { _id: '$stage', n: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection<Lead>('leads')
      .aggregate<{ _id: string; n: number }>([
        { $match: { tenantId } },
        { $group: { _id: '$stage', n: { $sum: 1 } } },
      ])
      .toArray(),
    db.collection<Booking>('bookings').countDocuments({
      tenantId,
      status: { $ne: 'cancelled' },
      createdAt: { $gte: new Date(`${monthFrom}T00:00:00Z`) },
    }),
    db
      .collection<Payment>('payments')
      .find(
        { tenantId, voided: false, date: { $gte: sixMonthsFrom } },
        { projection: { amount: 1, currency: 1, kind: 1, date: 1 } },
      )
      .toArray(),
    db
      .collection<Booking>('bookings')
      .find(
        { tenantId, status: { $in: ['draft', 'confirmed'] } },
        {
          projection: {
            total: 1,
            paid: 1,
            currency: 1,
            travelDate: 1,
            number: 1,
            title: 1,
            customerId: 1,
            travellerIds: 1,
            returnDate: 1,
          },
        },
      )
      .toArray(),
    db.collection<Booking>('bookings').countDocuments({
      tenantId,
      status: { $in: ['confirmed', 'draft'] },
      travelDate: { $gte: today, $lte: in30 },
    }),
    db
      .collection<Task>('tasks')
      .countDocuments({ tenantId, done: false, assignedTo: userId, dueDate: { $lt: today } }),
    db
      .collection<Task>('tasks')
      .find({ tenantId, done: false, assignedTo: userId })
      .sort({ dueDate: 1 })
      .limit(6)
      .toArray(),
    db.collection('visas').countDocuments({ tenantId, status: { $in: ['collecting', 'submitted'] } }),
    db.collection<Lead>('leads').countDocuments({
      tenantId,
      stage: { $in: ['new', 'contacted', 'quoted'] },
      nextFollowUp: { $lte: today },
    }),
    db.collection<Lead>('leads').find({ tenantId }).sort({ createdAt: -1 }).limit(5).toArray(),
  ]);

  const toCur = (amount: number, c: 'IQD' | 'USD') => convert(amount, c, cur, rate);
  const signed = (p: Payment) => (p.kind === 'refund' ? -1 : 1) * toCur(p.amount, p.currency);

  const months = Array.from({ length: 6 }, (_, i) => monthStart(i - 5).slice(0, 7));
  const byMonth = months.map((m) => ({
    month: m,
    value: payments.filter((p) => p.date.startsWith(m)).reduce((s, p) => s + signed(p), 0),
  }));
  const collectedMonth = byMonth[byMonth.length - 1]!.value;
  const receivables = openBookings.reduce((s, b) => s + Math.max(0, toCur(b.total - b.paid, b.currency)), 0);

  const won = leadStages90.find((r) => r._id === 'won')?.n ?? 0;
  const total90 = leadStages90.reduce((s, r) => s + r.n, 0);
  const conversion = total90 ? Math.round((won / total90) * 100) : null;

  // Bookings travelling within 14 days that still owe money.
  const in14 = addDays(today, 14);
  const unpaidSoon = openBookings.filter(
    (b) => b.travelDate && b.travelDate >= today && b.travelDate <= in14 && b.total > b.paid,
  );

  // Passports that expire within 6 months of the return date, for upcoming trips.
  const upcoming = openBookings.filter(
    (b) =>
      b.travelDate && b.travelDate >= today && b.travelDate <= addDays(today, 120) && b.travellerIds.length,
  );
  let passportAlerts = 0;
  if (upcoming.length) {
    const customers = await db
      .collection<Customer>('customers')
      .find({ tenantId, _id: { $in: upcoming.map((b) => b.customerId) } }, { projection: { travellers: 1 } })
      .toArray();
    for (const b of upcoming) {
      const c = customers.find((x) => String(x._id) === String(b.customerId));
      const limit = addDays(b.returnDate ?? b.travelDate!, 183);
      passportAlerts += (c?.travellers ?? []).filter(
        (t) =>
          b.travellerIds.some((id) => String(id) === String(t._id)) &&
          t.passportExpiry &&
          t.passportExpiry < limit,
      ).length;
    }
  }

  // Next departures with seats.
  const deps = await db
    .collection<Departure>('departures')
    .find({ tenantId, date: { $gte: today }, closed: false })
    .sort({ date: 1 })
    .limit(5)
    .toArray();
  const [pkgs, seatRows] = await Promise.all([
    db
      .collection<TravelPackage>('packages')
      .find({ _id: { $in: deps.map((d) => d.packageId) } }, { projection: { title: 1 } })
      .toArray(),
    db
      .collection('bookings')
      .aggregate<{ _id: ObjectId; n: number }>([
        { $match: { tenantId, departureId: { $in: deps.map((d) => d._id) }, status: { $in: SEAT_HOLDING } } },
        { $group: { _id: '$departureId', n: { $sum: { $add: ['$adults', '$children'] } } } },
      ])
      .toArray(),
  ]);
  const departures = deps.map((d) => ({
    id: String(d._id),
    packageId: String(d.packageId),
    title: pkgs.find((p) => String(p._id) === String(d.packageId))?.title ?? '—',
    date: d.date,
    left: d.capacity - (seatRows.find((r) => String(r._id) === String(d._id))?.n ?? 0),
  }));

  return {
    currency: cur,
    newLeads,
    conversion,
    bookingsMonth,
    collectedMonth,
    receivables,
    upcomingCount,
    byMonth,
    stages: Object.fromEntries(stageCounts.map((r) => [r._id, r.n])) as Record<string, number>,
    alerts: { overdueTasks, passportAlerts, unpaidSoon: unpaidSoon.length, pendingVisas, followUps },
    myTasks,
    recentLeads,
    departures,
  };
}
