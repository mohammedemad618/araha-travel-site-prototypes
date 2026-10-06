import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { can } from '@/lib/rbac';
import { Card, PageHeader } from '@/components/ui';
import { SettingsTabs } from './SettingsTabs';
import { CompanyForm } from './SettingsForms';

export const metadata: Metadata = { title: 'Settings' };

export default async function CompanySettingsPage() {
  const ctx = await requireTenant();
  if (!can(ctx.role, 'settings.manage'))
    redirect(can(ctx.role, 'users.manage') ? '/settings/users' : '/settings/audit');
  const { t } = await getI18n();
  const s = ctx.tenant.settings;
  return (
    <>
      <PageHeader title={t('settings.title')} />
      <SettingsTabs ctx={ctx} active="company" />
      <Card>
        <CompanyForm
          values={{
            name: ctx.tenant.name,
            currency: s.currency,
            usdRate: s.usdRate,
            accent: s.accent,
            bookingPrefix: s.bookingPrefix,
            receiptPrefix: s.receiptPrefix,
            phone: s.phone,
            address: s.address,
            invoiceFooter: s.invoiceFooter,
          }}
        />
      </Card>
    </>
  );
}
