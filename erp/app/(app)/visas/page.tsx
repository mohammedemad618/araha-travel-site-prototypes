import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Stamp } from 'lucide-react';
import type { Filter } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { can } from '@/lib/rbac';
import { getStaff, pageParams, PAGE_SIZE, searchRegex } from '@/lib/queries';
import { formatDate, todayISO } from '@/lib/dates';
import { VISA_TONE } from '@/lib/ui-tones';
import { visaStatuses, type VisaApplication } from '@/lib/types';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table } from '@/components/ui';
import { FilterBar, Pagination } from '@/components/ListControls';

export const metadata: Metadata = { title: 'Visas' };

export default async function VisasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const ctx = await requireTenant('visas.read');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const db = await getDb();
  const filter: Filter<VisaApplication> = { tenantId: ctx.tenantId };
  if (sp.status && (visaStatuses as readonly string[]).includes(sp.status))
    filter.status = sp.status as VisaApplication['status'];
  else filter.status = { $nin: ['issued', 'rejected', 'cancelled'] };
  if (sp.status === 'all') delete filter.status;
  if (sp.q?.trim()) {
    const re = searchRegex(sp.q.trim());
    filter.$or = [{ travellerName: re }, { country: re }, { reference: re }];
  }
  const { page, skip } = pageParams(sp.page);
  const [items, total, staff] = await Promise.all([
    db
      .collection<VisaApplication>('visas')
      .find(filter)
      .sort({ expectedAt: 1, updatedAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .toArray(),
    db.collection<VisaApplication>('visas').countDocuments(filter),
    getStaff(ctx.tenantId),
  ]);
  const today = todayISO();
  return (
    <>
      <PageHeader
        title={t('visas.title')}
        intro={t('visas.intro')}
        actions={
          can(ctx.role, 'visas.write') && (
            <LinkButton href="/visas/new" variant="primary" icon={Plus}>
              {t('visas.new')}
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
            options: [
              { value: 'all', label: t('common.showAll') },
              ...visaStatuses.map((s) => ({ value: s, label: t(`visas.statuses.${s}`) })),
            ],
          },
        ]}
      />
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={Stamp} title={t('common.noResults')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('visas.traveller')}</th>
                <th>{t('visas.country')}</th>
                <th>{t('visas.visaType')}</th>
                <th>{t('common.status')}</th>
                <th>{t('visas.submittedAt')}</th>
                <th>{t('visas.expectedAt')}</th>
                <th>{t('common.assignedTo')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={String(v._id)}>
                  <td>
                    <Link href={`/visas/${v._id}`} className="font-medium hover:underline">
                      {v.travellerName}
                    </Link>
                  </td>
                  <td>{v.country}</td>
                  <td className="text-muted">{v.visaType ?? '—'}</td>
                  <td>
                    <Badge tone={VISA_TONE[v.status]}>{t(`visas.statuses.${v.status}`)}</Badge>
                  </td>
                  <td>{v.submittedAt ? formatDate(v.submittedAt, lang) : '—'}</td>
                  <td
                    className={
                      v.expectedAt && v.expectedAt < today && ['collecting', 'submitted'].includes(v.status)
                        ? 'font-medium text-danger'
                        : ''
                    }
                  >
                    {v.expectedAt ? formatDate(v.expectedAt, lang) : '—'}
                  </td>
                  <td className="text-muted">
                    {staff.find((s) => s.id === String(v.assignedTo))?.name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination base="/visas" params={{ q: sp.q, status: sp.status }} page={page} total={total} />
      </Card>
    </>
  );
}
