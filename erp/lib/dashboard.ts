import 'server-only';
import type { ObjectId } from 'mongodb';
import { repo } from './repo';
import type { TenantCtx } from './session';
import { addDays, todayISO } from './dates';
import { convert } from './money';
import { SEAT_HOLDING } from './bookings';
import type { Payment } from './types';

/** First day of the month `offset` months from the current one (YYYY-MM-DD). */
export function monthStart(offset = 0): string {
  const [y, m] = todayISO().split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return d.toISOString().slice(0, 10);
}

/** Figures for the member's dashboard, limited to the branches/records they can see. */
export async function dashboardData(ctx: TenantCtx) {
  const r = await repo(ctx);
  const tenant = ctx.tenant;
  const userId = ctx.user._id;
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
    r.leads.countDocuments({ createdAt: { $gte: since30 } }),
    r.leads
      .aggregate<{ _id: string; n: number }>([
        { $match: { createdAt: { $gte: since90 } } },
        { $group: { _id: '$stage', n: { $sum: 1 } } },
      ])
      .toArray(),
    r.leads.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$stage', n: { $sum: 1 } } }]).toArray(),
    r.bookings.countDocuments({
      status: { $ne: 'cancelled' },
      createdAt: { $gte: new Date(`${monthFrom}T00:00:00Z`) },
    }),
    r.payments
      .find(
        { voided: false, date: { $gte: sixMonthsFrom } },
        { projection: { amount: 1, currency: 1, kind: 1, date: 1 } },
      )
      .toArray(),
    r.bookings
      .find(
        { status: { $in: ['draft', 'confirmed'] } },
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
            services: 1,
          },
        },
      )
      .toArray(),
    r.bookings.countDocuments({
      status: { $in: ['confirmed', 'draft'] },
      travelDate: { $gte: today, $lte: in30 },
    }),
    r.tasks.countDocuments({ done: false, assignedTo: userId, dueDate: { $lt: today } }),
    r.tasks.find({ done: false, assignedTo: userId }).sort({ dueDate: 1 }).limit(6).toArray(),
    r.visas.countDocuments({ status: { $in: ['collecting', 'submitted'] } }),
    r.leads.countDocuments({
      stage: { $in: ['new', 'contacted', 'quoted'] },
      nextFollowUp: { $lte: today },
    }),
    r.leads.find({}).sort({ createdAt: -1 }).limit(5).toArray(),
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

  // Trips within 14 days with services the supplier has not confirmed yet.
  const unconfirmed = openBookings.filter(
    (b) =>
      b.travelDate &&
      b.travelDate >= today &&
      b.travelDate <= in14 &&
      (b.services ?? []).some((l) => l.status === 'pending' || l.status === 'requested'),
  ).length;

  // Passports that expire within 6 months of the return date, for upcoming trips.
  const upcoming = openBookings.filter(
    (b) =>
      b.travelDate && b.travelDate >= today && b.travelDate <= addDays(today, 120) && b.travellerIds.length,
  );
  let passportAlerts = 0;
  if (upcoming.length) {
    const customers = await r.customers
      .find({ _id: { $in: upcoming.map((b) => b.customerId) } }, { projection: { travellers: 1 } })
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
  const deps = await r.departures
    .find({ date: { $gte: today }, closed: false })
    .sort({ date: 1 })
    .limit(5)
    .toArray();
  const [pkgs, seatRows] = await Promise.all([
    r.packages.find({ _id: { $in: deps.map((d) => d.packageId) } }, { projection: { title: 1 } }).toArray(),
    // Seats are shared by every branch.
    r.all.bookings
      .aggregate<{ _id: ObjectId; n: number }>([
        { $match: { departureId: { $in: deps.map((d) => d._id) }, status: { $in: SEAT_HOLDING } } },
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
    alerts: {
      overdueTasks,
      passportAlerts,
      unpaidSoon: unpaidSoon.length,
      pendingVisas,
      followUps,
      unconfirmed,
    },
    myTasks,
    recentLeads,
    departures,
  };
}
