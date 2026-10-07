import { can, type Permission } from './rbac';
import type { Ctx } from './session';
import type { TFn } from './i18n/translate';
import type { NavGroup } from '@/components/Sidebar';

type Item = { key: string; href: string; perm?: Permission | Permission[] };

const TENANT_NAV: { label?: string; items: Item[] }[] = [
  { items: [{ key: 'dashboard', href: '/' }] },
  {
    label: 'sales',
    items: [
      { key: 'leads', href: '/leads', perm: 'leads.read' },
      { key: 'quotes', href: '/quotes', perm: 'quotes.read' },
      { key: 'customers', href: '/customers', perm: 'customers.read' },
      { key: 'tasks', href: '/tasks' },
    ],
  },
  {
    label: 'operations',
    items: [
      { key: 'bookings', href: '/bookings', perm: 'bookings.read' },
      { key: 'inventory', href: '/inventory', perm: 'bookings.read' },
      { key: 'visas', href: '/visas', perm: 'visas.read' },
      { key: 'website', href: '/website', perm: 'website.write' },
    ],
  },
  {
    label: 'finance',
    items: [
      { key: 'payments', href: '/payments', perm: 'finance.read' },
      { key: 'invoices', href: '/invoices', perm: 'finance.read' },
      { key: 'suppliers', href: '/suppliers', perm: 'suppliers.read' },
      { key: 'accounting', href: '/accounting', perm: 'accounting.read' },
      { key: 'reports', href: '/reports', perm: 'reports.read' },
    ],
  },
  {
    items: [{ key: 'settings', href: '/settings', perm: ['settings.manage', 'users.manage', 'audit.read'] }],
  },
];

export function buildNav(ctx: Ctx, t: TFn, badges: Partial<Record<string, number>> = {}): NavGroup[] {
  const allowed = (perm?: Permission | Permission[]) =>
    !perm || (Array.isArray(perm) ? perm.some((p) => can(ctx.role, p)) : can(ctx.role, perm));
  const groups: NavGroup[] = [];
  if (ctx.tenant) {
    for (const g of TENANT_NAV) {
      const items = g.items
        .filter((i) => allowed(i.perm))
        .map((i) => ({ key: i.key, href: i.href, label: t(`nav.${i.key}`), badge: badges[i.key] }));
      if (items.length) groups.push({ label: g.label ? t(`nav.${g.label}`) : undefined, items });
    }
  }
  if (ctx.role === 'platform') {
    groups.push({ items: [{ key: 'platform', href: '/platform', label: t('nav.platform') }] });
  }
  return groups;
}
