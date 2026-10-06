import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { getStaff } from '@/lib/queries';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { PrintHeader, printBranch } from '../../PrintHeader';

export const metadata: Metadata = { title: 'Receipt' };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('finance.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  // A receipt can be printed by anyone who can see its booking.
  const p = await r.all.payments.findOne({ _id: id });
  if (!p) notFound();
  const [b, customer, staff] = await Promise.all([
    r.bookings.findOne({ _id: p.bookingId }),
    r.customers.findOne({ _id: p.customerId }),
    getStaff(ctx.tenantId),
  ]);
  if (!b) notFound();
  const lines: [string, string][] = [
    [t('payments.receivedFrom'), customer?.name ?? '—'],
    [t('payments.forBooking'), b ? `${b.number} — ${b.title}` : '—'],
    [t('payments.kind'), t(`payments.kinds.${p.kind}`)],
    [t('payments.method'), t(`payments.methods.${p.method}`)],
    [t('payments.reference'), p.reference ?? '—'],
    [t('common.by'), staff.find((s) => s.id === String(p.receivedBy))?.name ?? '—'],
  ];
  return (
    <article className="text-[14px]">
      <PrintHeader
        tenant={ctx.tenant}
        branch={printBranch(ctx, p.branchId)}
        title={t('payments.receiptTitle')}
        number={p.number}
        date={formatDate(p.date, lang)}
      />
      {p.voided && (
        <p className="m-0 mb-6 rounded-lg bg-danger-bg p-3 text-center text-[16px] font-semibold text-danger">
          {t('payments.voided')}
        </p>
      )}
      <div className="mb-8 rounded-xl bg-canvas p-6 text-center">
        <div className="text-[13px] text-muted">{t('common.amount')}</div>
        <div className="num text-[32px] font-semibold">{formatMoney(p.amount, p.currency, lang)}</div>
      </div>
      <dl className="m-0 mb-10 grid grid-cols-1 gap-3">
        {lines.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 border-b border-line pb-2">
            <dt className="text-muted">{k}</dt>
            <dd className="m-0 text-end">{v}</dd>
          </div>
        ))}
      </dl>
      {b && (
        <p className="m-0 mb-10 text-[13px] text-muted">
          {t('bookings.total')}: {formatMoney(b.total, b.currency, lang)} · {t('bookings.paid')}:{' '}
          {formatMoney(b.paid, b.currency, lang)} · {t('bookings.balance')}:{' '}
          {formatMoney(b.total - b.paid, b.currency, lang)}
        </p>
      )}
      <footer className="flex justify-end">
        <div className="w-48 border-t border-ink pt-1 text-center">{t('bookings.signature')}</div>
      </footer>
    </article>
  );
}
