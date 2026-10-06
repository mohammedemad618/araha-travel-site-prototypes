import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { formatDate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { formatMulti } from '@/lib/money-multi';
import { supplierBalances } from '@/lib/suppliers';
import { Card, DL, PageHeader, Stat, Table } from '@/components/ui';
import { Timeline } from '@/components/crm/Timeline';
import { Attachments } from '@/components/crm/Attachments';
import {
  DeleteSupplierButton,
  DeleteSupplierPaymentButton,
  SupplierForm,
  SupplierPaymentForm,
} from '../SupplierForms';

export const metadata: Metadata = { title: 'Supplier' };

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('suppliers.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const s = await r.suppliers.findOne({ _id: id });
  if (!s) notFound();
  const seeFinance = can(ctx.role, 'finance.read');
  const [bookings, payments, balances] = await Promise.all([
    r.all.bookings
      .find(
        { 'costs.supplierId': id },
        { projection: { number: 1, title: 1, costs: 1, status: 1, travelDate: 1 } },
      )
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray(),
    seeFinance ? r.supplierPayments.find({ supplierId: id }).sort({ date: -1 }).toArray() : [],
    supplierBalances(ctx.tenantId, [id]),
  ]);
  const bal = balances.get(String(id)) ?? { costs: { IQD: 0, USD: 0 }, paid: { IQD: 0, USD: 0 } };
  const owed = { IQD: bal.costs.IQD - bal.paid.IQD, USD: bal.costs.USD - bal.paid.USD };
  const lines = bookings.flatMap((b) =>
    b.costs.filter((c) => String(c.supplierId) === String(id)).map((c) => ({ b, c })),
  );

  return (
    <>
      <PageHeader
        back={{ href: '/suppliers', label: t('suppliers.title') }}
        title={s.name}
        intro={t(`suppliers.types.${s.type}`)}
        actions={can(ctx.role, 'suppliers.write') && <DeleteSupplierButton id={String(id)} />}
      />
      {seeFinance && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label={t('suppliers.costs')} value={formatMulti(bal.costs, lang)} />
          <Stat label={t('suppliers.paidOut')} value={formatMulti(bal.paid, lang)} />
          <Stat
            label={t('suppliers.owed')}
            value={
              <span className={owed.IQD > 0 || owed.USD > 0 ? 'text-danger' : ''}>
                {formatMulti(owed, lang)}
              </span>
            }
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card title={t('common.details')}>
            <DL
              cols={3}
              items={[
                [t('suppliers.contactName'), s.contactName],
                [
                  t('common.phone'),
                  s.phone ? (
                    <span dir="ltr" className="font-latin">
                      {s.phone}
                    </span>
                  ) : undefined,
                ],
                [t('common.email'), s.email],
                [t('suppliers.country'), s.country],
              ]}
            />
            {s.notes && <p className="m-0 mt-4 rounded-lg bg-canvas p-3 whitespace-pre-wrap">{s.notes}</p>}
            {can(ctx.role, 'suppliers.write') && (
              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer font-medium">{t('common.edit')}</summary>
                <div className="mt-4">
                  <SupplierForm
                    values={{
                      id: String(s._id),
                      name: s.name,
                      type: s.type,
                      contactName: s.contactName,
                      phone: s.phone,
                      email: s.email,
                      country: s.country,
                      notes: s.notes,
                    }}
                  />
                </div>
              </details>
            )}
          </Card>
          {seeFinance && (
            <Card title={t('suppliers.costLines')} padded={false}>
              {lines.length === 0 ? (
                <p className="m-0 p-5 text-[13.5px] text-muted">{t('bookings.noCosts')}</p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>{t('bookings.number')}</th>
                      <th>{t('bookings.description')}</th>
                      <th>{t('bookings.travelDate')}</th>
                      <th>{t('common.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(({ b, c }) => (
                      <tr key={String(c._id)}>
                        <td>
                          <Link href={`/bookings/${b._id}`} className="font-latin text-info hover:underline">
                            {b.number}
                          </Link>
                        </td>
                        <td>{c.description}</td>
                        <td>{b.travelDate ? formatDate(b.travelDate, lang) : '—'}</td>
                        <td className="num">{formatMoney(c.amount, c.currency, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}
          {seeFinance && (
            <Card title={t('suppliers.payments')} padded={false}>
              {payments.length > 0 && (
                <Table>
                  <thead>
                    <tr>
                      <th>{t('common.date')}</th>
                      <th>{t('common.amount')}</th>
                      <th>{t('payments.method')}</th>
                      <th>{t('payments.reference')}</th>
                      <th>
                        <span className="sr-only">{t('common.actions')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={String(p._id)}>
                        <td>{formatDate(p.date, lang)}</td>
                        <td className="num">{formatMoney(p.amount, p.currency, lang)}</td>
                        <td>{t(`payments.methods.${p.method}`)}</td>
                        <td className="font-latin text-muted">{p.reference ?? '—'}</td>
                        <td>
                          {can(ctx.role, 'finance.write') && (
                            <DeleteSupplierPaymentButton id={String(p._id)} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {can(ctx.role, 'finance.write') && (
                <div className={`p-5 ${payments.length ? 'border-t border-line' : ''}`}>
                  <SupplierPaymentForm
                    supplierId={String(id)}
                    today={todayISO()}
                    currency={ctx.tenant.settings.currency}
                  />
                </div>
              )}
            </Card>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Timeline
            tenantId={ctx.tenantId}
            type="supplier"
            id={id}
            canWrite={can(ctx.role, 'suppliers.write')}
          />
          <Attachments
            tenantId={ctx.tenantId}
            type="supplier"
            id={id}
            canWrite={can(ctx.role, 'suppliers.write')}
          />
        </div>
      </div>
    </>
  );
}
