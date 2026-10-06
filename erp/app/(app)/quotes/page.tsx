import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import type { Filter } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { getStaff, pageParams, PAGE_SIZE, searchRegex } from '@/lib/queries';
import { formatDate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { quoteState } from '@/lib/quotes';
import { QUOTE_TONE } from '@/lib/ui-tones';
import { quoteStatuses, type Quote } from '@/lib/types';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table } from '@/components/ui';
import { FilterBar, Pagination } from '@/components/ListControls';

export const metadata: Metadata = { title: 'Quotes' };

type SP = { q?: string; status?: string; page?: string };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireTenant('quotes.read');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const r = await repo(ctx);
  const today = todayISO();
  const filter: Filter<Quote> = {};
  if (sp.status === 'expired') {
    filter.status = { $in: ['draft', 'sent'] };
    filter.validUntil = { $lt: today };
  } else if (sp.status && (quoteStatuses as readonly string[]).includes(sp.status)) {
    filter.status = sp.status as Quote['status'];
  }
  if (sp.q?.trim()) {
    const re = searchRegex(sp.q.trim());
    const customers = await r.customers
      .find({ $or: [{ name: re }, { phone: re }] }, { projection: { _id: 1 } })
      .limit(200)
      .toArray();
    filter.$or = [{ number: re }, { title: re }, { customerId: { $in: customers.map((c) => c._id) } }];
  }
  const { page, skip } = pageParams(sp.page);
  const [items, total, staff, open] = await Promise.all([
    r.quotes.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).toArray(),
    r.quotes.countDocuments(filter),
    getStaff(ctx.tenantId),
    r.quotes
      .aggregate<{ _id: string; n: number; total: number }>([
        { $match: { status: { $in: ['draft', 'sent'] } } },
        { $group: { _id: '$currency', n: { $sum: 1 }, total: { $sum: '$total' } } },
      ])
      .toArray(),
  ]);
  const customers = await r.customers
    .find({ _id: { $in: items.map((q) => q.customerId) } }, { projection: { name: 1 } })
    .toArray();

  return (
    <>
      <PageHeader
        title={t('quotes.title')}
        intro={
          open.length
            ? t('quotes.openSummary', {
                count: open.reduce((s, o) => s + o.n, 0),
                value: open.map((o) => formatMoney(o.total, o._id as 'IQD' | 'USD', lang)).join(' + '),
              })
            : t('quotes.intro')
        }
        actions={
          can(ctx.role, 'quotes.write') && (
            <LinkButton href="/quotes/new" variant="primary" icon={Plus}>
              {t('quotes.new')}
            </LinkButton>
          )
        }
      />
      <FilterBar
        q={sp.q}
        selects={[
          {
            name: 'status',
            label: t('common.status'),
            value: sp.status,
            options: [...quoteStatuses, 'expired' as const].map((s) => ({
              value: s,
              label: t(`quotes.statuses.${s}`),
            })),
          },
        ]}
      />
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={FileText} title={t('common.noResults')} body={t('quotes.intro')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('quotes.number')}</th>
                <th>{t('bookings.titleField')}</th>
                <th>{t('bookings.customer')}</th>
                <th>{t('bookings.travelDate')}</th>
                <th>{t('bookings.total')}</th>
                <th>{t('common.status')}</th>
                <th>{t('quotes.validUntil')}</th>
                <th>{t('common.assignedTo')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => {
                const state = quoteState(q, today);
                return (
                  <tr key={String(q._id)}>
                    <td>
                      <Link
                        href={`/quotes/${q._id}`}
                        className="font-latin font-medium whitespace-nowrap hover:underline"
                      >
                        {q.number}
                      </Link>
                    </td>
                    <td className="max-w-[260px] truncate">{q.title}</td>
                    <td>{customers.find((c) => String(c._id) === String(q.customerId))?.name ?? '—'}</td>
                    <td className="whitespace-nowrap">
                      {q.travelDate ? formatDate(q.travelDate, lang) : '—'}
                    </td>
                    <td className="num whitespace-nowrap">{formatMoney(q.total, q.currency, lang)}</td>
                    <td>
                      <Badge tone={QUOTE_TONE[state]}>{t(`quotes.statuses.${state}`)}</Badge>
                    </td>
                    <td className="whitespace-nowrap text-muted">
                      {q.validUntil ? formatDate(q.validUntil, lang) : '—'}
                    </td>
                    <td className="text-muted">
                      {staff.find((s) => s.id === String(q.assignedTo))?.name ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination base="/quotes" params={{ q: sp.q, status: sp.status }} page={page} total={total} />
      </Card>
    </>
  );
}
