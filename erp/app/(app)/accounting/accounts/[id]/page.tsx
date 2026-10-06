import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { formatDate, isISODate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { accountStatement } from '@/lib/accounting/reports';
import { accountLabel } from '@/lib/accounting/labels';
import { Card, PageHeader, Stat, Table, buttonClass } from '@/components/ui';

export const metadata: Metadata = { title: 'Account statement' };

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireTenant('accounting.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const account = await r.accounts.findOne({ _id: id });
  if (!account) notFound();
  const sp = await searchParams;
  const today = todayISO();
  const from = sp.from && isISODate(sp.from) ? sp.from : `${today.slice(0, 4)}-01-01`;
  const to = sp.to && isISODate(sp.to) ? sp.to : today;
  const st = await accountStatement(ctx.tenantId, account, from, to);
  const cur = ctx.tenant.settings.currency;
  const money = (v: number) => formatMoney(v, cur, lang);

  return (
    <>
      <PageHeader
        back={{ href: '/accounting/accounts', label: t('accounting.accounts') }}
        title={
          <span>
            <span className="font-latin text-muted">{account.code}</span> {accountLabel(account, t)}
          </span>
        }
        intro={t(`accounting.types.${account.type}`)}
      />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('reports.from')}
          <input type="date" name="from" defaultValue={from} className="field-input" />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('reports.to')}
          <input type="date" name="to" defaultValue={to} className="field-input" />
        </label>
        <button type="submit" className={buttonClass('secondary')}>
          {t('reports.apply')}
        </button>
      </form>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Stat label={t('accounting.opening')} value={money(st.opening)} />
        <Stat label={t('accounting.closing')} value={money(st.closing)} />
      </div>
      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              <th>{t('accounting.entryNo')}</th>
              <th>{t('accounting.memo')}</th>
              <th>{t('accounting.debit')}</th>
              <th>{t('accounting.credit')}</th>
              <th>{t('accounting.balance')}</th>
            </tr>
          </thead>
          <tbody>
            {st.lines.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">
                  {t('common.noResults')}
                </td>
              </tr>
            )}
            {st.lines.map(({ entry, line, balance }, i) => (
              <tr key={`${entry._id}-${i}`}>
                <td className="whitespace-nowrap">{formatDate(entry.date, lang)}</td>
                <td>
                  <Link href={`/accounting/journal/${entry._id}`} className="font-latin hover:underline">
                    {entry.number}
                  </Link>
                </td>
                <td className="max-w-[300px] truncate">{line.memo || entry.memo}</td>
                <td className="num">{line.debit ? money(line.debit) : ''}</td>
                <td className="num">{line.credit ? money(line.credit) : ''}</td>
                <td className={`num ${balance < 0 ? 'text-danger' : ''}`}>{money(balance)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
