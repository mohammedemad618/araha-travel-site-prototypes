'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  Users,
  CheckSquare,
  Briefcase,
  CalendarRange,
  Stamp,
  Wallet,
  Building2,
  BarChart3,
  Settings,
  ShieldCheck,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  leads: Inbox,
  customers: Users,
  tasks: CheckSquare,
  bookings: Briefcase,
  inventory: CalendarRange,
  visas: Stamp,
  payments: Wallet,
  suppliers: Building2,
  reports: BarChart3,
  settings: Settings,
  platform: ShieldCheck,
};

export type NavGroup = {
  label?: string;
  items: { key: string; href: string; label: string; badge?: number }[];
};

export function Sidebar({ groups, brand, sub }: { groups: NavGroup[]; brand: string; sub: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav aria-label={t('common.menu')} className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-6">
      {groups.map((g, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {g.label && (
            <div className="px-3 pb-1 text-[11.5px] font-medium tracking-wide text-white/45">{g.label}</div>
          )}
          {g.items.map((item) => {
            const Icon = ICONS[item.key] ?? LayoutDashboard;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-white/75 transition-colors hover:bg-white/8 hover:text-white aria-[current=page]:bg-white/12 aria-[current=page]:text-white"
              >
                <Icon size={18} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="num rounded-full bg-[var(--accent)] px-1.5 text-[11.5px] font-semibold text-ink">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const head = (
    <div className="flex items-center gap-3 px-6 py-5">
      <span className="h-2.5 w-2.5 shrink-0 rotate-45 bg-[var(--accent)]" aria-hidden="true" />
      <div className="min-w-0">
        <div className="truncate text-[16px] font-semibold text-white">{brand}</div>
        <div className="truncate text-[12px] text-white/50">{sub}</div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[248px] flex-col bg-ink lg:flex">
        {head}
        {nav}
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('common.menu')}
        aria-expanded={open}
        className="no-print fixed top-3 start-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white lg:hidden"
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('common.menu')}
        >
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 start-0 flex w-[280px] max-w-[85vw] flex-col bg-ink">
            <div className="flex items-center justify-between pe-3">
              {head}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
