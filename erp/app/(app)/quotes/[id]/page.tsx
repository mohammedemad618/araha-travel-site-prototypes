import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Printer } from 'lucide-react';
import { branchName, branchOptions, requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { getStaff } from '@/lib/queries';
import { formatDate, todayISO } from '@/lib/dates';
import { formatMoney, moneyInput } from '@/lib/money';
import { quoteState } from '@/lib/quotes';
import { QUOTE_TONE } from '@/lib/ui-tones';
import { deleteQuoteLine, saveQuoteLine, setQuoteDiscount } from '@/lib/actions/quotes';
import { Badge, Card, DL, LinkButton, PageHeader, Stat } from '@/components/ui';
import { Timeline } from '@/components/crm/Timeline';
import { RelatedTasks } from '@/components/crm/RelatedTasks';
import { Attachments } from '@/components/crm/Attachments';
import { ServicesCard } from '@/components/trip/ServicesCard';
import { QuoteForm } from '../QuoteForm';
import { AcceptQuoteButton, DeleteQuoteButton, QuoteStatusButton } from '../QuoteParts';

export const metadata: Metadata = { title: 'Quote' };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('quotes.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const q = await r.quotes.findOne({ _id: id });
  if (!q) notFound();
  const seeFinance = can(ctx.role, 'finance.read');
  const canWrite = can(ctx.role, 'quotes.write');
  const editable = canWrite && (q.status === 'draft' || q.status === 'sent');
  const [customer, lead, booking, suppliers, staff, activePackages] = await Promise.all([
    r.customers.findOne({ _id: q.customerId }),
    q.leadId ? r.all.leads.findOne({ _id: q.leadId }, { projection: { name: 1 } }) : null,
    q.bookingId ? r.all.bookings.findOne({ _id: q.bookingId }, { projection: { number: 1 } }) : null,
    seeFinance ? r.suppliers.find({}).sort({ name: 1 }).toArray() : [],
    getStaff(ctx.tenantId),
    r.packages.find({ active: true, currency: q.currency }).sort({ title: 1 }).toArray(),
  ]);
  const today = todayISO();
  const state = quoteState(q, today);
  const money = (v: number) => formatMoney(v, q.currency, lang);
  const profit = q.total - q.costTotal;

  return (
    <>
      <PageHeader
        back={{ href: '/quotes', label: t('quotes.title') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-latin">{q.number}</span>
            <Badge tone={QUOTE_TONE[state]}>{t(`quotes.statuses.${state}`)}</Badge>
          </span>
        }
        intro={
          <span>
            {q.title} ·{' '}
            {customer && (
              <Link href={`/customers/${customer._id}`} className="text-info hover:underline">
                {customer.name}
              </Link>
            )}
          </span>
        }
        actions={
          <>
            <LinkButton href={`/print/quote/${q._id}`} icon={Printer} target="_blank">
              {t('quotes.print')}
            </LinkButton>
            {editable && q.status === 'draft' && (
              <QuoteStatusButton id={String(q._id)} status="sent" label={t('quotes.markSent')} />
            )}
            {editable && can(ctx.role, 'bookings.write') && <AcceptQuoteButton id={String(q._id)} />}
            {editable && (
              <QuoteStatusButton
                id={String(q._id)}
                status="rejected"
                label={t('quotes.reject')}
                variant="danger"
              />
            )}
            {canWrite && q.status === 'rejected' && (
              <QuoteStatusButton id={String(q._id)} status="draft" label={t('quotes.reopen')} />
            )}
            {canWrite && q.status === 'draft' && <DeleteQuoteButton id={String(q._id)} />}
          </>
        }
      />

      {booking && (
        <p className="m-0 mb-5 rounded-xl border border-success/25 bg-success-bg px-4 py-3 text-[13.5px] text-success">
          {t('quotes.acceptedInto')}{' '}
          <Link href={`/bookings/${booking._id}`} className="font-latin font-semibold underline">
            {booking.number}
          </Link>
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('bookings.total')} value={money(q.total)} />
        {seeFinance && q.costTotal > 0 ? (
          <Stat
            label={t('quotes.expectedProfit')}
            value={<span className={profit < 0 ? 'text-danger' : 'text-success'}>{money(profit)}</span>}
            hint={
              q.total > 0 ? `${t('bookings.margin')}: ${Math.round((profit / q.total) * 100)}%` : undefined
            }
          />
        ) : (
          <Stat label={t('quotes.lines')} value={String(q.lines.length)} />
        )}
        <Stat label={t('quotes.validUntil')} value={q.validUntil ? formatDate(q.validUntil, lang) : '—'} />
        <Stat label={t('bookings.travelDate')} value={q.travelDate ? formatDate(q.travelDate, lang) : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <ServicesCard
            lines={q.lines}
            discount={q.discount}
            currency={q.currency}
            parent={{ name: 'quoteId', value: String(q._id) }}
            suppliers={suppliers.map((s) => ({ id: String(s._id), name: s.name }))}
            packages={activePackages.map((p) => ({
              id: String(p._id),
              title: p.title,
              price: moneyInput(p.price, p.currency),
            }))}
            canWrite={editable}
            canCost={seeFinance}
            operational={false}
            actions={{ save: saveQuoteLine, remove: deleteQuoteLine, discount: setQuoteDiscount }}
          />
          <Card title={t('common.details')}>
            <DL
              cols={3}
              items={[
                ...(ctx.allBranches.length > 1
                  ? [[t('workspace.branch'), branchName(ctx, q.branchId) ?? '—'] as [string, string]]
                  : []),
                [
                  t('quotes.lead'),
                  lead ? (
                    <Link key="l" href={`/leads/${lead._id}`} className="text-info hover:underline">
                      {lead.name}
                    </Link>
                  ) : undefined,
                ],
                [t('bookings.returnDate'), q.returnDate ? formatDate(q.returnDate, lang) : undefined],
                [`${t('bookings.adults')} / ${t('bookings.children')}`, `${q.adults} / ${q.children}`],
                [t('common.assignedTo'), staff.find((s) => s.id === String(q.assignedTo))?.name],
                [t('quotes.sentAt'), q.sentAt ? formatDate(q.sentAt, lang) : undefined],
                [t('common.createdAt'), formatDate(q.createdAt, lang)],
              ]}
            />
            {q.notes && (
              <p className="m-0 mt-4 rounded-lg bg-canvas p-3 text-[14px] whitespace-pre-wrap">{q.notes}</p>
            )}
            {editable && (
              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer font-medium">{t('common.edit')}</summary>
                <div className="mt-4">
                  <QuoteForm
                    staff={staff.filter((s) => s.active)}
                    branches={branchOptions(ctx, q.branchId)}
                    me={String(ctx.user._id)}
                    defaultCurrency={q.currency}
                    values={{
                      id: String(q._id),
                      title: q.title,
                      travelDate: q.travelDate,
                      returnDate: q.returnDate,
                      adults: q.adults,
                      children: q.children,
                      currency: q.currency,
                      currencyLocked: q.lines.length > 0,
                      validUntil: q.validUntil,
                      assignedTo: q.assignedTo ? String(q.assignedTo) : '',
                      branchId: String(q.branchId),
                      notes: q.notes,
                    }}
                  />
                </div>
              </details>
            )}
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Timeline tenantId={ctx.tenantId} type="quote" id={id} canWrite={canWrite} />
          <RelatedTasks
            tenantId={ctx.tenantId}
            userId={ctx.user._id}
            type="quote"
            id={id}
            path={`/quotes/${id}`}
          />
          <Attachments tenantId={ctx.tenantId} type="quote" id={id} canWrite={canWrite} />
        </div>
      </div>
    </>
  );
}
