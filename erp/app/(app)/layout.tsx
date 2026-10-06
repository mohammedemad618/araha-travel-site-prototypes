import Link from 'next/link';
import { KeyRound, LogOut, Search } from 'lucide-react';
import { requireCtx } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { buildNav } from '@/lib/nav';
import { can } from '@/lib/rbac';
import { todayISO } from '@/lib/dates';
import { logout } from '@/lib/actions/auth';
import { leaveTenant } from '@/lib/actions/platform-switch';
import { Sidebar } from '@/components/Sidebar';
import { LanguageToggle } from '@/components/LanguageToggle';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const { t } = await getI18n();

  // Sidebar counters: new website/WhatsApp leads and the user's overdue tasks.
  const badges: Record<string, number> = {};
  if (ctx.tenant) {
    const db = await getDb();
    const [newLeads, overdue] = await Promise.all([
      can(ctx.role, 'leads.read')
        ? db.collection('leads').countDocuments({ tenantId: ctx.tenant._id, stage: 'new' })
        : 0,
      db.collection('tasks').countDocuments({
        tenantId: ctx.tenant._id,
        done: false,
        assignedTo: ctx.user._id,
        dueDate: { $lt: todayISO() },
      }),
    ]);
    badges.leads = newLeads;
    badges.tasks = overdue;
  }

  const accent = ctx.tenant?.settings.accent || '#c99755';
  const brand = ctx.tenant?.name ?? t('app.name');
  const sub = ctx.tenant ? t('app.suite') : t('nav.platform');

  return (
    <div style={{ ['--accent' as string]: accent }} className="min-h-svh">
      <Sidebar groups={buildNav(ctx, t, badges)} brand={brand} sub={sub} />
      <div className="lg:ps-[248px]">
        {ctx.role === 'platform' && ctx.tenant && (
          <div className="no-print flex items-center justify-center gap-3 bg-[var(--accent)] px-4 py-1.5 text-[13px] text-ink">
            <span>{t('platform.workingIn', { name: ctx.tenant.name })}</span>
            <form action={leaveTenant}>
              <button type="submit" className="font-semibold underline underline-offset-2">
                {t('platform.leave')}
              </button>
            </form>
          </div>
        )}
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/90 ps-16 pe-4 backdrop-blur lg:px-8">
          {ctx.tenant && (
            <form action="/search" className="relative max-w-md flex-1" role="search">
              <Search
                size={16}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint"
                aria-hidden="true"
              />
              <input
                name="q"
                type="search"
                aria-label={t('common.search')}
                placeholder={t('common.searchPlaceholder')}
                className="field-input h-10 ps-9"
              />
            </form>
          )}
          <div className="ms-auto flex items-center gap-1">
            <LanguageToggle />
            <Link
              href="/account/password"
              className="hidden items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-muted hover:bg-ink/5 hover:text-ink sm:flex"
              title={t('auth.changePassword')}
            >
              <KeyRound size={15} aria-hidden="true" />
              <span className="max-w-[140px] truncate">{ctx.user.name}</span>
              <span className="text-faint">· {t(`roles.${ctx.role}`)}</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
                aria-label={t('common.signOut')}
                title={t('common.signOut')}
              >
                <LogOut size={17} aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
