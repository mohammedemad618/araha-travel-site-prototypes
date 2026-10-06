import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Plus } from 'lucide-react';
import type { Filter } from 'mongodb';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { getStaff, pageParams, PAGE_SIZE, searchRegex } from '@/lib/queries';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { paymentState } from '@/lib/bookings';
import { BOOKING_TONE, PAY_TONE } from '@/lib/ui-tones';
import { bookingStatuses, bookingTypes, type Booking } from '@/lib/types';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, buttonClass } from '@/components/ui';
import { FilterBar, Pagination } from '@/components/ListControls';

export const metadata: Metadata = { title: 'Bookings' };

type SP = {
  q?: string;
  status?: string;
  type?: string;
  departure?: string;
  due?: string;
  pending?: string;
  page?: string;
};

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireTenant('bookings.read');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const r = await repo(ctx);
  const filter: Filter<Booking> = {};
  if (sp.status && (bookingStatuses as readonly string[]).includes(sp.status))
    filter.status = sp.status as Booking['status'];
  if (sp.type && (bookingTypes as readonly string[]).includes(sp.type))
    filter.type = sp.type as Booking['type'];
  const dep = toObjectId(sp.departure);
  if (dep) filter.departureId = dep;
  if (sp.pending === '1') {
    // Open bookings with services still waiting for the supplier.
    filter.status = { $in: ['draft', 'confirmed'] };
    filter.services = { $elemMatch: { status: { $in: ['pending', 'requested'] } } };
  }
  if (sp.due === '1') {
    filter.status = { $ne: 'cancelled' };
    filter.$expr = { $gt: ['$total', '$paid'] };
  }
  if (sp.q?.trim()) {
    // Search by booking number, title or customer name/phone.
    const re = searchRegex(sp.q.trim());
    const digits = sp.q.replace(/\D/g, '').replace(/^0/, '');
    const customers = await r.customers
      .find(
        {
          $or: [{ name: re }, ...(digits.length >= 3 ? [{ phone: new RegExp(digits) }] : [])],
        },
        { projection: { _id: 1 } },
      )
      .limit(200)
      .toArray();
    filter.$or = [{ number: re }, { title: re }, { customerId: { $in: customers.map((c) => c._id) } }];
  }
  const { page, skip } = pageParams(sp.page);
  const [items, total, staff] = await Promise.all([
    r.bookings.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).toArray(),
    r.bookings.countDocuments(filter),
    getStaff(ctx.tenantId),
  ]);
  const customers = await r.customers
    .find({ _id: { $in: items.map((b) => b.customerId) } }, { projection: { name: 1 } })
    .toArray();
  // A branch column only helps when the member sees more than one branch.
  const multiBranch = (ctx.visibility.branchIds?.length ?? ctx.allBranches.length) > 1;
  const branchOf = (id: unknown) => ctx.allBranches.find((x) => String(x._id) === String(id));
  const customerName = (id: unknown) => customers.find((c) => String(c._id) === String(id))?.name ?? '—';

  return (
    <>
      <PageHeader
        title={t('bookings.title')}
        intro={t('bookings.intro')}
        actions={
          <>
            {can(ctx.role, 'data.export') && (
              <a href="/api/export/bookings" className={buttonClass()} download>
                {t('common.exportCsv')}
              </a>
            )}
            {can(ctx.role, 'bookings.write') && (
              <LinkButton href="/bookings/new" variant="primary" icon={Plus}>
                {t('bookings.new')}
              </LinkButton>
            )}
          </>
        }
      />
      <FilterBar
        q={sp.q}
        hidden={{ departure: sp.departure, pending: sp.pending }}
        selects={[
          {
            name: 'status',
            label: t('common.status'),
            value: sp.status,
            options: bookingStatuses.map((s) => ({ value: s, label: t(`bookings.statuses.${s}`) })),
          },
          {
            name: 'type',
            label: t('bookings.type'),
            value: sp.type,
            options: bookingTypes.map((s) => ({ value: s, label: t(`bookings.types.${s}`) })),
          },
          {
            name: 'due',
            label: t('bookings.balance'),
            value: sp.due,
            options: [{ value: '1', label: t('bookings.unpaid') + ' / ' + t('bookings.partial') }],
          },
        ]}
      />
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={Briefcase} title={t('common.noResults')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('bookings.number')}</th>
                <th>{t('bookings.titleField')}</th>
                <th>{t('bookings.customer')}</th>
                {multiBranch && <th>{t('workspace.branch')}</th>}
                <th>{t('bookings.travelDate')}</th>
                <th>{t('common.status')}</th>
                <th>{t('bookings.total')}</th>
                <th>{t('bookings.balance')}</th>
                <th>{t('common.assignedTo')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={String(b._id)}>
                  <td>
                    <Link
                      href={`/bookings/${b._id}`}
                      className="font-latin font-medium whitespace-nowrap hover:underline"
                    >
                      {b.number}
                    </Link>
                  </td>
                  <td className="max-w-[260px] truncate">{b.title}</td>
                  <td>
                    <Link href={`/customers/${b.customerId}`} className="hover:underline">
                      {customerName(b.customerId)}
                    </Link>
                  </td>
                  {multiBranch && (
                    <td className="font-latin text-muted" title={branchOf(b.branchId)?.name}>
                      {branchOf(b.branchId)?.code ?? '—'}
                    </td>
                  )}
                  <td className="whitespace-nowrap">{b.travelDate ? formatDate(b.travelDate, lang) : '—'}</td>
                  <td>
                    <Badge tone={BOOKING_TONE[b.status]}>{t(`bookings.statuses.${b.status}`)}</Badge>
                  </td>
                  <td className="num whitespace-nowrap">{formatMoney(b.total, b.currency, lang)}</td>
                  <td>
                    {b.status === 'cancelled' ? (
                      '—'
                    ) : (
                      <Badge tone={PAY_TONE[paymentState(b)]}>
                        {formatMoney(b.total - b.paid, b.currency, lang)}
                      </Badge>
                    )}
                  </td>
                  <td className="text-muted">
                    {staff.find((s) => s.id === String(b.assignedTo))?.name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination
          base="/bookings"
          params={{
            q: sp.q,
            status: sp.status,
            type: sp.type,
            departure: sp.departure,
            due: sp.due,
            pending: sp.pending,
          }}
          page={page}
          total={total}
        />
      </Card>
    </>
  );
}
