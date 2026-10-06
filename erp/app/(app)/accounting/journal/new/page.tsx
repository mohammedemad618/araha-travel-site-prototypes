import type { Metadata } from 'next';
import { branchOptions, requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { todayISO } from '@/lib/dates';
import { ensureLedger } from '@/lib/accounting/ledger';
import { accountLabel } from '@/lib/accounting/labels';
import { Card, PageHeader } from '@/components/ui';
import { ManualEntryForm } from '../../AccountingForms';

export const metadata: Metadata = { title: 'New journal entry' };

export default async function NewEntryPage() {
  const ctx = await requireTenant('accounting.write');
  const { t } = await getI18n();
  await ensureLedger(ctx.tenantId);
  const r = await repo(ctx);
  const accounts = await r.accounts.find({ active: true }).sort({ code: 1 }).toArray();
  return (
    <>
      <PageHeader
        title={t('accounting.manualEntry')}
        intro={t('accounting.manualIntro')}
        back={{ href: '/accounting/journal', label: t('accounting.journal') }}
      />
      <Card>
        <ManualEntryForm
          accounts={accounts.map((a) => ({ id: String(a._id), label: `${a.code} — ${accountLabel(a, t)}` }))}
          branches={branchOptions(ctx)}
          today={todayISO()}
          currency={ctx.tenant.settings.currency}
        />
      </Card>
    </>
  );
}
