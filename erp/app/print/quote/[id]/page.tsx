import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { isActive, lineTotals } from '@/lib/services';
import { PrintHeader, printBranch } from '../../PrintHeader';
import { PrintLines, Row } from '../../PrintParts';

export const metadata: Metadata = { title: 'Quote' };

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('quotes.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const q = await r.quotes.findOne({ _id: id });
  if (!q) notFound();
  const customer = await r.customers.findOne({ _id: q.customerId });
  const money = (v: number) => formatMoney(v, q.currency, lang);
  const { subtotal } = lineTotals(q.lines, q.discount);
  const pax = q.adults + q.children;

  return (
    <article className="text-[14px]">
      <PrintHeader
        tenant={ctx.tenant}
        branch={printBranch(ctx, q.branchId)}
        title={t('quotes.printTitle')}
        number={q.number}
        date={formatDate(q.createdAt, lang)}
      />
      <section className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-[12.5px] text-muted">{t('quotes.preparedFor')}</div>
          <div className="text-[16px] font-medium">{customer?.name}</div>
          <div className="text-muted">
            <span className="font-latin" dir="ltr">
              {customer?.phone}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[12.5px] text-muted">{t('bookings.titleField')}</div>
          <div className="font-medium">{q.title}</div>
          <div className="text-muted">
            {q.travelDate && formatDate(q.travelDate, lang)}
            {q.returnDate && ` — ${formatDate(q.returnDate, lang)}`}
            {pax > 0 && ` · ${t('quotes.pax', { adults: q.adults, children: q.children })}`}
          </div>
        </div>
      </section>
      <PrintLines
        lines={q.lines.filter(isActive).map((l) => ({ ...l, key: String(l._id) }))}
        money={money}
        dateLabel={(l) =>
          [l.startDate, l.endDate]
            .filter(Boolean)
            .map((d) => formatDate(d, lang))
            .join(' — ')
        }
        labels={{
          description: t('bookings.description'),
          qty: t('bookings.qty'),
          unitPrice: t('bookings.unitPrice'),
          lineTotal: t('bookings.lineTotal'),
        }}
      />
      <section className="ms-auto mb-8 w-full max-w-[320px] text-[14px]">
        <Row label={t('bookings.subtotal')} value={money(subtotal)} />
        {q.discount > 0 && <Row label={t('bookings.discount')} value={`−${money(q.discount)}`} />}
        <Row label={t('bookings.total')} value={money(q.total)} strong />
      </section>
      {q.notes && <p className="mb-6 whitespace-pre-wrap">{q.notes}</p>}
      <footer className="border-t border-line pt-5 text-[13px] text-muted">
        {q.validUntil && (
          <p className="m-0 mb-2 font-medium text-ink">
            {t('quotes.validNote', { date: formatDate(q.validUntil, lang) })}
          </p>
        )}
        <p className="m-0">{t('quotes.priceNote')}</p>
      </footer>
    </article>
  );
}
