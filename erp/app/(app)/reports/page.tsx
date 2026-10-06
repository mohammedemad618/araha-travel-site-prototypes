import type { Metadata } from 'next';
import Link from 'next/link';
import { ObjectId } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { can } from '@/lib/rbac';
import { getStaff } from '@/lib/queries';
import { formatDate, isISODate, todayISO } from '@/lib/dates';
import { convert, formatMoney } from '@/lib/money';
import { formatMulti } from '@/lib/money-multi';
import { supplierBalances } from '@/lib/suppliers';
import {
  leadSources,
  type Booking,
  type Currency,
  type Customer,
  type Lead,
  type Payment,
  type Supplier,
  type TravelPackage,
} from '@/lib/types';
import { Card, PageHeader, Table, buttonClass } from '@/components/ui';
import { BarChart } from '@/components/BarChart';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireTenant('reports.read');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const today = todayISO();
  const from = sp.from && isISODate(sp.from) ? sp.from : `${today.slice(0, 4)}-01-01`;
  const to = sp.to && isISODate(sp.to) ? sp.to : today;
  const db = await getDb();
  const tenantId = ctx.tenantId;
  const cur = ctx.tenant.settings.currency;
  const rate = ctx.tenant.settings.usdRate;
  const conv = (v: number, c: Currency) => convert(v, c, cur, rate);
  const money = (v: number) => formatMoney(v, cur, lang);
  const range = { $gte: new Date(`${from}T00:00:00Z`), $lte: new Date(`${to}T23:59:59Z`) };

  const [bookings, payments, leads, staff, packages] = await Promise.all([
    db
      .collection<Booking>('bookings')
      .find(
        { tenantId, status: { $ne: 'cancelled' }, createdAt: range },
        {
          projection: {
            total: 1,
            costTotal: 1,
            currency: 1,
            createdAt: 1,
            packageId: 1,
            adults: 1,
            children: 1,
            assignedTo: 1,
          },
        },
      )
      .toArray(),
    db
      .collection<Payment>('payments')
      .find(
        { tenantId, voided: false, date: { $gte: from, $lte: to } },
        { projection: { amount: 1, currency: 1, kind: 1, date: 1, receivedBy: 1 } },
      )
      .toArray(),
    db
      .collection<Lead>('leads')
      .find({ tenantId, createdAt: range }, { projection: { source: 1, stage: 1 } })
      .toArray(),
    getStaff(tenantId),
    db
      .collection<TravelPackage>('packages')
      .find({ tenantId }, { projection: { title: 1 } })
      .toArray(),
  ]);

  // Monthly sales vs collections.
  const months: string[] = [];
  for (
    let d = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
    d.toISOString().slice(0, 7) <= to.slice(0, 7);
    d.setUTCMonth(d.getUTCMonth() + 1)
  )
    months.push(d.toISOString().slice(0, 7));
  const monthRows = months.map((m) => {
    const bs = bookings.filter((b) => b.createdAt.toISOString().slice(0, 7) === m);
    const sales = bs.reduce((s, b) => s + conv(b.total, b.currency), 0);
    const costs = bs.reduce((s, b) => s + conv(b.costTotal, b.currency), 0);
    const collected = payments
      .filter((p) => p.date.startsWith(m))
      .reduce((s, p) => s + (p.kind === 'refund' ? -1 : 1) * conv(p.amount, p.currency), 0);
    return { m, count: bs.length, sales, costs, profit: sales - costs, collected };
  });
  const totals = monthRows.reduce(
    (a, r) => ({
      count: a.count + r.count,
      sales: a.sales + r.sales,
      costs: a.costs + r.costs,
      profit: a.profit + r.profit,
      collected: a.collected + r.collected,
    }),
    { count: 0, sales: 0, costs: 0, profit: 0, collected: 0 },
  );
  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat(lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(`${m}-01T00:00:00Z`));

  // By package.
  const byPackage = new Map<
    string,
    { title: string; count: number; pax: number; sales: number; profit: number }
  >();
  for (const b of bookings) {
    const key = b.packageId ? String(b.packageId) : '-';
    const title = b.packageId
      ? (packages.find((p) => String(p._id) === key)?.title ?? '—')
      : t('bookings.types.custom');
    const row = byPackage.get(key) ?? { title, count: 0, pax: 0, sales: 0, profit: 0 };
    row.count += 1;
    row.pax += b.adults + b.children;
    row.sales += conv(b.total, b.currency);
    row.profit += conv(b.total - b.costTotal, b.currency);
    byPackage.set(key, row);
  }
  const packageRows = [...byPackage.values()].sort((a, b) => b.sales - a.sales);

  // Leads by source.
  const sourceRows = leadSources
    .map((s) => {
      const ls = leads.filter((l) => l.source === s);
      const won = ls.filter((l) => l.stage === 'won').length;
      return { s, n: ls.length, won, rate: ls.length ? Math.round((won / ls.length) * 100) : 0 };
    })
    .filter((r) => r.n > 0);

  // By staff member.
  const staffRows = staff
    .map((s) => {
      const bs = bookings.filter((b) => String(b.assignedTo) === s.id);
      const collected = payments
        .filter((p) => String(p.receivedBy) === s.id)
        .reduce((sum, p) => sum + (p.kind === 'refund' ? -1 : 1) * conv(p.amount, p.currency), 0);
      return {
        name: s.name,
        count: bs.length,
        sales: bs.reduce((sum, b) => sum + conv(b.total, b.currency), 0),
        collected,
      };
    })
    .filter((r) => r.count || r.collected)
    .sort((a, b) => b.sales - a.sales);

  // Open balances (all time, not limited to the period).
  const receivables = await db
    .collection<Booking>('bookings')
    .find(
      { tenantId, status: { $in: ['draft', 'confirmed', 'completed'] }, $expr: { $gt: ['$total', '$paid'] } },
      { projection: { number: 1, title: 1, total: 1, paid: 1, currency: 1, customerId: 1, travelDate: 1 } },
    )
    .sort({ travelDate: 1 })
    .limit(30)
    .toArray();
  const custs = await db
    .collection<Customer>('customers')
    .find({ _id: { $in: receivables.map((b) => b.customerId) } }, { projection: { name: 1 } })
    .toArray();
  const supplierRows: { id: ObjectId; name: string; owed: Partial<Record<Currency, number>> }[] = [];
  if (can(ctx.role, 'suppliers.read')) {
    const balances = await supplierBalances(tenantId);
    const suppliers = await db
      .collection<Supplier>('suppliers')
      .find(
        { tenantId, _id: { $in: [...balances.keys()].map((k) => new ObjectId(k)) } },
        { projection: { name: 1 } },
      )
      .toArray();
    for (const s of suppliers) {
      const b = balances.get(String(s._id))!;
      const owed = { IQD: b.costs.IQD - b.paid.IQD, USD: b.costs.USD - b.paid.USD };
      if (owed.IQD > 0 || owed.USD > 0) supplierRows.push({ id: s._id, name: s.name, owed });
    }
  }

  return (
    <>
      <PageHeader title={t('reports.title')} intro={t('reports.intro')} />
      <form className="mb-5 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('reports.from')}
          <input type="date" name="from" defaultValue={from} className="field-input" />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('reports.to')}
          <input type="date" name="to" defaultValue={to} className="field-input" />
        </label>
        <button type="submit" className={buttonClass('primary')}>
          {t('reports.apply')}
        </button>
        <p className="m-0 ms-auto max-w-md text-[12.5px] text-faint">
          {t('reports.note', { currency: cur, rate: rate.toLocaleString('en-US') })}
        </p>
      </form>

      <div className="flex flex-col gap-5">
        <Card title={t('reports.salesByMonth')}>
          {monthRows.length > 1 && (
            <div className="mb-5">
              <BarChart
                title={t('reports.sales')}
                data={monthRows.map((r) => ({
                  key: r.m,
                  label: monthLabel(r.m),
                  value: Math.max(0, r.sales),
                  display: money(r.sales),
                }))}
              />
            </div>
          )}
          <Table>
            <thead>
              <tr>
                <th>{t('reports.month')}</th>
                <th>{t('reports.bookings')}</th>
                <th>{t('reports.sales')}</th>
                <th>{t('reports.costs')}</th>
                <th>{t('reports.profit')}</th>
                <th>{t('reports.collected')}</th>
              </tr>
            </thead>
            <tbody>
              {monthRows.map((r) => (
                <tr key={r.m}>
                  <td>{monthLabel(r.m)}</td>
                  <td className="num">{r.count}</td>
                  <td className="num">{money(r.sales)}</td>
                  <td className="num">{money(r.costs)}</td>
                  <td className={`num ${r.profit < 0 ? 'text-danger' : ''}`}>{money(r.profit)}</td>
                  <td className="num">{money(r.collected)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td>{t('common.sum')}</td>
                <td className="num">{totals.count}</td>
                <td className="num">{money(totals.sales)}</td>
                <td className="num">{money(totals.costs)}</td>
                <td className="num">{money(totals.profit)}</td>
                <td className="num">{money(totals.collected)}</td>
              </tr>
            </tfoot>
          </Table>
        </Card>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title={t('reports.byPackage')} padded={false}>
            <Table>
              <thead>
                <tr>
                  <th>{t('bookings.package')}</th>
                  <th>{t('reports.bookings')}</th>
                  <th>{t('bookings.travellers')}</th>
                  <th>{t('reports.sales')}</th>
                  <th>{t('reports.profit')}</th>
                </tr>
              </thead>
              <tbody>
                {packageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      {t('common.noResults')}
                    </td>
                  </tr>
                )}
                {packageRows.map((r) => (
                  <tr key={r.title}>
                    <td>{r.title}</td>
                    <td className="num">{r.count}</td>
                    <td className="num">{r.pax}</td>
                    <td className="num">{money(r.sales)}</td>
                    <td className="num">{money(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card title={t('reports.bySource')} padded={false}>
            <Table>
              <thead>
                <tr>
                  <th>{t('leads.source')}</th>
                  <th>{t('reports.leads')}</th>
                  <th>{t('reports.won')}</th>
                  <th>{t('reports.conversion')}</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted">
                      {t('common.noResults')}
                    </td>
                  </tr>
                )}
                {sourceRows.map((r) => (
                  <tr key={r.s}>
                    <td>{t(`leads.sources.${r.s}`)}</td>
                    <td className="num">{r.n}</td>
                    <td className="num">{r.won}</td>
                    <td className="num">{r.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card title={t('reports.byStaff')} padded={false}>
            <Table>
              <thead>
                <tr>
                  <th>{t('reports.staff')}</th>
                  <th>{t('reports.bookings')}</th>
                  <th>{t('reports.sales')}</th>
                  <th>{t('reports.collected')}</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted">
                      {t('common.noResults')}
                    </td>
                  </tr>
                )}
                {staffRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="num">{r.count}</td>
                    <td className="num">{money(r.sales)}</td>
                    <td className="num">{money(r.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          {supplierRows.length > 0 && (
            <Card title={t('reports.supplierBalances')} padded={false}>
              <Table>
                <thead>
                  <tr>
                    <th>{t('bookings.supplier')}</th>
                    <th>{t('suppliers.owed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierRows.map((r) => (
                    <tr key={String(r.id)}>
                      <td>
                        <Link href={`/suppliers/${r.id}`} className="hover:underline">
                          {r.name}
                        </Link>
                      </td>
                      <td className="num">{formatMulti(r.owed, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>

        <Card title={t('reports.receivables')} padded={false}>
          <Table>
            <thead>
              <tr>
                <th>{t('bookings.number')}</th>
                <th>{t('bookings.customer')}</th>
                <th>{t('bookings.travelDate')}</th>
                <th>{t('bookings.total')}</th>
                <th>{t('bookings.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {receivables.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    {t('common.noResults')}
                  </td>
                </tr>
              )}
              {receivables.map((b) => (
                <tr key={String(b._id)}>
                  <td>
                    <Link href={`/bookings/${b._id}`} className="font-latin text-info hover:underline">
                      {b.number}
                    </Link>
                  </td>
                  <td>{custs.find((c) => String(c._id) === String(b.customerId))?.name ?? '—'}</td>
                  <td>{b.travelDate ? formatDate(b.travelDate, lang) : '—'}</td>
                  <td className="num">{formatMoney(b.total, b.currency, lang)}</td>
                  <td className="num font-medium text-danger">
                    {formatMoney(b.total - b.paid, b.currency, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
