import type { Metadata } from 'next';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getStaff } from '@/lib/queries';
import { packageOptions } from '@/lib/lookups';
import { Card, PageHeader } from '@/components/ui';
import { LeadForm } from '../LeadForm';

export const metadata: Metadata = { title: 'New lead' };

export default async function NewLeadPage() {
  const ctx = await requireTenant('leads.write');
  const { t } = await getI18n();
  const [staff, packages] = await Promise.all([getStaff(ctx.tenantId), packageOptions(ctx.tenantId)]);
  return (
    <>
      <PageHeader title={t('leads.new')} back={{ href: '/leads', label: t('leads.title') }} />
      <Card>
        <LeadForm staff={staff.filter((s) => s.active)} packages={packages} me={String(ctx.user._id)} />
      </Card>
    </>
  );
}
