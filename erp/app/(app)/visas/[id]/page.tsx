import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenant, toObjectId, branchOptions } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { getStaff } from '@/lib/queries';
import { VISA_TONE } from '@/lib/ui-tones';
import { Badge, Card, PageHeader } from '@/components/ui';
import { Timeline } from '@/components/crm/Timeline';
import { RelatedTasks } from '@/components/crm/RelatedTasks';
import { Attachments } from '@/components/crm/Attachments';
import { VisaForm } from '../VisaForm';
import { DeleteVisaButton } from './DeleteVisa';

export const metadata: Metadata = { title: 'Visa application' };

export default async function VisaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('visas.read');
  const { t } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const v = await r.visas.findOne({ _id: id });
  if (!v) notFound();
  const [customer, booking, staff] = await Promise.all([
    r.customers.findOne({ _id: v.customerId }),
    v.bookingId ? r.bookings.findOne({ _id: v.bookingId }) : null,
    getStaff(ctx.tenantId),
  ]);
  const canWrite = can(ctx.role, 'visas.write');
  return (
    <>
      <PageHeader
        back={{ href: '/visas', label: t('visas.title') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {v.travellerName} · {v.country}
            <Badge tone={VISA_TONE[v.status]}>{t(`visas.statuses.${v.status}`)}</Badge>
          </span>
        }
        intro={
          <span className="flex flex-wrap gap-3">
            {customer && (
              <Link href={`/customers/${customer._id}`} className="text-info hover:underline">
                {t('visas.customer')}: {customer.name}
              </Link>
            )}
            {booking && (
              <Link href={`/bookings/${booking._id}`} className="text-info hover:underline">
                {t('visas.booking')}: {booking.number}
              </Link>
            )}
          </span>
        }
        actions={canWrite && <DeleteVisaButton id={String(id)} />}
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title={t('common.details')}>
          {canWrite ? (
            <VisaForm
              staff={staff.filter((s) => s.active)}
              branches={branchOptions(ctx, v.branchId)}
              me={String(ctx.user._id)}
              values={{
                id: String(v._id),
                branchId: String(v.branchId),
                customer: customer
                  ? { id: String(customer._id), name: customer.name, phone: customer.phone }
                  : undefined,
                travellerId: v.travellerId ? String(v.travellerId) : undefined,
                bookingId: v.bookingId ? String(v.bookingId) : undefined,
                country: v.country,
                visaType: v.visaType,
                status: v.status,
                submittedAt: v.submittedAt,
                expectedAt: v.expectedAt,
                decisionAt: v.decisionAt,
                reference: v.reference,
                notes: v.notes,
                assignedTo: v.assignedTo ? String(v.assignedTo) : '',
              }}
            />
          ) : (
            <p className="m-0 whitespace-pre-wrap">{v.notes ?? '—'}</p>
          )}
        </Card>
        <div className="flex min-w-0 flex-col gap-5">
          <Timeline tenantId={ctx.tenantId} type="visa" id={id} canWrite={canWrite} />
          <RelatedTasks
            tenantId={ctx.tenantId}
            userId={ctx.user._id}
            type="visa"
            id={id}
            path={`/visas/${id}`}
          />
          <Attachments tenantId={ctx.tenantId} type="visa" id={id} canWrite={canWrite} />
        </div>
      </div>
    </>
  );
}
