import type { Metadata } from 'next';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { getStaff } from '@/lib/queries';
import { packageChoices } from '@/lib/package-choices';
import type { Customer } from '@/lib/types';
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
  const db = await getDb();
  const [customer, packages, staff] = await Promise.all([
    customerId
      ? db.collection<Customer>('customers').findOne({ _id: customerId, tenantId: ctx.tenantId })
      : null,
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
