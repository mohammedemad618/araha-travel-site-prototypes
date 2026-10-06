import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Inbox,
  Percent,
  Plane,
  Receipt,
  Wallet,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { can } from '@/lib/rbac';
import { dashboardData } from '@/lib/dashboard';
import { getStaff } from '@/lib/queries';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { STAGE_TONE } from '@/lib/ui-tones';
import { leadStages } from '@/lib/types';
import { Badge, Card, LinkButton, PageHeader, Stat } from '@/components/ui';
import { BarChart } from '@/components/BarChart';
import { TaskRows } from '@/components/crm/TaskRows';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const ctx = await requireTenant();
  const { t, lang } = await getI18n();
  const d = await dashboardData(ctx);
  const staff = await getStaff(ctx.tenant._id);
  const money = (v: number) => formatMoney(v, d.currency, lang);
  const seeFinance = can(ctx.role, 'finance.read');
  const seeLeads = can(ctx.role, 'leads.read');

  const alerts: { icon: LucideIcon; text: string; href: string; show: boolean }[] = [
    {
      icon: CalendarClock,
      text: t('dashboard.overdueTasks', { count: d.alerts.overdueTasks }),
      href: '/tasks',
      show: d.alerts.overdueTasks > 0,
    },
    {
      icon: Inbox,
      text: t('dashboard.followUps', { count: d.alerts.followUps }),
      href: '/leads?view=list',
      show: seeLeads && d.alerts.followUps > 0,
    },
    {
      icon: AlertTriangle,
      text: t('dashboard.unconfirmedServices', { count: d.alerts.unconfirmed }),
      href: '/bookings?pending=1',
      show: can(ctx.role, 'bookings.read') && d.alerts.unconfirmed > 0,
    },
    {
      icon: Wallet,
      text: t('dashboard.unpaidDepartures', { count: d.alerts.unpaidSoon }),
      href: '/bookings?due=1',
      show: seeFinance && d.alerts.unpaidSoon > 0,
    },
    {
      icon: AlertTriangle,
      text: t('dashboard.passportsExpiring', { count: d.alerts.passportAlerts }),
      href: '/bookings?status=confirmed',
      show: d.alerts.passportAlerts > 0,
    },
    {
      icon: Receipt,
      text: t('dashboard.pendingVisas', { count: d.alerts.pendingVisas }),
      href: '/visas',
      show: can(ctx.role, 'visas.read') && d.alerts.pendingVisas > 0,
    },
  ];
  const visibleAlerts = alerts.filter((a) => a.show);
  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat(lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', {
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${m}-01T00:00:00Z`));
  const stageMax = Math.max(1, ...leadStages.map((s) => d.stages[s] ?? 0));

  return (
    <>
      <PageHeader
        title={t('dashboard.greeting', { name: ctx.user.name.split(' ')[0] ?? ctx.user.name })}
        intro={new Intl.DateTimeFormat(lang === 'ar' ? 'ar-IQ-u-nu-latn' : 'en-GB', {
          dateStyle: 'full',
          timeZone: 'Asia/Baghdad',
        }).format(new Date())}
        actions={
          <>
            {can(ctx.role, 'leads.write') && <LinkButton href="/leads/new">{t('leads.new')}</LinkButton>}
            {can(ctx.role, 'bookings.write') && (
              <LinkButton href="/bookings/new" variant="primary">
                {t('bookings.new')}
              </LinkButton>
            )}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {seeLeads && (
          <Stat
            label={t('dashboard.newLeads')}
            value={d.newLeads}
            hint={t('dashboard.newLeadsHint')}
            icon={Inbox}
            href="/leads"
          />
        )}
        {seeLeads && (
          <Stat
            label={t('dashboard.conversion')}
            value={d.conversion === null ? '—' : `${d.conversion}%`}
            hint={t('dashboard.conversionHint')}
            icon={Percent}
          />
        )}
        <Stat
          label={t('dashboard.bookingsMonth')}
          value={d.bookingsMonth}
          icon={Briefcase}
          href="/bookings"
        />
        <Stat
          label={t('dashboard.upcoming')}
          value={d.upcomingCount}
          icon={Plane}
          href="/bookings?status=confirmed"
        />
        {seeFinance && (
          <Stat
            label={t('dashboard.revenueMonth')}
            value={money(d.collectedMonth)}
            icon={Wallet}
            href="/payments"
          />
        )}
        {seeFinance && (
          <Stat
            label={t('dashboard.receivables')}
            value={money(d.receivables)}
            icon={Receipt}
            href="/bookings?due=1"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card title={t('dashboard.alerts')}>
            {visibleAlerts.length === 0 ? (
              <p className="m-0 flex items-center gap-2 text-[14px] text-success">
                <CheckCircle2 size={17} aria-hidden="true" /> {t('dashboard.noAlerts')}
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {visibleAlerts.map((a) => (
                  <li key={a.href + a.text}>
                    <Link
                      href={a.href}
                      className="flex items-center gap-3 rounded-lg border border-warning/25 bg-warning-bg px-4 py-2.5 text-[14px] text-warning hover:border-warning/50"
                    >
                      <a.icon size={17} aria-hidden="true" className="shrink-0" />
                      <span className="flex-1">{a.text}</span>
                      <span aria-hidden="true">{lang === 'ar' ? '←' : '→'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {seeFinance && (
            <Card title={t('dashboard.revenueChart')}>
              <BarChart
                title={t('dashboard.revenueChart')}
                data={d.byMonth.map((m) => ({
                  key: m.month,
                  label: monthLabel(m.month),
                  value: Math.max(0, m.value),
                  display: money(m.value),
                }))}
              />
            </Card>
          )}

          <Card title={t('dashboard.upcomingDepartures')} padded={false}>
            {d.departures.length === 0 ? (
              <p className="m-0 p-5 text-[13.5px] text-muted">{t('inventory.noDepartures')}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                {d.departures.map((dep) => (
                  <li key={dep.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-28 shrink-0 text-[13px] text-muted">{formatDate(dep.date, lang)}</span>
                    <Link
                      href={`/inventory/${dep.packageId}`}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      {dep.title}
                    </Link>
                    <Badge tone={dep.left <= 0 ? 'danger' : dep.left <= 5 ? 'warning' : 'success'}>
                      {dep.left <= 0 ? t('inventory.full') : t('dashboard.seatsLeft', { count: dep.left })}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card
            title={t('dashboard.myTasks')}
            actions={
              <Link href="/tasks" className="text-[13px] text-info hover:underline">
                {t('common.showAll')}
              </Link>
            }
          >
            <TaskRows tasks={d.myTasks} staff={staff} revalidate="/" />
          </Card>

          {seeLeads && (
            <Card title={t('dashboard.pipeline')}>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {leadStages.map((s) => {
                  const n = d.stages[s] ?? 0;
                  return (
                    <li key={s} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-[13.5px]">
                      <Badge tone={STAGE_TONE[s]}>{t(`leads.stages.${s}`)}</Badge>
                      <span className="h-2 rounded-full bg-ink/6" aria-hidden="true">
                        <span
                          className="block h-2 rounded-full bg-ink"
                          style={{ width: `${(n / stageMax) * 100}%` }}
                        />
                      </span>
                      <span className="num text-end">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {seeLeads && (
            <Card title={t('dashboard.recentLeads')} padded={false}>
              <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                {d.recentLeads.length === 0 && (
                  <li className="p-5 text-[13.5px] text-muted">{t('common.noResults')}</li>
                )}
                {d.recentLeads.map((l) => (
                  <li key={String(l._id)} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/leads/${l._id}`} className="font-medium hover:underline">
                        {l.name}
                      </Link>
                      <div className="truncate text-[12.5px] text-muted">
                        {t(`leads.sources.${l.source}`)} · {formatDateTime(l.createdAt, lang)}
                      </div>
                    </div>
                    <Badge tone={STAGE_TONE[l.stage]}>{t(`leads.stages.${l.stage}`)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
