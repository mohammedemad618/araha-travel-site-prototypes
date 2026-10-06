'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  ActionButton,
  ActionForm,
  BranchField,
  SelectField,
  SubmitButton,
  TextField,
} from '@/components/form';
import {
  createManualEntry,
  recordExpense,
  resyncLedger,
  reverseEntry,
  saveAccount,
  toggleAccount,
  voidExpense,
} from '@/lib/actions/accounting';
import { useI18n } from '@/lib/i18n/client';
import { accountTypes } from '@/lib/types';
import { buttonClass } from '@/components/ui';

type Option = { id: string; label: string };

export function AccountForm({
  account,
}: {
  account?: { id: string; code: string; name: string; type: string; isCash?: boolean; system?: boolean };
}) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={saveAccount}
      resetOnSuccess={!account}
      successMessage={Boolean(account)}
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[0.6fr_1.4fr_1fr_auto_auto]"
    >
      {account && <input type="hidden" name="id" value={account.id} />}
      <TextField label={t('accounting.code')} name="code" required dir="ltr" defaultValue={account?.code} />
      <TextField
        label={t('accounting.accountName')}
        name="name"
        required
        defaultValue={account?.name}
        readOnly={account?.system}
      />
      <SelectField
        label={t('accounting.type')}
        name="type"
        defaultValue={account?.type ?? 'expense'}
        options={accountTypes.map((x) => ({ value: x, label: t(`accounting.types.${x}`) }))}
      />
      <label className="flex h-10 items-center gap-2 text-[13px]">
        <input type="checkbox" name="isCash" defaultChecked={account?.isCash} />
        {t('accounting.isCash')}
      </label>
      <SubmitButton size={account ? 'sm' : 'md'}>
        {account ? t('common.save') : t('accounting.newAccount')}
      </SubmitButton>
    </ActionForm>
  );
}

export function ToggleAccountButton({ id, active }: { id: string; active: boolean }) {
  const { t } = useI18n();
  return (
    <ActionButton action={toggleAccount} fields={{ id }} variant="ghost">
      {active ? t('accounting.close') : t('accounting.reopen')}
    </ActionButton>
  );
}

type Row = { key: number; accountId: string; debit: string; credit: string; memo: string };

/** A balanced entry built line by line; totals update as the user types. */
export function ManualEntryForm({
  accounts,
  branches,
  today,
  currency,
}: {
  accounts: Option[];
  branches?: { id: string; name: string }[];
  today: string;
  currency: string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([
    { key: 1, accountId: '', debit: '', credit: '', memo: '' },
    { key: 2, accountId: '', debit: '', credit: '', memo: '' },
  ]);
  const num = (v: string) => Number(v.replace(/[,\s]/g, '')) || 0;
  const debit = rows.reduce((s, r) => s + num(r.debit), 0);
  const credit = rows.reduce((s, r) => s + num(r.credit), 0);
  const set = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const fmt = (v: number) => new Intl.NumberFormat('en-US').format(v);
  return (
    <ActionForm action={createManualEntry} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField label={t('common.date')} name="date" type="date" required defaultValue={today} />
        <TextField label={t('accounting.memo')} name="memo" required fieldClassName="sm:col-span-2" />
        <BranchField branches={branches} />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[640px]">
          <thead>
            <tr>
              <th>{t('accounting.account')}</th>
              <th>
                {t('accounting.debit')} ({currency})
              </th>
              <th>
                {t('accounting.credit')} ({currency})
              </th>
              <th>{t('accounting.lineMemo')}</th>
              <th>
                <span className="sr-only">{t('common.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td>
                  <select
                    name="accountId"
                    aria-label={`${t('accounting.account')} ${i + 1}`}
                    value={r.accountId}
                    onChange={(e) => set(r.key, { accountId: e.target.value })}
                    className="field-input"
                  >
                    <option value="">—</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    name="debit"
                    aria-label={`${t('accounting.debit')} ${i + 1}`}
                    inputMode="decimal"
                    dir="ltr"
                    value={r.debit}
                    onChange={(e) =>
                      set(r.key, { debit: e.target.value, credit: e.target.value ? '' : r.credit })
                    }
                    className="field-input w-36"
                  />
                </td>
                <td>
                  <input
                    name="credit"
                    aria-label={`${t('accounting.credit')} ${i + 1}`}
                    inputMode="decimal"
                    dir="ltr"
                    value={r.credit}
                    onChange={(e) =>
                      set(r.key, { credit: e.target.value, debit: e.target.value ? '' : r.debit })
                    }
                    className="field-input w-36"
                  />
                </td>
                <td>
                  <input
                    name="lineMemo"
                    aria-label={`${t('accounting.lineMemo')} ${i + 1}`}
                    value={r.memo}
                    onChange={(e) => set(r.key, { memo: e.target.value })}
                    className="field-input"
                  />
                </td>
                <td>
                  {rows.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      className={buttonClass('ghost', 'sm')}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td>{t('common.sum')}</td>
              <td className="num">{fmt(debit)}</td>
              <td className="num">{fmt(credit)}</td>
              <td colSpan={2} className={debit === credit && debit > 0 ? 'text-success' : 'text-danger'}>
                {debit === credit && debit > 0
                  ? t('accounting.balanced')
                  : t('accounting.difference', { value: fmt(Math.abs(debit - credit)) })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setRows((rs) => [
              ...rs,
              { key: Math.max(...rs.map((x) => x.key)) + 1, accountId: '', debit: '', credit: '', memo: '' },
            ])
          }
          className={buttonClass('secondary')}
        >
          <Plus size={15} aria-hidden="true" /> {t('accounting.addLine')}
        </button>
        <SubmitButton>{t('accounting.post')}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ReverseEntryButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionButton
      action={reverseEntry}
      fields={{ id }}
      variant="danger"
      size="md"
      confirm={t('accounting.reverseConfirm')}
    >
      {t('accounting.reverse')}
    </ActionButton>
  );
}

export function ExpenseForm({
  accounts,
  cashAccounts,
  branches,
  today,
  currency,
}: {
  accounts: Option[];
  cashAccounts: Option[];
  branches?: { id: string; name: string }[];
  today: string;
  currency: string;
}) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={recordExpense}
      resetOnSuccess
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <TextField label={t('common.date')} name="date" type="date" required defaultValue={today} />
      <SelectField
        label={t('accounting.expenseAccount')}
        name="accountId"
        required
        placeholder="—"
        options={accounts.map((a) => ({ value: a.id, label: a.label }))}
      />
      <TextField label={t('common.amount')} name="amount" required inputMode="decimal" dir="ltr" />
      <SelectField
        label={t('common.currency')}
        name="currency"
        defaultValue={currency}
        options={[
          { value: 'IQD', label: 'IQD' },
          { value: 'USD', label: 'USD' },
        ]}
      />
      <SelectField
        label={t('accounting.paidFrom')}
        name="paidFrom"
        required
        defaultValue={cashAccounts[0]?.id}
        options={cashAccounts.map((a) => ({ value: a.id, label: a.label }))}
      />
      <TextField label={t('accounting.payee')} name="payee" />
      <TextField label={t('common.notes')} name="memo" />
      <BranchField branches={branches} />
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton>{t('accounting.recordExpense')}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function VoidExpenseButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionButton
      action={voidExpense}
      fields={{ id }}
      variant="ghost"
      confirm={t('accounting.voidExpenseConfirm')}
    >
      {t('payments.void')}
    </ActionButton>
  );
}

export function ResyncButton() {
  const { t } = useI18n();
  return (
    <ActionForm action={async () => resyncLedger()} className="inline">
      <SubmitButton variant="secondary">{t('accounting.resync')}</SubmitButton>
    </ActionForm>
  );
}
