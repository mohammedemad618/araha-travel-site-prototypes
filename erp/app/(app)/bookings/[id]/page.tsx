import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Printer } from 'lucide-react';
import { requireTenant, toObjectId, branchOptions, branchName } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { getStaff } from '@/lib/queries';
import { packageChoices } from '@/lib/package-choices';
import { addDays, formatDate, todayISO } from '@/lib/dates';
import { formatMoney, moneyInput } from '@/lib/money';
import { paymentState } from '@/lib/bookings';
import { BOOKING_TONE, PAY_TONE } from '@/lib/ui-tones';
import { Badge, Card, DL, LinkButton, PageHeader, Stat } from '@/components/ui';
import { Timeline } from '@/components/crm/Timeline';
import { RelatedTasks } from '@/components/crm/RelatedTasks';
import { Attachments } from '@/components/crm/Attachments';
import { BookingForm } from '../BookingForm';
import {
  DeleteBookingButton,
  IssueInvoiceForm,
  PaymentForm,
  StatusButton,
  TravellersForm,
  VoidInvoiceForm,
  VoidPaymentButton,
} from './BookingParts';
import { ServicesCard } from '@/components/trip/ServicesCard';
import { deleteService, saveService, setDiscount, setServiceStatus } from '@/lib/actions/bookings';

export const metadata: Metadata = { title: 'Booking' };

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const ctx = await requireTenant('bookings.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const b = await r.bookings.findOne({ _id: id });
  if (!b) notFound();

  const seeFinance = can(ctx.role, 'finance.read');
  const [customer, pkg, dep, payments, suppliers, staff, packages, invoices, quote, activePackages] =
    await Promise.all([
      r.customers.findOne({ _id: b.customerId }),
      b.packageId ? r.packages.findOne({ _id: b.packageId }) : null,
      b.departureId ? r.departures.findOne({ _id: b.departureId }) : null,
      // Every receipt of a visible booking is shown, whoever recorded it.
      r.all.payments.find({ bookingId: id }).sort({ date: -1, createdAt: -1 }).toArray(),
      seeFinance ? r.suppliers.find({}).sort({ name: 1 }).toArray() : [],
      getStaff(ctx.tenantId),
      packageChoices(ctx.tenantId, lang, b.packageId),
      seeFinance ? r.all.invoices.find({ bookingId: id }).sort({ createdAt: -1 }).toArray() : [],
      b.quoteId ? r.all.quotes.findOne({ _id: b.quoteId }, { projection: { number: 1 } }) : null,
      r.packages.find({ active: true, currency: b.currency }).sort({ title: 1 }).toArray(),
    ]);
  const pricedPackages = activePackages.map((p) => ({
    id: String(p._id),
    title: p.title,
    price: moneyInput(p.price, p.currency),
  }));
  const invoice = invoices.find((i) => i.status === 'issued');
  // The issued invoice no longer matches when services or the discount changed afterwards.
  const invoiceOutdated = invoice ? invoice.total !== b.total : false;
  const canWrite = can(ctx.role, 'bookings.write') && b.status !== 'cancelled';
  const canPay = can(ctx.role, 'finance.write');
  const cur = b.currency;
  const balance = b.total - b.paid;
  const profit = b.total - b.costTotal;
  const money = (v: number, c = cur) => formatMoney(v, c, lang);
  const today = todayISO();
  const tripEnd = b.returnDate ?? b.travelDate;
  const passportLimit = tripEnd ? addDays(tripEnd, 183) : addDays(today, 183);
  const pay = paymentState(b);

  const statusActions: {
    status: string;
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'accent';
  }[] = [];
  if (can(ctx.role, 'bookings.write')) {
    if (b.status === 'draft')
      statusActions.push({ status: 'confirmed', label: t('bookings.confirmBooking'), variant: 'primary' });
    if (b.status === 'confirmed')
      statusActions.push({ status: 'completed', label: t('bookings.complete'), variant: 'primary' });
    if (b.status === 'draft' || b.status === 'confirmed')
      statusActions.push({ status: 'cancelled', label: t('bookings.cancelBooking'), variant: 'danger' });
    if (b.status === 'cancelled' || b.status === 'completed')
      statusActions.push({
        status: b.status === 'cancelled' ? 'draft' : 'confirmed',
        label: t('bookings.reopen'),
      });
  }

  return (
    <>
      <PageHeader
        back={{ href: '/bookings', label: t('bookings.title') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-latin">{b.number}</span>
            <Badge tone={BOOKING_TONE[b.status]}>{t(`bookings.statuses.${b.status}`)}</Badge>
            <Badge tone={PAY_TONE[pay]}>{t(`bookings.${pay}`)}</Badge>
          </span>
        }
        intro={
          <span>
            {b.title} ·{' '}
            {customer && (
              <Link href={`/customers/${customer._id}`} className="text-info hover:underline">
                {customer.name}
              </Link>
            )}
          </span>
        }
        actions={
          <>
            <LinkButton href={`/print/booking/${b._id}`} icon={Printer} target="_blank">
              {t('bookings.statement')}
            </LinkButton>
            {statusActions.map((a) => (
              <StatusButton
                key={a.status}
                id={String(b._id)}
                status={a.status}
                label={a.label}
                variant={a.variant}
              />
            ))}
            {can(ctx.role, 'bookings.write') && b.status === 'draft' && payments.length === 0 && (
              <DeleteBookingButton id={String(b._id)} />
            )}
          </>
        }
      />

      {(await searchParams).auto === '1' && (
        <p
          role="note"
          className="m-0 mb-5 rounded-xl border border-info/20 bg-info-bg px-4 py-3 text-[13.5px] text-info"
        >
          {t('bookings.autoItems')}
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('bookings.total')} value={money(b.total)} />
        <Stat label={t('bookings.paid')} value={money(b.paid)} />
        <Stat
          label={t('bookings.balance')}
          value={<span className={balance > 0 ? 'text-danger' : ''}>{money(balance)}</span>}
        />
        {seeFinance ? (
          <Stat
            label={t('bookings.profit')}
            value={<span className={profit < 0 ? 'text-danger' : 'text-success'}>{money(profit)}</span>}
            hint={
              b.total > 0 ? `${t('bookings.margin')}: ${Math.round((profit / b.total) * 100)}%` : undefined
            }
          />
        ) : (
          <Stat
            label={t('bookings.travelDate')}
            value={b.travelDate ? formatDate(b.travelDate, lang) : '—'}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card title={t('common.details')}>
            <DL
              cols={3}
              items={[
                [t('bookings.type'), t(`bookings.types.${b.type}`)],
                ...(quote
                  ? [
                      [
                        t('quotes.fromQuote'),
                        <Link
                          key="q"
                          href={`/quotes/${quote._id}`}
                          className="font-latin text-info hover:underline"
                        >
                          {quote.number}
                        </Link>,
                      ] as [string, React.ReactNode],
                    ]
                  : []),
                ...(ctx.allBranches.length > 1
                  ? [[t('workspace.branch'), branchName(ctx, b.branchId) ?? '—'] as [string, string]]
                  : []),
                [
                  t('bookings.package'),
                  pkg ? (
                    <Link href={`/inventory/${pkg._id}`} className="text-info hover:underline">
                      {pkg.title}
                    </Link>
                  ) : undefined,
                ],
                [t('bookings.departure'), dep ? formatDate(dep.date, lang) : undefined],
                [t('bookings.travelDate'), b.travelDate ? formatDate(b.travelDate, lang) : undefined],
                [t('bookings.returnDate'), b.returnDate ? formatDate(b.returnDate, lang) : undefined],
                [`${t('bookings.adults')} / ${t('bookings.children')}`, `${b.adults} / ${b.children}`],
                [t('common.assignedTo'), staff.find((s) => s.id === String(b.assignedTo))?.name],
                [t('common.currency'), cur],
                [t('common.createdAt'), formatDate(b.createdAt, lang)],
              ]}
            />
            {b.notes && (
              <p className="m-0 mt-4 rounded-lg bg-canvas p-3 text-[14px] whitespace-pre-wrap">{b.notes}</p>
            )}
            {canWrite && (
              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer font-medium">{t('common.edit')}</summary>
                <div className="mt-4">
                  <BookingForm
                    packages={packages}
                    staff={staff.filter((s) => s.active)}
                    branches={branchOptions(ctx, b.branchId)}
                    me={String(ctx.user._id)}
                    defaultCurrency={cur}
                    values={{
                      id: String(b._id),
                      branchId: String(b.branchId),
                      customer: customer
                        ? { id: String(customer._id), name: customer.name, phone: customer.phone }
                        : undefined,
                      type: b.type,
                      title: b.title,
                      packageId: b.packageId ? String(b.packageId) : '',
                      departureId: b.departureId ? String(b.departureId) : '',
                      travelDate: b.travelDate,
                      returnDate: b.returnDate,
                      adults: b.adults,
                      children: b.children,
                      currency: cur,
                      currencyLocked: b.paid !== 0 || b.services.some((l) => l.cost),
                      assignedTo: b.assignedTo ? String(b.assignedTo) : '',
                      notes: b.notes,
                    }}
                  />
                </div>
              </details>
            )}
          </Card>

          <ServicesCard
            lines={b.services}
            discount={b.discount}
            currency={cur}
            parent={{ name: 'bookingId', value: String(b._id) }}
            suppliers={suppliers.map((s) => ({ id: String(s._id), name: s.name }))}
            packages={pricedPackages}
            canWrite={canWrite}
            canCost={seeFinance}
            operational
            actions={{
              save: saveService,
              remove: deleteService,
              status: setServiceStatus,
              discount: setDiscount,
            }}
            rateNote={t('bookings.rateNote', { rate: ctx.tenant.settings.usdRate.toLocaleString('en-US') })}
          />

          {customer && (
            <Card title={`${t('bookings.travellers')} (${b.travellerIds.length}/${b.adults + b.children})`}>
              <TravellersForm
                bookingId={String(b._id)}
                selected={b.travellerIds.map(String)}
                travellers={customer.travellers.map((tr) => ({
                  id: String(tr._id),
                  name: tr.name,
                  passportNo: tr.passportNo,
                  warning:
                    tr.passportExpiry && tr.passportExpiry < passportLimit
                      ? tr.passportExpiry < today
                        ? t('customers.passportExpired')
                        : t('customers.passportExpiring')
                      : undefined,
                }))}
              />
              <Link
                href={`/customers/${customer._id}`}
                className="mt-3 inline-block text-[13px] text-info hover:underline"
              >
                {t('customers.addTraveller')} →
              </Link>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {seeFinance && (
            <Card title={t('invoices.title')}>
              {invoices.length > 0 && (
                <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
                  {invoices.map((inv) => (
                    <li
                      key={String(inv._id)}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${inv.status === 'void' ? 'opacity-55' : ''}`}
                    >
                      <Link
                        href={`/print/invoice/${inv._id}`}
                        target="_blank"
                        className="font-latin font-medium text-info hover:underline"
                      >
                        {inv.number}
                      </Link>
                      <span className="text-[12.5px] text-muted">{formatDate(inv.date, lang)}</span>
                      <span className="num text-[13px]">{money(inv.total, inv.currency)}</span>
                      {inv.status === 'void' ? (
                        <Badge tone="danger">{t('invoices.statuses.void')}</Badge>
                      ) : invoiceOutdated ? (
                        <Badge tone="warning">{t('invoices.outdated')}</Badge>
                      ) : (
                        <Badge tone="success">{t('invoices.statuses.issued')}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {invoice && invoiceOutdated && (
                <p className="m-0 mb-3 text-[13px] text-warning">{t('invoices.outdatedHint')}</p>
              )}
              {canPay && invoice && <VoidInvoiceForm id={String(invoice._id)} />}
              {canPay && !invoice && b.status !== 'cancelled' && b.total > 0 && (
                <IssueInvoiceForm bookingId={String(b._id)} today={today} />
              )}
              {!invoice && (b.total <= 0 || b.status === 'cancelled') && invoices.length === 0 && (
                <p className="m-0 text-[13px] text-muted">{t('invoices.nothingToInvoice')}</p>
              )}
            </Card>
          )}
          {seeFinance && (
            <Card title={t('bookings.payments')} padded={false}>
              {payments.length > 0 && (
                <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                  {payments.map((p) => (
                    <li
                      key={String(p._id)}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 ${p.voided ? 'opacity-50' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`num font-medium ${p.kind === 'refund' ? 'text-danger' : ''}`}>
                            {p.kind === 'refund' ? '−' : ''}
                            {money(p.amount, p.currency)}
                          </span>
                          {p.voided && <Badge tone="danger">{t('payments.voided')}</Badge>}
                          {p.kind === 'refund' && !p.voided && (
                            <Badge tone="warning">{t('payments.kinds.refund')}</Badge>
                          )}
                        </div>
                        <div className="text-[12.5px] text-muted">
                          <span className="font-latin">{p.number}</span> · {t(`payments.methods.${p.method}`)}{' '}
                          · {formatDate(p.date, lang)}
                          {p.currency !== cur && ` · ${money(p.amountInBooking)}`}
                        </div>
                      </div>
                      <Link
                        href={`/print/receipt/${p._id}`}
                        target="_blank"
                        className="text-[12.5px] text-info hover:underline"
                      >
                        {t('payments.receipt')}
                      </Link>
                      {canPay && !p.voided && <VoidPaymentButton id={String(p._id)} />}
                    </li>
                  ))}
                </ul>
              )}
              {canPay && b.status !== 'cancelled' && (
                <div className={`p-5 ${payments.length ? 'border-t border-line' : ''}`}>
                  <PaymentForm
                    bookingId={String(b._id)}
                    currency={cur}
                    today={today}
                    balance={balance > 0 ? moneyInput(balance, cur) : ''}
                  />
                </div>
              )}
              {canPay && b.status === 'cancelled' && b.paid > 0 && (
                <div className="border-t border-line p-5">
                  <PaymentForm
                    bookingId={String(b._id)}
                    currency={cur}
                    today={today}
                    balance={moneyInput(b.paid, cur)}
                  />
                </div>
              )}
            </Card>
          )}
          <Timeline
            tenantId={ctx.tenantId}
            type="booking"
            id={id}
            canWrite={can(ctx.role, 'bookings.write')}
          />
          <RelatedTasks
            tenantId={ctx.tenantId}
            userId={ctx.user._id}
            type="booking"
            id={id}
            path={`/bookings/${id}`}
          />
          <Attachments
            tenantId={ctx.tenantId}
            type="booking"
            id={id}
            canWrite={can(ctx.role, 'bookings.write')}
          />
        </div>
      </div>
    </>
  );
}
