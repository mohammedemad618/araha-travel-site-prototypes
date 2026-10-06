import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import type { Filter } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { nameOrPhone, pageParams, PAGE_SIZE } from '@/lib/queries';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { Customer } from '@/lib/types';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, buttonClass } from '@/components/ui';
import { FilterBar, Pagination } from '@/components/ListControls';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}) {
  const ctx = await requireTenant('customers.read');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const r = await repo(ctx);
  const filter: Filter<Customer> = { ...(nameOrPhone(sp.q) as Filter<Customer>) };
  if (sp.tag) filter.tags = sp.tag;
  const { page, skip } = pageParams(sp.page);
  const [items, total, tags] = await Promise.all([
    r.customers.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).toArray(),
    r.customers.countDocuments(filter),
    r.customers.distinct('tags') as Promise<string[]>,
  ]);
  // Totals per customer in the company currency (bookings in the other currency are shown separately).
  const cur = ctx.tenant.settings.currency;
  const sums = await r.bookings
    .aggregate<{ _id: { c: unknown; cur: string }; total: number; paid: number; n: number }>([
      {
        $match: {
          customerId: { $in: items.map((c) => c._id) },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: { c: '$customerId', cur: '$currency' },
          total: { $sum: '$total' },
          paid: { $sum: '$paid' },
          n: { $sum: 1 },
        },
      },
    ])
    .toArray();
  const stats = (id: unknown) => {
    const rows = sums.filter((r) => String(r._id.c) === String(id));
    return {
      n: rows.reduce((s, r) => s + r.n, 0),
      due: rows.filter((r) => r._id.cur === cur).reduce((s, r) => s + r.total - r.paid, 0),
    };
  };

  return (
    <>
      <PageHeader
        title={t('customers.title')}
        intro={t('customers.intro')}
        actions={
          <>
            {can(ctx.role, 'data.export') && (
              <a href="/api/export/customers" className={buttonClass()} download>
                {t('common.exportCsv')}
              </a>
            )}
            {can(ctx.role, 'customers.write') && (
              <LinkButton href="/customers/new" variant="primary" icon={Plus}>
                {t('customers.new')}
              </LinkButton>
            )}
          </>
        }
      />
      <FilterBar
        q={sp.q}
        selects={
          tags.length
            ? [
                {
                  name: 'tag',
                  label: t('customers.tags'),
                  value: sp.tag,
                  options: tags.sort().map((x) => ({ value: x, label: x })),
                },
              ]
            : []
        }
      />
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={Users} title={t('common.noResults')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('common.phone')}</th>
                <th>{t('customers.travellers')}</th>
                <th>{t('customers.bookings')}</th>
                <th>{t('customers.balance')}</th>
                <th>{t('customers.tags')}</th>
                <th>{t('common.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const s = stats(c._id);
                return (
                  <tr key={String(c._id)}>
                    <td>
                      <Link href={`/customers/${c._id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      {c.city && <div className="text-[12.5px] text-muted">{c.city}</div>}
                    </td>
                    <td className="font-latin text-muted" dir="ltr">
                      {c.phone}
                    </td>
                    <td className="num">{c.travellers.length}</td>
                    <td className="num">{s.n}</td>
                    <td className={`num ${s.due > 0 ? 'font-medium text-danger' : 'text-muted'}`}>
                      {s.due > 0 ? formatMoney(s.due, cur, lang) : '—'}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((tag) => (
                          <Badge key={tag} tone="gold">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="text-muted">{formatDate(c.createdAt, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination base="/customers" params={{ q: sp.q, tag: sp.tag }} page={page} total={total} />
      </Card>
    </>
  );
}
