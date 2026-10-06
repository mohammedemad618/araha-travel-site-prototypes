import Link from 'next/link';
import { getI18n } from '@/lib/i18n/server';
import { formatDate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { quoteState } from '@/lib/quotes';
import { QUOTE_TONE } from '@/lib/ui-tones';
import type { Quote } from '@/lib/types';
import { Badge, Card, Table } from '../ui';

/** Quotes of a lead or customer, newest first. */
export async function QuotesList({ quotes, action }: { quotes: Quote[]; action?: React.ReactNode }) {
  const { t, lang } = await getI18n();
  const today = todayISO();
  return (
    <Card title={t('quotes.title')} actions={action} padded={false}>
      {quotes.length === 0 ? (
        <p className="m-0 p-5 text-[13.5px] text-muted">{t('quotes.noneYet')}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>{t('quotes.number')}</th>
              <th>{t('bookings.titleField')}</th>
              <th>{t('bookings.total')}</th>
              <th>{t('common.status')}</th>
              <th>{t('quotes.validUntil')}</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const state = quoteState(q, today);
              return (
                <tr key={String(q._id)}>
                  <td>
                    <Link href={`/quotes/${q._id}`} className="font-latin font-medium hover:underline">
                      {q.number}
                    </Link>
                  </td>
                  <td>{q.title}</td>
                  <td className="num whitespace-nowrap">{formatMoney(q.total, q.currency, lang)}</td>
                  <td>
                    <Badge tone={QUOTE_TONE[state]}>{t(`quotes.statuses.${state}`)}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-muted">
                    {q.validUntil ? formatDate(q.validUntil, lang) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
