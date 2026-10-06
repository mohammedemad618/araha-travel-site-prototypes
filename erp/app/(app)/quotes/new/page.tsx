import type { Metadata } from 'next';
import { branchOptions, requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { getStaff } from '@/lib/queries';
import { addDays, todayISO } from '@/lib/dates';
import { Card, PageHeader } from '@/components/ui';
import { QuoteForm } from '../QuoteForm';

export const metadata: Metadata = { title: 'New quote' };

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; lead?: string }>;
}) {
  const ctx = await requireTenant('quotes.write');
  const { t } = await getI18n();
  const sp = await searchParams;
  const r = await repo(ctx);
  const leadId = toObjectId(sp.lead);
  const customerId = toObjectId(sp.customer);
  const [lead, customer, staff] = await Promise.all([
    leadId ? r.leads.findOne({ _id: leadId }) : null,
    customerId ? r.customers.findOne({ _id: customerId }) : null,
    getStaff(ctx.tenantId),
  ]);
  const interest = lead?.interest;
  return (
    <>
      <PageHeader title={t('quotes.new')} back={{ href: '/quotes', label: t('quotes.title') }} />
      <Card>
        <QuoteForm
          staff={staff.filter((s) => s.active)}
          branches={lead ? undefined : branchOptions(ctx)}
          me={String(ctx.user._id)}
          defaultCurrency={ctx.tenant.settings.currency}
          values={{
            leadId: lead ? String(lead._id) : undefined,
            leadName: lead?.name,
            customer: customer
              ? { id: String(customer._id), name: customer.name, phone: customer.phone }
              : undefined,
            title:
              [interest?.packageTitle || interest?.destination, lead?.name].filter(Boolean).join(' — ') ||
              undefined,
            validUntil: addDays(todayISO(), 7),
            assignedTo: lead?.assignedTo ? String(lead.assignedTo) : undefined,
            notes: lead?.message,
          }}
        />
      </Card>
    </>
  );
}
