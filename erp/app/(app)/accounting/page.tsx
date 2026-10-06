import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { can } from '@/lib/rbac';
import { formatMoney } from '@/lib/money';
import { todayISO } from '@/lib/dates';
import { monthStart } from '@/lib/dashboard';
import { ensureLedger } from '@/lib/accounting/ledger';
import { chartAccounts, profitAndLoss, totalsByAccount } from '@/lib/accounting/reports';
import { naturalBalance } from '@/lib/accounting/math';
import { accountLabel } from '@/lib/accounting/labels';
import { Card, LinkButton, PageHeader, Stat, Table } from '@/components/ui';
import { AccountingTabs } from './AccountingTabs';
import { ResyncButton } from './AccountingForms';

export const metadata: Metadata = { title: 'Accounting' };

export default async function AccountingPage() {
  const ctx = await requireTenant('accounting.read');
  const { t, lang } = await getI18n();
  await ensureLedger(ctx.tenantId);
  const today = todayISO();
  const cur = ctx.tenant.settings.currency;
  const money = (v: number) => formatMoney(v, cur, lang);
  const [accounts, totals, month] = await Promise.all([
    chartAccounts(ctx.tenantId),
    totalsByAccount(ctx.tenantId, { to: today }),
    profitAndLoss(ctx.tenantId, monthStart(0), today, ctx.branchFilter),
  ]);
  const bal = (a: (typeof accounts)[number]) => {
    const x = totals.get(String(a._id)) ?? { debit: 0, credit: 0 };
    return naturalBalance(a.type, x.debit, x.credit);
  };
  const byKey = (k: string) => accounts.find((a) => a.key === k);
  const cash = accounts.filter((a) => a.isCash);
  const cashTotal = cash.reduce((s, a) => s + bal(a), 0);
  const receivable = byKey('receivable');
  const payable = byKey('payable');

  return (
    <>
      <PageHeader
        title={t('accounting.title')}
        intro={t('accounting.intro', { currency: cur })}
        actions={
          can(ctx.role, 'accounting.write') && (
            <>
              <ResyncButton />
              <LinkButton href="/accounting/journal/new" variant="primary" icon={Plus}>
                {t('accounting.manualEntry')}
              </LinkButton>
            </>
          )
        }
      />
      <AccountingTabs active="overview" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('accounting.cashTotal')} value={money(cashTotal)} />
        <Stat label={t('accounting.keys.receivable')} value={receivable ? money(bal(receivable)) : '—'} />
        <Stat label={t('accounting.keys.payable')} value={payable ? money(bal(payable)) : '—'} />
        <Stat
          label={t('accounting.monthProfit')}
          value={
            <span className={month.netProfit < 0 ? 'text-danger' : 'text-success'}>
              {money(month.netProfit)}
            </span>
          }
          hint={`${t('accounting.revenue')}: ${money(month.totalRevenue)}`}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title={t('accounting.cashAccounts')} padded={false}>
          <Table>
            <tbody>
              {cash.map((a) => (
                <tr key={String(a._id)}>
                  <td>
                    <Link href={`/accounting/accounts/${a._id}`} className="font-medium hover:underline">
                      {accountLabel(a, t)}
                    </Link>
                    <span className="ms-2 font-latin text-[12px] text-faint">{a.code}</span>
                  </td>
                  <td className={`num text-end font-medium ${bal(a) < 0 ? 'text-danger' : ''}`}>
                    {money(bal(a))}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card title={t('accounting.thisMonth')} padded={false}>
          <Table>
            <tbody>
              <tr>
                <td>{t('accounting.revenue')}</td>
                <td className="num text-end">{money(month.totalRevenue)}</td>
              </tr>
              <tr>
                <td>{t('accounting.keys.cogs')}</td>
                <td className="num text-end">−{money(month.totalCogs)}</td>
              </tr>
              <tr className="font-medium">
                <td>{t('accounting.grossProfit')}</td>
                <td className="num text-end">{money(month.grossProfit)}</td>
              </tr>
              <tr>
                <td>{t('accounting.operatingExpenses')}</td>
                <td className="num text-end">−{money(month.totalExpenses)}</td>
              </tr>
              <tr className="font-semibold">
                <td>{t('accounting.netProfit')}</td>
                <td className={`num text-end ${month.netProfit < 0 ? 'text-danger' : 'text-success'}`}>
                  {money(month.netProfit)}
                </td>
              </tr>
            </tbody>
          </Table>
        </Card>
      </div>
      <p className="m-0 mt-5 text-[12.5px] text-faint">{t('accounting.howItWorks')}</p>
    </>
  );
}
