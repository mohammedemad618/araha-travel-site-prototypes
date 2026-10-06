import type { Metadata } from 'next';
import Link from 'next/link';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { can } from '@/lib/rbac';
import { formatMoney } from '@/lib/money';
import { todayISO } from '@/lib/dates';
import { ensureLedger } from '@/lib/accounting/ledger';
import { chartAccounts, totalsByAccount } from '@/lib/accounting/reports';
import { naturalBalance } from '@/lib/accounting/math';
import { accountLabel } from '@/lib/accounting/labels';
import { accountTypes } from '@/lib/types';
import { Badge, Card, PageHeader, Table } from '@/components/ui';
import { EditableRow, EditableTable } from '@/components/EditableRow';
import { AccountingTabs } from '../AccountingTabs';
import { AccountForm, ToggleAccountButton } from '../AccountingForms';

export const metadata: Metadata = { title: 'Chart of accounts' };

export default async function AccountsPage() {
  const ctx = await requireTenant('accounting.read');
  const { t, lang } = await getI18n();
  await ensureLedger(ctx.tenantId);
  const canWrite = can(ctx.role, 'accounting.write');
  const [accounts, totals] = await Promise.all([
    chartAccounts(ctx.tenantId),
    totalsByAccount(ctx.tenantId, { to: todayISO() }),
  ]);
  const cur = ctx.tenant.settings.currency;
  const balance = (a: (typeof accounts)[number]) => {
    const x = totals.get(String(a._id)) ?? { debit: 0, credit: 0 };
    return naturalBalance(a.type, x.debit, x.credit);
  };

  return (
    <>
      <PageHeader title={t('accounting.title')} />
      <AccountingTabs active="accounts" />
      {canWrite && (
        <Card title={t('accounting.newAccount')} className="mb-5">
          <AccountForm />
        </Card>
      )}
      <div className="flex flex-col gap-5">
        {accountTypes.map((type) => {
          const list = accounts.filter((a) => a.type === type);
          if (!list.length) return null;
          return (
            <Card key={type} title={t(`accounting.types.${type}`)} padded={false}>
              <EditableTable
                editors={
                  canWrite
                    ? Object.fromEntries(
                        list.map((a) => [
                          String(a._id),
                          <AccountForm
                            key={String(a._id)}
                            account={{
                              id: String(a._id),
                              code: a.code,
                              name: accountLabel(a, t),
                              type: a.type,
                              isCash: a.isCash,
                              system: Boolean(a.key),
                            }}
                          />,
                        ]),
                      )
                    : {}
                }
              >
                <Table>
                  <thead>
                    <tr>
                      <th>{t('accounting.code')}</th>
                      <th>{t('accounting.accountName')}</th>
                      <th>{t('accounting.balance')}</th>
                      <th>
                        <span className="sr-only">{t('common.actions')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((a) => (
                      <EditableRow
                        key={String(a._id)}
                        id={String(a._id)}
                        editable={canWrite}
                        className={a.active ? '' : 'opacity-55'}
                        label={`${t('common.edit')} — ${accountLabel(a, t)}`}
                        actions={
                          canWrite && !a.key ? (
                            <ToggleAccountButton id={String(a._id)} active={a.active} />
                          ) : undefined
                        }
                      >
                        <td className="font-latin text-muted">{a.code}</td>
                        <td>
                          <Link
                            href={`/accounting/accounts/${a._id}`}
                            className="font-medium hover:underline"
                          >
                            {accountLabel(a, t)}
                          </Link>
                          <span className="ms-2 inline-flex gap-1">
                            {a.key && <Badge>{t('accounting.system')}</Badge>}
                            {a.isCash && <Badge tone="info">{t('accounting.isCash')}</Badge>}
                            {!a.active && <Badge>{t('accounting.closed')}</Badge>}
                          </span>
                        </td>
                        <td className={`num whitespace-nowrap ${balance(a) < 0 ? 'text-danger' : ''}`}>
                          {formatMoney(balance(a), cur, lang)}
                        </td>
                      </EditableRow>
                    ))}
                  </tbody>
                </Table>
              </EditableTable>
            </Card>
          );
        })}
      </div>
    </>
  );
}
