import type { Metadata } from 'next';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import type { Filter } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { pageParams, PAGE_SIZE, searchRegex } from '@/lib/queries';
import { formatDate, isISODate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { formatMulti } from '@/lib/money-multi';
import { paymentState } from '@/lib/bookings';
import { PAY_TONE } from '@/lib/ui-tones';
import type { Currency, Invoice } from '@/lib/types';
import { Badge, Card, EmptyState, PageHeader, Stat, Table, buttonClass } from '@/components/ui';
import { Pagination } from '@/components/ListControls';

export const metadata: Metadata = { title: 'Invoices' };

type SP = { q?: string; status?: string; from?: string; to?: string; page?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireTenant('finance.read');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const r = await repo(ctx);
  const filter: Filter<Invoice> = {};
  if (sp.status === 'issued' || sp.status === 'void') filter.status = sp.status;
  const range: Record<string, string> = {};
  if (sp.from && isISODate(sp.from)) range.$gte = sp.from;
  if (sp.to && isISODate(sp.to)) range.$lte = sp.to;
  if (Object.keys(range).length) filter.date = range;
  if (sp.q?.trim()) {
    const re = searchRegex(sp.q.trim());
    filter.$or = [{ number: re }, { 'customer.name': re }, { 'customer.phone': re }];
  }
  const { page, skip } = pageParams(sp.page);
  const [items, total, sums] = await Promise.all([
    r.invoices.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(PAGE_SIZE).toArray(),
    r.invoices.countDocuments(filter),
    r.invoices
      .aggregate<{ _id: Currency; n: number }>([
        { $match: { ...filter, status: 'issued' } },
        { $group: { _id: '$currency', n: { $sum: '$total' } } },
      ])
      .toArray(),
  ]);
  // Payment state comes from the booking, where payments are recorded.
  const bookings = await r.all.bookings
    .find({ _id: { $in: items.map((i) => i.bookingId) } }, { projection: { number: 1, total: 1, paid: 1 } })
    .toArray();
  const issued = Object.fromEntries(sums.map((s) => [s._id, s.n])) as Partial<Record<Currency, number>>;
  const today = todayISO();
  const params = { q: sp.q, status: sp.status, from: sp.from, to: sp.to };

  return (
    <>
      <PageHeader title={t('invoices.title')} intro={t('invoices.intro')} />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('common.search')}
          <input name="q" defaultValue={sp.q} className="field-input w-52" />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('common.status')}
          <select name="status" defaultValue={sp.status ?? ''} className="field-input">
            <option value="">{t('common.all')}</option>
            <option value="issued">{t('invoices.statuses.issued')}</option>
            <option value="void">{t('invoices.statuses.void')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('reports.from')}
          <input type="date" name="from" defaultValue={sp.from} className="field-input" />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('reports.to')}
          <input type="date" name="to" defaultValue={sp.to} className="field-input" />
        </label>
        <button type="submit" className={buttonClass('secondary')}>
          {t('common.filter')}
        </button>
      </form>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stat label={t('invoices.totalIssued')} value={formatMulti(issued, lang)} />
        <Stat label={t('invoices.count')} value={String(total)} />
      </div>
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={Receipt} title={t('common.noResults')} body={t('invoices.intro')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('invoices.number')}</th>
                <th>{t('invoices.date')}</th>
                <th>{t('bookings.customer')}</th>
                <th>{t('payments.booking')}</th>
                <th>{t('bookings.total')}</th>
                <th>{t('invoices.payment')}</th>
                <th>{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => {
                const b = bookings.find((x) => String(x._id) === String(inv.bookingId));
                const pay = b ? paymentState(b) : 'unpaid';
                const overdue =
                  inv.status === 'issued' && inv.dueDate && inv.dueDate < today && pay !== 'paidFull';
                return (
                  <tr key={String(inv._id)} className={inv.status === 'void' ? 'opacity-55' : ''}>
                    <td>
                      <Link
                        href={`/print/invoice/${inv._id}`}
                        target="_blank"
                        className="font-latin font-medium hover:underline"
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(inv.date, lang)}</td>
                    <td>{inv.customer.name}</td>
                    <td>
                      {b && (
                        <Link href={`/bookings/${b._id}`} className="font-latin text-info hover:underline">
                          {b.number}
                        </Link>
                      )}
                    </td>
                    <td className="num whitespace-nowrap">{formatMoney(inv.total, inv.currency, lang)}</td>
                    <td>
                      {inv.status === 'issued' && (
                        <span className="flex flex-wrap gap-1">
                          <Badge tone={PAY_TONE[pay]}>{t(`bookings.${pay}`)}</Badge>
                          {overdue && <Badge tone="danger">{t('invoices.overdue')}</Badge>}
                        </span>
                      )}
                    </td>
                    <td>
                      {inv.status === 'void' ? (
                        <Badge tone="danger">{t('invoices.statuses.void')}</Badge>
                      ) : b && b.total !== inv.total ? (
                        <Badge tone="warning">{t('invoices.outdated')}</Badge>
                      ) : (
                        <Badge tone="success">{t('invoices.statuses.issued')}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination base="/invoices" params={params} page={page} total={total} />
      </Card>
    </>
  );
}
