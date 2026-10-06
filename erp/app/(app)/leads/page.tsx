import type { Metadata } from 'next';
import Link from 'next/link';
import { Inbox, Plus, LayoutGrid, List } from 'lucide-react';
import type { Filter } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { can } from '@/lib/rbac';
import { getStaff, nameOrPhone, pageParams, PAGE_SIZE } from '@/lib/queries';
import { formatDateTime, formatDate, todayISO } from '@/lib/dates';
import { STAGE_TONE } from '@/lib/ui-tones';
import { leadSources, leadStages, type Lead } from '@/lib/types';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, buttonClass } from '@/components/ui';
import { FilterBar, Pagination, withParams } from '@/components/ListControls';
import { StageSelect } from './StageSelect';

export const metadata: Metadata = { title: 'Leads' };

type SP = { q?: string; stage?: string; source?: string; mine?: string; view?: string; page?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireTenant('leads.read');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const view = sp.view === 'list' ? 'list' : 'board';
  const db = await getDb();
  const staff = await getStaff(ctx.tenantId);
  const canWrite = can(ctx.role, 'leads.write');

  const filter: Filter<Lead> = { tenantId: ctx.tenantId, ...(nameOrPhone(sp.q) as Filter<Lead>) };
  if (sp.source && (leadSources as readonly string[]).includes(sp.source))
    filter.source = sp.source as Lead['source'];
  if (sp.mine === '1') filter.assignedTo = ctx.user._id;
  const listFilter = { ...filter } as Filter<Lead>;
  if (sp.stage && (leadStages as readonly string[]).includes(sp.stage))
    listFilter.stage = sp.stage as Lead['stage'];

  const params = { q: sp.q, stage: sp.stage, source: sp.source, mine: sp.mine, view: sp.view };
  const today = todayISO();

  const header = (
    <PageHeader
      title={t('leads.title')}
      intro={t('leads.intro')}
      actions={
        <>
          <div
            className="flex rounded-lg border border-line-2 bg-surface p-0.5"
            role="group"
            aria-label={t('common.view')}
          >
            <Link
              href={withParams('/leads', params, { view: undefined, page: undefined })}
              aria-current={view === 'board' ? 'page' : undefined}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-muted aria-[current=page]:bg-ink aria-[current=page]:text-white"
            >
              <LayoutGrid size={15} aria-hidden="true" /> {t('leads.board')}
            </Link>
            <Link
              href={withParams('/leads', params, { view: 'list' })}
              aria-current={view === 'list' ? 'page' : undefined}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-muted aria-[current=page]:bg-ink aria-[current=page]:text-white"
            >
              <List size={15} aria-hidden="true" /> {t('leads.list')}
            </Link>
          </div>
          {can(ctx.role, 'data.export') && (
            <a href="/api/export/leads" className={buttonClass()} download>
              {t('common.exportCsv')}
            </a>
          )}
          {canWrite && (
            <LinkButton href="/leads/new" variant="primary" icon={Plus}>
              {t('leads.new')}
            </LinkButton>
          )}
        </>
      }
    />
  );

  const filters = (
    <FilterBar
      q={sp.q}
      hidden={{ view: sp.view }}
      selects={[
        ...(view === 'list'
          ? [
              {
                name: 'stage',
                label: t('leads.stage'),
                value: sp.stage,
                options: leadStages.map((s) => ({ value: s, label: t(`leads.stages.${s}`) })),
              },
            ]
          : []),
        {
          name: 'source',
          label: t('leads.source'),
          value: sp.source,
          options: leadSources.map((s) => ({ value: s, label: t(`leads.sources.${s}`) })),
        },
      ]}
    >
      <Link
        href={withParams('/leads', params, { mine: sp.mine === '1' ? undefined : '1', page: undefined })}
        aria-pressed={sp.mine === '1'}
        className={buttonClass(sp.mine === '1' ? 'primary' : 'secondary')}
      >
        {t('tasks.mine')}
      </Link>
    </FilterBar>
  );

  if (view === 'board') {
    const columns = await Promise.all(
      leadStages.map(async (stage) => {
        const f = { ...filter, stage } as Filter<Lead>;
        const [items, count] = await Promise.all([
          db.collection<Lead>('leads').find(f).sort({ updatedAt: -1 }).limit(40).toArray(),
          db.collection<Lead>('leads').countDocuments(f),
        ]);
        return { stage, items, count };
      }),
    );
    const empty = columns.every((c) => c.count === 0);
    return (
      <>
        {header}
        {filters}
        {empty && !sp.q && !sp.source ? (
          <div className="card">
            <EmptyState icon={Inbox} title={t('common.noResults')} body={t('leads.intro')} />
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
            <div className="grid min-w-[1100px] grid-cols-5 gap-3">
              {columns.map((col) => (
                <section
                  key={col.stage}
                  aria-label={t(`leads.stages.${col.stage}`)}
                  className="flex flex-col rounded-xl bg-ink/[0.035] p-2.5"
                >
                  <header className="mb-2 flex items-center justify-between px-1.5 py-1">
                    <Badge tone={STAGE_TONE[col.stage]}>{t(`leads.stages.${col.stage}`)}</Badge>
                    <span className="num text-[12.5px] text-muted">{col.count}</span>
                  </header>
                  <ol className="m-0 flex list-none flex-col gap-2 p-0">
                    {col.items.map((lead) => {
                      const due =
                        lead.nextFollowUp &&
                        lead.nextFollowUp <= today &&
                        !['won', 'lost'].includes(lead.stage);
                      return (
                        <li
                          key={String(lead._id)}
                          className="card relative p-3 transition-shadow hover:shadow-sm"
                        >
                          <Link
                            href={`/leads/${lead._id}`}
                            className="font-medium after:absolute after:inset-0 after:content-['']"
                          >
                            {lead.name}
                          </Link>
                          <div className="font-latin text-[12.5px] text-muted" dir="ltr">
                            {lead.phone}
                          </div>
                          {(lead.interest.packageTitle || lead.interest.destination) && (
                            <div className="mt-1.5 truncate text-[13px] text-ink-3">
                              {lead.interest.packageTitle || lead.interest.destination}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-faint">
                            <Badge>{t(`leads.sources.${lead.source}`)}</Badge>
                            {due && <Badge tone="warning">{formatDate(lead.nextFollowUp, lang)}</Badge>}
                            <span>{formatDateTime(lead.createdAt, lang)}</span>
                          </div>
                          {canWrite && (
                            <div className="relative z-10 mt-2">
                              <StageSelect id={String(lead._id)} stage={lead.stage} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {col.count > col.items.length && (
                    <Link
                      href={withParams('/leads', params, { view: 'list', stage: col.stage })}
                      className="mt-2 px-1.5 text-[12.5px] text-info hover:underline"
                    >
                      {t('common.showAll')} ({col.count})
                    </Link>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  const { page, skip } = pageParams(sp.page);
  const [items, total] = await Promise.all([
    db
      .collection<Lead>('leads')
      .find(listFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .toArray(),
    db.collection<Lead>('leads').countDocuments(listFilter),
  ]);
  return (
    <>
      {header}
      {filters}
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={Inbox} title={t('common.noResults')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('common.phone')}</th>
                <th>{t('leads.interest')}</th>
                <th>{t('leads.source')}</th>
                <th>{t('leads.stage')}</th>
                <th>{t('common.assignedTo')}</th>
                <th>{t('common.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <tr key={String(lead._id)}>
                  <td>
                    <Link href={`/leads/${lead._id}`} className="font-medium hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="font-latin text-muted" dir="ltr">
                    {lead.phone}
                  </td>
                  <td className="max-w-[260px] truncate">
                    {lead.interest.packageTitle || lead.interest.destination || '—'}
                  </td>
                  <td>{t(`leads.sources.${lead.source}`)}</td>
                  <td>
                    <Badge tone={STAGE_TONE[lead.stage]}>{t(`leads.stages.${lead.stage}`)}</Badge>
                  </td>
                  <td className="text-muted">
                    {staff.find((s) => s.id === String(lead.assignedTo))?.name ?? '—'}
                  </td>
                  <td className="text-muted">{formatDateTime(lead.createdAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination base="/leads" params={params} page={page} total={total} />
      </Card>
    </>
  );
}
