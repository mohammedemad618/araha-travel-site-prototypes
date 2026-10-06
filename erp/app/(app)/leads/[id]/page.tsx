import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Phone, FileText } from 'lucide-react';
import { requireTenant, toObjectId, branchOptions, branchName } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { getStaff } from '@/lib/queries';
import { packageOptions } from '@/lib/lookups';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatMoney, moneyInput } from '@/lib/money';
import { waLink } from '@/lib/phone';
import { STAGE_TONE } from '@/lib/ui-tones';
import { Badge, Card, DL, PageHeader, buttonClass, LinkButton } from '@/components/ui';
import { Timeline } from '@/components/crm/Timeline';
import { RelatedTasks } from '@/components/crm/RelatedTasks';
import { LeadForm } from '../LeadForm';
import { QuotesList } from '@/components/trip/QuotesList';
import { ConvertButton, DeleteLeadButton, LostForm, StageButtons } from './LeadActions';

export const metadata: Metadata = { title: 'Lead' };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('leads.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const lead = await r.leads.findOne({ _id: id });
  if (!lead) notFound();
  const [staff, packages, customer, booking, sameCustomer, quotes] = await Promise.all([
    getStaff(ctx.tenantId),
    packageOptions(ctx.tenantId),
    lead.customerId ? r.customers.findOne({ _id: lead.customerId }) : null,
    lead.bookingId ? r.bookings.findOne({ _id: lead.bookingId }) : null,
    !lead.customerId ? r.customers.findOne({ phone: lead.phone }) : null,
    can(ctx.role, 'quotes.read') ? r.quotes.find({ leadId: id }).sort({ createdAt: -1 }).toArray() : [],
  ]);
  const canWrite = can(ctx.role, 'leads.write');
  const cur = ctx.tenant.settings.currency;
  const i = lead.interest;

  return (
    <>
      <PageHeader
        back={{ href: '/leads', label: t('leads.title') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {lead.name}
            <Badge tone={STAGE_TONE[lead.stage]}>{t(`leads.stages.${lead.stage}`)}</Badge>
          </span>
        }
        intro={`${t(`leads.sources.${lead.source}`)}${lead.formType ? ` · ${t(`leads.forms.${lead.formType}`)}` : ''} · ${formatDateTime(lead.createdAt, lang)}`}
        actions={
          <>
            <a
              href={waLink(lead.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('secondary')}
            >
              <MessageCircle size={16} aria-hidden="true" /> {t('common.whatsapp')}
            </a>
            <a href={`tel:${lead.phone}`} className={buttonClass('secondary')}>
              <Phone size={16} aria-hidden="true" /> {t('common.call')}
            </a>
            {!lead.bookingId && can(ctx.role, 'quotes.write') && (
              <LinkButton href={`/quotes/new?lead=${id}`} variant="primary" icon={FileText}>
                {t('quotes.new')}
              </LinkButton>
            )}
            {!lead.bookingId && can(ctx.role, 'bookings.write') && <ConvertButton id={String(id)} />}
            {canWrite && <DeleteLeadButton id={String(id)} />}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {quotes.length > 0 && <QuotesList quotes={quotes} />}
          {canWrite && (
            <Card title={t('leads.stage')}>
              <StageButtons id={String(id)} stage={lead.stage} />
              <div className="mt-4 border-t border-line pt-4">
                <LostForm id={String(id)} reason={lead.lostReason} />
              </div>
            </Card>
          )}
          {sameCustomer && (
            <p
              role="note"
              className="m-0 rounded-xl border border-info/20 bg-info-bg px-4 py-3 text-[13.5px] text-info"
            >
              <Link href={`/customers/${sameCustomer._id}`} className="underline">
                {t('leads.duplicatePhone', { name: sameCustomer.name })}
              </Link>
            </p>
          )}
          <Card title={t('common.details')}>
            <DL
              cols={3}
              items={[
                ...(ctx.allBranches.length > 1
                  ? [[t('workspace.branch'), branchName(ctx, lead.branchId) ?? '—'] as [string, string]]
                  : []),
                [
                  t('common.phone'),
                  <span key="p" dir="ltr" className="font-latin">
                    {lead.phone}
                  </span>,
                ],
                [t('common.email'), lead.email],
                [
                  t('common.assignedTo'),
                  staff.find((s) => s.id === String(lead.assignedTo))?.name ?? t('common.unassigned'),
                ],
                [t('leads.destination'), i.destination],
                [t('leads.package'), i.packageTitle],
                [t('leads.departure'), i.departure],
                [t('leads.travellers'), i.travellers],
                [t('leads.budget'), i.budget],
                [t('leads.when'), i.when],
                [t('leads.value'), lead.value ? formatMoney(lead.value, cur, lang) : undefined],
                [
                  t('leads.nextFollowUp'),
                  lead.nextFollowUp ? formatDate(lead.nextFollowUp, lang) : undefined,
                ],
                [t('leads.lostReason'), lead.stage === 'lost' ? lead.lostReason : undefined],
              ]}
            />
            {lead.message && (
              <div className="mt-5 rounded-lg bg-canvas p-4 text-[14px] whitespace-pre-wrap">
                <div className="mb-1 text-[12.5px] text-muted">{t('leads.message')}</div>
                {lead.message}
              </div>
            )}
            {(customer || booking) && (
              <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4 text-[14px]">
                {customer && (
                  <Link href={`/customers/${customer._id}`} className="text-info hover:underline">
                    {t('leads.customer')}: {customer.name}
                  </Link>
                )}
                {booking && (
                  <Link href={`/bookings/${booking._id}`} className="text-info hover:underline">
                    {t('leads.booking')}: {booking.number}
                  </Link>
                )}
              </div>
            )}
          </Card>
          {canWrite && (
            <Card>
              <details>
                <summary className="cursor-pointer font-semibold">{t('common.edit')}</summary>
                <div className="mt-5">
                  <LeadForm
                    staff={staff.filter((s) => s.active)}
                    branches={branchOptions(ctx, lead.branchId)}
                    packages={packages}
                    me={String(ctx.user._id)}
                    values={{
                      id: String(lead._id),
                      branchId: String(lead.branchId),
                      name: lead.name,
                      phone: lead.phone,
                      email: lead.email,
                      source: lead.source,
                      destination: i.destination,
                      packageSlug: i.packageSlug,
                      departure: i.departure,
                      travellers: i.travellers,
                      budget: i.budget,
                      when: i.when,
                      message: lead.message,
                      value: lead.value ? moneyInput(lead.value, cur) : '',
                      assignedTo: lead.assignedTo ? String(lead.assignedTo) : '',
                      nextFollowUp: lead.nextFollowUp,
                    }}
                  />
                </div>
              </details>
            </Card>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Timeline tenantId={ctx.tenantId} type="lead" id={id} canWrite={canWrite} />
          <RelatedTasks
            tenantId={ctx.tenantId}
            userId={ctx.user._id}
            type="lead"
            id={id}
            path={`/leads/${id}`}
          />
        </div>
      </div>
    </>
  );
}
