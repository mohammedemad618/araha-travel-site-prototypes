import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';
import { branchName, branchOptions, requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { getStaff, pageParams, PAGE_SIZE } from '@/lib/queries';
import { formatDate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { ensureLedger } from '@/lib/accounting/ledger';
import { accountLabel } from '@/lib/accounting/labels';
import { Badge, Card, EmptyState, PageHeader, Table } from '@/components/ui';
import { Pagination } from '@/components/ListControls';
import { AccountingTabs } from '../AccountingTabs';
import { ExpenseForm, VoidExpenseButton } from '../AccountingForms';

export const metadata: Metadata = { title: 'Expenses' };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const ctx = await requireTenant('accounting.read');
  const { t, lang } = await getI18n();
  await ensureLedger(ctx.tenantId);
  const canWrite = can(ctx.role, 'accounting.write');
  const r = await repo(ctx);
  const { page, skip } = pageParams((await searchParams).page);
  const [accounts, items, total, staff] = await Promise.all([
    r.accounts.find({ active: true }).sort({ code: 1 }).toArray(),
    r.expenses.find({}).sort({ date: -1, createdAt: -1 }).skip(skip).limit(PAGE_SIZE).toArray(),
    r.expenses.countDocuments({}),
    getStaff(ctx.tenantId),
  ]);
  const allAccounts = await r.accounts
    .find({ _id: { $in: items.flatMap((e) => [e.accountId, e.paidFrom]) } })
    .toArray();
  const name = (id: unknown) => {
    const a = allAccounts.find((x) => String(x._id) === String(id));
    return a ? accountLabel(a, t) : '—';
  };

  return (
    <>
      <PageHeader title={t('accounting.title')} />
      <AccountingTabs active="expenses" />
      {canWrite && (
        <Card title={t('accounting.recordExpense')} className="mb-5">
          <ExpenseForm
            accounts={accounts
              .filter((a) => a.type === 'expense' && a.key !== 'cogs')
              .map((a) => ({ id: String(a._id), label: `${a.code} — ${accountLabel(a, t)}` }))}
            cashAccounts={accounts
              .filter((a) => a.isCash)
              .map((a) => ({ id: String(a._id), label: accountLabel(a, t) }))}
            branches={branchOptions(ctx)}
            today={todayISO()}
            currency={ctx.tenant.settings.currency}
          />
        </Card>
      )}
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={Receipt} title={t('common.noResults')} body={t('accounting.expensesIntro')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('accounting.number')}</th>
                <th>{t('common.date')}</th>
                <th>{t('accounting.expenseAccount')}</th>
                <th>{t('accounting.payee')}</th>
                <th>{t('accounting.paidFrom')}</th>
                {ctx.allBranches.length > 1 && <th>{t('workspace.branch')}</th>}
                <th>{t('common.amount')}</th>
                <th>{t('common.by')}</th>
                <th>
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={String(e._id)} className={e.voided ? 'opacity-55' : ''}>
                  <td className="font-latin whitespace-nowrap">{e.number}</td>
                  <td className="whitespace-nowrap">{formatDate(e.date, lang)}</td>
                  <td>{name(e.accountId)}</td>
                  <td>
                    {e.payee ?? '—'}
                    {e.memo && <div className="text-[12.5px] text-muted">{e.memo}</div>}
                  </td>
                  <td>{name(e.paidFrom)}</td>
                  {ctx.allBranches.length > 1 && (
                    <td className="text-muted">{branchName(ctx, e.branchId)}</td>
                  )}
                  <td className="num whitespace-nowrap font-medium">
                    {formatMoney(e.amount, e.currency, lang)}
                    {e.voided && (
                      <span className="ms-2">
                        <Badge tone="danger">{t('payments.voided')}</Badge>
                      </span>
                    )}
                  </td>
                  <td className="text-muted">
                    {staff.find((s) => s.id === String(e.createdBy))?.name ?? '—'}
                  </td>
                  <td>{canWrite && !e.voided && <VoidExpenseButton id={String(e._id)} />}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination base="/accounting/expenses" params={{}} page={page} total={total} />
      </Card>
    </>
  );
}
