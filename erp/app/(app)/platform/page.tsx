import type { Metadata } from 'next';
import { requirePlatform } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/dates';
import { enterTenant } from '@/lib/actions/platform-switch';
import { setTenantStatus } from '@/lib/actions/platform';
import { Badge, Card, PageHeader, Table, buttonClass } from '@/components/ui';
import { ActionButton } from '@/components/form';
import type { Tenant } from '@/lib/types';
import { NewTenantForm } from './NewTenantForm';

export const metadata: Metadata = { title: 'Platform' };

export default async function PlatformPage() {
  await requirePlatform();
  const { t, lang } = await getI18n();
  const db = await getDb();
  const tenants = await db.collection<Tenant>('tenants').find().sort({ createdAt: -1 }).toArray();
  const [userCounts, bookingCounts] = await Promise.all([
    db
      .collection('users')
      .aggregate<{ _id: unknown; n: number }>([{ $group: { _id: '$tenantId', n: { $sum: 1 } } }])
      .toArray(),
    db
      .collection('bookings')
      .aggregate<{ _id: unknown; n: number }>([{ $group: { _id: '$tenantId', n: { $sum: 1 } } }])
      .toArray(),
  ]);
  const count = (rows: { _id: unknown; n: number }[], id: unknown) =>
    rows.find((r) => String(r._id) === String(id))?.n ?? 0;

  return (
    <>
      <PageHeader title={t('platform.title')} intro={t('platform.intro')} />
      <Card title={t('platform.newTenant')} className="mb-6">
        <NewTenantForm />
      </Card>
      <Card title={t('platform.tenants')} padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t('settings.companyName')}</th>
              <th>{t('platform.slug')}</th>
              <th>{t('platform.plan')}</th>
              <th>{t('platform.status')}</th>
              <th>{t('platform.users')}</th>
              <th>{t('platform.bookings')}</th>
              <th>{t('common.createdAt')}</th>
              <th>
                <span className="sr-only">{t('common.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tn) => (
              <tr key={String(tn._id)}>
                <td className="font-medium">{tn.name}</td>
                <td className="font-latin text-muted" dir="ltr">
                  {tn.slug}
                </td>
                <td>{t(`platform.plans.${tn.plan}`)}</td>
                <td>
                  <Badge tone={tn.status === 'active' ? 'success' : 'danger'}>
                    {t(`platform.statuses.${tn.status}`)}
                  </Badge>
                </td>
                <td className="num">{count(userCounts, tn._id)}</td>
                <td className="num">{count(bookingCounts, tn._id)}</td>
                <td className="text-muted">{formatDate(tn.createdAt, lang)}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <form action={enterTenant}>
                      <input type="hidden" name="tenantId" value={String(tn._id)} />
                      <button type="submit" className={buttonClass('primary', 'sm')}>
                        {t('platform.enter')}
                      </button>
                    </form>
                    <ActionButton
                      action={setTenantStatus}
                      fields={{ id: String(tn._id), status: tn.status === 'active' ? 'suspended' : 'active' }}
                      variant={tn.status === 'active' ? 'danger' : 'secondary'}
                    >
                      {tn.status === 'active' ? t('platform.suspend') : t('platform.activate')}
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
