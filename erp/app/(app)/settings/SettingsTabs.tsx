import { can } from '@/lib/rbac';
import type { TenantCtx } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { Tabs } from '@/components/ui';

export async function SettingsTabs({ ctx, active }: { ctx: TenantCtx; active: string }) {
  const { t } = await getI18n();
  const tabs = [
    {
      key: 'company',
      label: t('settings.company'),
      href: '/settings',
      show: can(ctx.role, 'settings.manage'),
    },
    {
      key: 'users',
      label: t('settings.users'),
      href: '/settings/users',
      show: can(ctx.role, 'users.manage'),
    },
    {
      key: 'branches',
      label: t('settings.branches'),
      href: '/settings/branches',
      show: can(ctx.role, 'settings.manage'),
    },
    {
      key: 'website',
      label: t('settings.website'),
      href: '/settings/website',
      show: can(ctx.role, 'settings.manage'),
    },
    { key: 'audit', label: t('settings.audit'), href: '/settings/audit', show: can(ctx.role, 'audit.read') },
  ].filter((x) => x.show);
  return <Tabs tabs={tabs} active={active} />;
}
