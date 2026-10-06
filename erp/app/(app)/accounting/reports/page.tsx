import type { Metadata } from 'next';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { branchName, requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { formatDate, isISODate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { ensureLedger } from '@/lib/accounting/ledger';
import { balanceSheet, profitAndLoss, trialBalance, type AccountRow } from '@/lib/accounting/reports';
import { accountLabel } from '@/lib/accounting/labels';
import { Card, PageHeader, Table, Tabs, buttonClass } from '@/components/ui';
import { PrintButton } from '@/app/print/PrintButton';
import { AccountingTabs } from '../AccountingTabs';

export const metadata: Metadata = { title: 'Financial statements' };

type SP = { report?: string; from?: string; to?: string };

export default async function StatementsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireTenant('accounting.read');
  const { t, lang } = await getI18n();
  await ensureLedger(ctx.tenantId);
  const sp = await searchParams;
  const report = sp.report === 'trial' || sp.report === 'bs' ? sp.report : 'pl';
  const today = todayISO();
  const from = sp.from && isISODate(sp.from) ? sp.from : `${today.slice(0, 4)}-01-01`;
  const to = sp.to && isISODate(sp.to) ? sp.to : today;
  const cur = ctx.tenant.settings.currency;
  const money = (v: number) => formatMoney(v, cur, lang);
  const qs = (r: string) => `/accounting/reports?report=${r}&from=${from}&to=${to}`;

  const accountRows = (rows: AccountRow[]) =>
    rows.map((r) => (
      <tr key={String(r.account._id)}>
        <td>
          <Link
            href={`/accounting/accounts/${r.account._id}?from=${from}&to=${to}`}
            className="hover:underline"
          >
            <span className="font-latin text-faint">{r.account.code}</span> {accountLabel(r.account, t)}
          </Link>
        </td>
        <td className={`num text-end ${r.balance < 0 ? 'text-danger' : ''}`}>{money(r.balance)}</td>
      </tr>
    ));
  const totalRow = (label: string, value: number, strong = false) => (
    <tr className={strong ? 'font-semibold' : 'font-medium'}>
      <td>{label}</td>
      <td className={`num text-end ${value < 0 ? 'text-danger' : ''}`}>{money(value)}</td>
    </tr>
  );

  let body: React.ReactNode;
  let subtitle: string;
  if (report === 'trial') {
    const tb = await trialBalance(ctx.tenantId, to);
    subtitle = t('accounting.asOf', { date: formatDate(to, lang) });
    body = (
      <Table>
        <thead>
          <tr>
            <th>{t('accounting.account')}</th>
            <th>{t('accounting.debit')}</th>
            <th>{t('accounting.credit')}</th>
          </tr>
        </thead>
        <tbody>
          {tb.rows.map((r) => {
            const net = r.debit - r.credit;
            return (
              <tr key={String(r.account._id)}>
                <td>
                  <span className="font-latin text-faint">{r.account.code}</span> {accountLabel(r.account, t)}
                </td>
                <td className="num">{net > 0 ? money(net) : ''}</td>
                <td className="num">{net < 0 ? money(-net) : ''}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td>{t('common.sum')}</td>
            <td className="num">{money(tb.rows.reduce((s, r) => s + Math.max(0, r.debit - r.credit), 0))}</td>
            <td className="num">{money(tb.rows.reduce((s, r) => s + Math.max(0, r.credit - r.debit), 0))}</td>
          </tr>
          <tr>
            <td colSpan={3} className={tb.debit === tb.credit ? 'text-success' : 'text-danger'}>
              {tb.debit === tb.credit ? t('accounting.trialOk') : t('accounting.trialOff')}
            </td>
          </tr>
        </tfoot>
      </Table>
    );
  } else if (report === 'bs') {
    const bs = await balanceSheet(ctx.tenantId, to);
    subtitle = t('accounting.asOf', { date: formatDate(to, lang) });
    body = (
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:divide-x lg:divide-line rtl:lg:divide-x-reverse">
        <Table>
          <thead>
            <tr>
              <th colSpan={2}>{t('accounting.types.asset')}</th>
            </tr>
          </thead>
          <tbody>
            {accountRows(bs.assets)}
            {totalRow(t('accounting.totalAssets'), bs.totalAssets, true)}
          </tbody>
        </Table>
        <Table>
          <thead>
            <tr>
              <th colSpan={2}>
                {t('accounting.types.liability')} + {t('accounting.types.equity')}
              </th>
            </tr>
          </thead>
          <tbody>
            {accountRows(bs.liabilities)}
            {totalRow(t('accounting.totalLiabilities'), bs.totalLiabilities)}
            {accountRows(bs.equity)}
            <tr>
              <td>{t('accounting.unclosedProfit')}</td>
              <td className={`num text-end ${bs.earnings < 0 ? 'text-danger' : ''}`}>{money(bs.earnings)}</td>
            </tr>
            {totalRow(t('accounting.totalEquity'), bs.totalEquity)}
            {totalRow(t('accounting.totalLiabilitiesEquity'), bs.totalLiabilities + bs.totalEquity, true)}
          </tbody>
        </Table>
      </div>
    );
  } else {
    const pl = await profitAndLoss(ctx.tenantId, from, to, ctx.branchFilter);
    subtitle = `${formatDate(from, lang)} — ${formatDate(to, lang)}${
      ctx.branchFilter ? ` · ${branchName(ctx, ctx.branchFilter)}` : ''
    }`;
    body = (
      <Table>
        <tbody>
          {accountRows(pl.revenue)}
          {totalRow(t('accounting.revenue'), pl.totalRevenue)}
          {accountRows(pl.cogs)}
          {totalRow(t('accounting.grossProfit'), pl.grossProfit, true)}
          {accountRows(pl.expenses)}
          {totalRow(t('accounting.operatingExpenses'), pl.totalExpenses)}
          {totalRow(t('accounting.netProfit'), pl.netProfit, true)}
        </tbody>
      </Table>
    );
  }

  return (
    <>
      <PageHeader title={t('accounting.title')} />
      <AccountingTabs active="reports" />
      <div className="no-print">
        <Tabs
          active={report}
          tabs={[
            { key: 'pl', label: t('accounting.pl'), href: qs('pl') },
            { key: 'bs', label: t('accounting.bs'), href: qs('bs') },
            { key: 'trial', label: t('accounting.trial'), href: qs('trial') },
          ]}
        />
        <form className="mb-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="report" value={report} />
          {report === 'pl' && (
            <label className="flex flex-col gap-1 text-[12.5px] text-muted">
              {t('reports.from')}
              <input type="date" name="from" defaultValue={from} className="field-input" />
            </label>
          )}
          <label className="flex flex-col gap-1 text-[12.5px] text-muted">
            {report === 'pl' ? t('reports.to') : t('accounting.asOfLabel')}
            <input type="date" name="to" defaultValue={to} className="field-input" />
          </label>
          <button type="submit" className={buttonClass('secondary')}>
            {t('reports.apply')}
          </button>
          <span className="ms-auto">
            <PrintButton />
          </span>
        </form>
      </div>
      <Card
        title={
          <span>
            {ctx.tenant.name} — {t(`accounting.${report}`)}
            <span className="ms-2 text-[13px] font-normal text-muted">{subtitle}</span>
          </span>
        }
        padded={false}
      >
        {body}
      </Card>
      <p className="no-print m-0 mt-3 flex items-center gap-1.5 text-[12.5px] text-faint">
        <Printer size={13} aria-hidden="true" /> {t('accounting.amountsIn', { currency: cur })}
      </p>
    </>
  );
}
