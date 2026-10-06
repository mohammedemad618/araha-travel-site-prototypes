import { getI18n } from '@/lib/i18n/server';
import { Tabs } from '@/components/ui';

export async function AccountingTabs({ active }: { active: string }) {
  const { t } = await getI18n();
  return (
    <Tabs
      active={active}
      tabs={[
        { key: 'overview', label: t('accounting.overview'), href: '/accounting' },
        { key: 'journal', label: t('accounting.journal'), href: '/accounting/journal' },
        { key: 'accounts', label: t('accounting.accounts'), href: '/accounting/accounts' },
        { key: 'expenses', label: t('accounting.expenses'), href: '/accounting/expenses' },
        { key: 'reports', label: t('accounting.statements'), href: '/accounting/reports' },
      ]}
    />
  );
}
