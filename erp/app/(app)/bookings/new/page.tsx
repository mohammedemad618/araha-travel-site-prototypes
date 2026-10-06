import type { Metadata } from 'next';
import { branchOptions, requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { getStaff } from '@/lib/queries';
import { packageChoices } from '@/lib/package-choices';
import { Card, PageHeader } from '@/components/ui';
import { BookingForm } from '../BookingForm';

export const metadata: Metadata = { title: 'New booking' };

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const ctx = await requireTenant('bookings.write');
  const { t, lang } = await getI18n();
  const customerId = toObjectId((await searchParams).customer);
  const r = await repo(ctx);
  const [customer, packages, staff] = await Promise.all([
    customerId ? r.customers.findOne({ _id: customerId }) : null,
    packageChoices(ctx.tenantId, lang),
    getStaff(ctx.tenantId),
  ]);
  return (
    <>
      <PageHeader title={t('bookings.new')} back={{ href: '/bookings', label: t('bookings.title') }} />
      <Card>
        <BookingForm
          packages={packages}
          staff={staff.filter((s) => s.active)}
          branches={branchOptions(ctx)}
          me={String(ctx.user._id)}
          defaultCurrency={ctx.tenant.settings.currency}
          values={
            customer
              ? { customer: { id: String(customer._id), name: customer.name, phone: customer.phone } }
              : {}
          }
        />
      </Card>
    </>
  );
}
