import type { Metadata } from 'next';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { Card, PageHeader } from '@/components/ui';
import { CustomerForm } from '../CustomerForm';

export const metadata: Metadata = { title: 'New customer' };

export default async function NewCustomerPage() {
  await requireTenant('customers.write');
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t('customers.new')} back={{ href: '/customers', label: t('customers.title') }} />
      <Card>
        <CustomerForm />
      </Card>
    </>
  );
}
