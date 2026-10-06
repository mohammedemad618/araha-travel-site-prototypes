import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { formatDate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { bookingTotals } from '@/lib/bookings';
import { PrintHeader, printBranch } from '../../PrintHeader';

export const metadata: Metadata = { title: 'Invoice' };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('bookings.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const b = await r.bookings.findOne({ _id: id });
  if (!b) notFound();
  const [customer, payments] = await Promise.all([
    r.customers.findOne({ _id: b.customerId }),
    r.all.payments.find({ bookingId: id, voided: false }).sort({ date: 1 }).toArray(),
  ]);
  const travellers =
    customer?.travellers.filter((tr) => b.travellerIds.some((x) => String(x) === String(tr._id))) ?? [];
  const money = (v: number, c = b.currency) => formatMoney(v, c, lang);
  const { subtotal } = bookingTotals(b);

  return (
    <article className="text-[14px]">
      <PrintHeader
        tenant={ctx.tenant}
        branch={printBranch(ctx, b.branchId)}
        title={t('bookings.invoiceTitle')}
        number={b.number}
        date={formatDate(todayISO(), lang)}
      />
      <section className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-[12.5px] text-muted">{t('bookings.customer')}</div>
          <div className="text-[16px] font-medium">{customer?.name}</div>
          <div className="font-latin text-muted" dir="ltr">
            {customer?.phone}
          </div>
        </div>
        <div>
          <div className="text-[12.5px] text-muted">{t('bookings.titleField')}</div>
          <div className="font-medium">{b.title}</div>
          <div className="text-muted">
            {b.travelDate && formatDate(b.travelDate, lang)}
            {b.returnDate && ` — ${formatDate(b.returnDate, lang)}`}
          </div>
        </div>
      </section>
      {travellers.length > 0 && (
        <section className="mb-6">
          <div className="mb-1 text-[12.5px] text-muted">{t('bookings.travellers')}</div>
          <p className="m-0">{travellers.map((tr) => tr.nameEn || tr.name).join('، ')}</p>
        </section>
      )}
      <table className="data-table mb-6">
        <thead>
          <tr>
            <th>{t('bookings.description')}</th>
            <th>{t('bookings.qty')}</th>
            <th>{t('bookings.unitPrice')}</th>
            <th>{t('bookings.lineTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {b.items.map((i) => (
            <tr key={String(i._id)}>
              <td>{i.description}</td>
              <td className="num">{i.qty}</td>
              <td className="num">{money(i.unitPrice)}</td>
              <td className="num">{money(i.qty * i.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="ms-auto mb-8 w-full max-w-[320px] text-[14px]">
        <Row label={t('bookings.subtotal')} value={money(subtotal)} />
        {b.discount > 0 && <Row label={t('bookings.discount')} value={`−${money(b.discount)}`} />}
        <Row label={t('bookings.total')} value={money(b.total)} strong />
        <Row label={t('bookings.paid')} value={money(b.paid)} />
        <Row label={t('bookings.balance')} value={money(b.total - b.paid)} strong />
      </section>
      {payments.length > 0 && (
        <section className="mb-8">
          <div className="mb-2 text-[12.5px] text-muted">{t('bookings.payments')}</div>
          <ul className="m-0 list-none p-0 text-[13px]">
            {payments.map((p) => (
              <li key={String(p._id)} className="flex justify-between border-b border-line py-1.5">
                <span>
                  <span className="font-latin">{p.number}</span> · {formatDate(p.date, lang)} ·{' '}
                  {t(`payments.methods.${p.method}`)}
                </span>
                <span className="num">
                  {p.kind === 'refund' ? '−' : ''}
                  {money(p.amount, p.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-line py-1.5 ${strong ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
