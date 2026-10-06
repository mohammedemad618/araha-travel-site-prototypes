import Link from 'next/link';
import { headers } from 'next/headers';
import { KeyRound, LogOut, Search } from 'lucide-react';
import { actionTenant, requireCtx } from '@/lib/session';
import { getDb } from '@/lib/db';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { buildNav } from '@/lib/nav';
import { can } from '@/lib/rbac';
import { todayISO } from '@/lib/dates';
import { logout } from '@/lib/actions/auth';
import { leaveTenant } from '@/lib/actions/platform-switch';
import { setBranchFilter, switchTenant } from '@/lib/actions/workspace';
import { AutoSubmitSelect } from '@/components/WorkspaceSwitcher';
import type { Tenant } from '@/lib/types';
import { Sidebar } from '@/components/Sidebar';
import { LanguageToggle } from '@/components/LanguageToggle';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const { t } = await getI18n();

  // Sidebar counters: new website/WhatsApp leads and the user's overdue tasks.
  const badges: Record<string, number> = {};
  const auth = ctx.tenant ? await actionTenant() : null;
  const tctx = auth?.ok ? auth.ctx : null;
  if (tctx) {
    const r = await repo(tctx);
    const [newLeads, overdue] = await Promise.all([
      can(ctx.role, 'leads.read') ? r.leads.countDocuments({ stage: 'new' }) : 0,
      r.tasks.countDocuments({
        done: false,
        assignedTo: ctx.user._id,
        dueDate: { $lt: todayISO() },
      }),
    ]);
    badges.leads = newLeads;
    badges.tasks = overdue;
  }

  // Members of several companies switch between them; branches narrow what is shown.
  const companies =
    ctx.memberships.length > 1
      ? await (
          await getDb()
        )
          .collection<Tenant>('tenants')
          .find({ _id: { $in: ctx.memberships.map((m) => m.tenantId) } }, { projection: { name: 1 } })
          .sort({ name: 1 })
          .toArray()
      : [];
  const back = (await headers()).get('x-pathname') ?? '/';
  const branchChoices = tctx && tctx.branches.length > 1 ? tctx.branches : [];
  const activeBranch = tctx?.branchFilter
    ? tctx.allBranches.find((b) => String(b._id) === String(tctx.branchFilter))
    : undefined;

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
          <div className="ms-auto flex items-center gap-1.5">
            {companies.length > 1 && ctx.tenant && (
              <AutoSubmitSelect
                action={switchTenant}
                name="tenantId"
                icon="company"
                label={t('workspace.switchCompany')}
                value={String(ctx.tenant._id)}
                options={companies.map((c) => ({ value: String(c._id), label: c.name }))}
              />
            )}
            {branchChoices.length > 0 && (
              <AutoSubmitSelect
                action={setBranchFilter}
                name="branchId"
                icon="branch"
                back={back}
                label={t('workspace.branch')}
                value={activeBranch ? String(activeBranch._id) : ''}
                options={[
                  { value: '', label: t('workspace.allBranches') },
                  ...branchChoices.map((b) => ({ value: String(b._id), label: b.name })),
                ]}
              />
            )}
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
