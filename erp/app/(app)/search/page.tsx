import type { Metadata } from 'next';
import Link from 'next/link';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { can } from '@/lib/rbac';
import { nameOrPhone, searchRegex } from '@/lib/queries';
import { STAGE_TONE, BOOKING_TONE } from '@/lib/ui-tones';
import type { Booking, Customer, Lead } from '@/lib/types';
import { Badge, Card, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Search' };

/** One search box across customers, leads and bookings. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requireTenant();
  const { t } = await getI18n();
  const q = ((await searchParams).q ?? '').trim();
  const db = await getDb();
  const tenantId = ctx.tenantId;
  const [customers, leads, bookings] = q
    ? await Promise.all([
        can(ctx.role, 'customers.read')
          ? db
              .collection<Customer>('customers')
              .find({ tenantId, ...nameOrPhone(q) })
              .limit(10)
              .toArray()
          : [],
        can(ctx.role, 'leads.read')
          ? db
              .collection<Lead>('leads')
              .find({ tenantId, ...nameOrPhone(q) })
              .sort({ createdAt: -1 })
              .limit(10)
              .toArray()
          : [],
        can(ctx.role, 'bookings.read')
          ? db
              .collection<Booking>('bookings')
              .find({ tenantId, $or: [{ number: searchRegex(q) }, { title: searchRegex(q) }] })
              .sort({ createdAt: -1 })
              .limit(10)
              .toArray()
          : [],
      ])
    : [[], [], []];
  const none = q && !customers.length && !leads.length && !bookings.length;

  return (
    <>
      <PageHeader title={t('common.search')} intro={q ? `«${q}»` : undefined} />
      {none && <p className="text-muted">{t('common.noResults')}</p>}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {customers.length > 0 && (
          <Card title={t('nav.customers')} padded={false}>
            <ul className="m-0 list-none divide-y divide-line p-0">
              {customers.map((c) => (
                <li key={String(c._id)} className="px-5 py-3">
                  <Link href={`/customers/${c._id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  <div className="font-latin text-[12.5px] text-muted" dir="ltr">
                    {c.phone}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {leads.length > 0 && (
          <Card title={t('nav.leads')} padded={false}>
            <ul className="m-0 list-none divide-y divide-line p-0">
              {leads.map((l) => (
                <li key={String(l._id)} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <Link href={`/leads/${l._id}`} className="font-medium hover:underline">
                      {l.name}
                    </Link>
                    <div className="font-latin text-[12.5px] text-muted" dir="ltr">
                      {l.phone}
                    </div>
                  </div>
                  <Badge tone={STAGE_TONE[l.stage]}>{t(`leads.stages.${l.stage}`)}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {bookings.length > 0 && (
          <Card title={t('nav.bookings')} padded={false}>
            <ul className="m-0 list-none divide-y divide-line p-0">
              {bookings.map((b) => (
                <li key={String(b._id)} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/bookings/${b._id}`} className="font-latin font-medium hover:underline">
                      {b.number}
                    </Link>
                    <div className="truncate text-[12.5px] text-muted">{b.title}</div>
                  </div>
                  <Badge tone={BOOKING_TONE[b.status]}>{t(`bookings.statuses.${b.status}`)}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
