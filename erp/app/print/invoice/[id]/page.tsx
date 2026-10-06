import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { PrintHeader, printBranch } from '../../PrintHeader';
import { PrintLines, Row } from '../../PrintParts';

export const metadata: Metadata = { title: 'Invoice' };

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('finance.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const inv = await r.invoices.findOne({ _id: id });
  if (!inv) notFound();
  const b = await r.all.bookings.findOne(
    { _id: inv.bookingId },
    { projection: { number: 1, title: 1, paid: 1 } },
  );
  const money = (v: number) => formatMoney(v, inv.currency, lang);
  const subtotal = inv.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const paid = Math.min(b?.paid ?? 0, inv.total);

  return (
    <article className="relative text-[14px]">
      {inv.status === 'void' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[96px] font-bold text-danger/15"
        >
          {t('invoices.statuses.void')}
        </div>
      )}
      <PrintHeader
        tenant={ctx.tenant}
        branch={printBranch(ctx, inv.branchId)}
        title={t('invoices.printTitle')}
        number={inv.number}
        date={formatDate(inv.date, lang)}
      />
      <section className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-[12.5px] text-muted">{t('invoices.billTo')}</div>
          <div className="text-[16px] font-medium">{inv.customer.name}</div>
          <div className="text-muted">
            <span className="font-latin" dir="ltr">
              {inv.customer.phone}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[12.5px] text-muted">{t('payments.booking')}</div>
          <div className="font-medium">
            <span className="font-latin">{b?.number}</span> — {b?.title}
          </div>
          {inv.dueDate && (
            <div className="text-muted">
              {t('invoices.dueDate')}: {formatDate(inv.dueDate, lang)}
            </div>
          )}
        </div>
      </section>
      <PrintLines
        lines={inv.lines.map((l, i) => ({ ...l, key: String(i) }))}
        money={money}
        labels={{
          description: t('bookings.description'),
          qty: t('bookings.qty'),
          unitPrice: t('bookings.unitPrice'),
          lineTotal: t('bookings.lineTotal'),
        }}
      />
      <section className="ms-auto mb-8 w-full max-w-[320px] text-[14px]">
        <Row label={t('bookings.subtotal')} value={money(subtotal)} />
        {inv.discount > 0 && <Row label={t('bookings.discount')} value={`−${money(inv.discount)}`} />}
        <Row label={t('bookings.total')} value={money(inv.total)} strong />
        {inv.status === 'issued' && (
          <>
            <Row label={t('bookings.paid')} value={money(paid)} />
            <Row label={t('bookings.balance')} value={money(inv.total - paid)} strong />
          </>
        )}
      </section>
      {inv.status === 'void' && inv.voidReason && (
        <p className="mb-6 text-danger">
          {t('invoices.voidReason')}: {inv.voidReason}
        </p>
      )}
      <footer className="flex items-end justify-between gap-6 border-t border-line pt-6 text-[13px] text-muted">
        <p className="m-0 max-w-[60%] whitespace-pre-wrap">
          {ctx.tenant.settings.invoiceFooter || t('bookings.thanks')}
        </p>
        <div className="w-48 border-t border-ink pt-1 text-center text-ink">{t('bookings.signature')}</div>
      </footer>
    </article>
  );
}
