import type { Metadata } from 'next';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import type { Filter } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { getStaff, pageParams, PAGE_SIZE, searchRegex } from '@/lib/queries';
import { formatDate, isISODate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { formatMulti } from '@/lib/money-multi';
import { paymentMethods, type Payment } from '@/lib/types';
import { Badge, Card, EmptyState, PageHeader, Stat, Table } from '@/components/ui';
import { Pagination } from '@/components/ListControls';
import { buttonClass } from '@/components/ui';

export const metadata: Metadata = { title: 'Payments' };

type SP = { q?: string; method?: string; kind?: string; from?: string; to?: string; page?: string };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireTenant('finance.read');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const r = await repo(ctx);
  const filter: Filter<Payment> = {};
  if (sp.method && (paymentMethods as readonly string[]).includes(sp.method))
    filter.method = sp.method as Payment['method'];
  if (sp.kind === 'payment' || sp.kind === 'refund') filter.kind = sp.kind;
  const range: Record<string, string> = {};
  if (sp.from && isISODate(sp.from)) range.$gte = sp.from;
  if (sp.to && isISODate(sp.to)) range.$lte = sp.to;
  if (Object.keys(range).length) filter.date = range;
  if (sp.q?.trim()) filter.number = searchRegex(sp.q.trim());

  const { page, skip } = pageParams(sp.page);
  const [items, total, sums, staff] = await Promise.all([
    r.payments.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(PAGE_SIZE).toArray(),
    r.payments.countDocuments(filter),
    r.payments
      .aggregate<{ _id: { k: string; c: 'IQD' | 'USD' }; n: number }>([
        { $match: { ...filter, voided: false } },
        { $group: { _id: { k: '$kind', c: '$currency' }, n: { $sum: '$amount' } } },
      ])
      .toArray(),
    getStaff(ctx.tenantId),
  ]);
  const sumOf = (kind: string) =>
    Object.fromEntries(sums.filter((s) => s._id.k === kind).map((s) => [s._id.c, s.n])) as Partial<
      Record<'IQD' | 'USD', number>
    >;
  const inSum = sumOf('payment');
  const outSum = sumOf('refund');
  const net = { IQD: (inSum.IQD ?? 0) - (outSum.IQD ?? 0), USD: (inSum.USD ?? 0) - (outSum.USD ?? 0) };
  const [bookings, customers] = await Promise.all([
    r.all.bookings
      .find({ _id: { $in: items.map((p) => p.bookingId) } }, { projection: { number: 1 } })
      .toArray(),
    r.customers.find({ _id: { $in: items.map((p) => p.customerId) } }, { projection: { name: 1 } }).toArray(),
  ]);
  const params = { q: sp.q, method: sp.method, kind: sp.kind, from: sp.from, to: sp.to };
  const exportQs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <>
      <PageHeader
        title={t('payments.title')}
        intro={t('payments.intro')}
        actions={
          can(ctx.role, 'data.export') && (
            <a
              href={`/api/export/payments${exportQs ? `?${exportQs}` : ''}`}
              className={buttonClass()}
              download
            >
              {t('common.exportCsv')}
            </a>
          )
        }
      />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('payments.number')}
          <input name="q" defaultValue={sp.q} className="field-input w-40" dir="ltr" />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('payments.method')}
          <select name="method" defaultValue={sp.method ?? ''} className="field-input">
            <option value="">{t('common.all')}</option>
            {paymentMethods.map((m) => (
              <option key={m} value={m}>
                {t(`payments.methods.${m}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('payments.kind')}
          <select name="kind" defaultValue={sp.kind ?? ''} className="field-input">
            <option value="">{t('common.all')}</option>
            <option value="payment">{t('payments.kinds.payment')}</option>
            <option value="refund">{t('payments.kinds.refund')}</option>
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
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={t('payments.totalIn')} value={formatMulti(inSum, lang)} />
        <Stat label={t('payments.totalOut')} value={formatMulti(outSum, lang)} />
        <Stat label={t('payments.net')} value={formatMulti(net, lang)} />
      </div>
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={Wallet} title={t('common.noResults')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('payments.number')}</th>
                <th>{t('common.date')}</th>
                <th>{t('bookings.customer')}</th>
                <th>{t('payments.booking')}</th>
                <th>{t('payments.kind')}</th>
                <th>{t('payments.method')}</th>
                <th>{t('common.amount')}</th>
                <th>{t('common.by')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={String(p._id)} className={p.voided ? 'opacity-50' : ''}>
                  <td>
                    <Link
                      href={`/print/receipt/${p._id}`}
                      target="_blank"
                      className="font-latin hover:underline"
                    >
                      {p.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(p.date, lang)}</td>
                  <td>{customers.find((c) => String(c._id) === String(p.customerId))?.name ?? '—'}</td>
                  <td>
                    <Link href={`/bookings/${p.bookingId}`} className="font-latin text-info hover:underline">
                      {bookings.find((b) => String(b._id) === String(p.bookingId))?.number ?? '—'}
                    </Link>
                  </td>
                  <td>
                    {p.voided ? (
                      <Badge tone="danger">{t('payments.voided')}</Badge>
                    ) : (
                      <Badge tone={p.kind === 'refund' ? 'warning' : 'success'}>
                        {t(`payments.kinds.${p.kind}`)}
                      </Badge>
                    )}
                  </td>
                  <td>{t(`payments.methods.${p.method}`)}</td>
                  <td className="num whitespace-nowrap font-medium">
                    {p.kind === 'refund' ? '−' : ''}
                    {formatMoney(p.amount, p.currency, lang)}
                  </td>
                  <td className="text-muted">
                    {staff.find((s) => s.id === String(p.receivedBy))?.name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination base="/payments" params={params} page={page} total={total} />
      </Card>
    </>
  );
}
