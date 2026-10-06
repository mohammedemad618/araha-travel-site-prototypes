import type { Metadata } from 'next';
import { branchOptions, requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { getStaff } from '@/lib/queries';
import { Card, PageHeader } from '@/components/ui';
import { VisaForm } from '../VisaForm';

export const metadata: Metadata = { title: 'New visa application' };

export default async function NewVisaPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; booking?: string }>;
}) {
  const ctx = await requireTenant('visas.write');
  const { t } = await getI18n();
  const sp = await searchParams;
  const customerId = toObjectId(sp.customer);
  const r = await repo(ctx);
  const [customer, staff] = await Promise.all([
    customerId ? r.customers.findOne({ _id: customerId }) : null,
    getStaff(ctx.tenantId),
  ]);
  return (
    <>
      <PageHeader title={t('visas.new')} back={{ href: '/visas', label: t('visas.title') }} />
      <Card>
        <VisaForm
          staff={staff.filter((s) => s.active)}
          branches={branchOptions(ctx)}
          me={String(ctx.user._id)}
          values={{
            customer: customer
              ? { id: String(customer._id), name: customer.name, phone: customer.phone }
              : undefined,
            bookingId: sp.booking,
          }}
        />
      </Card>
    </>
  );
}
