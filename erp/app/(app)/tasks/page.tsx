import type { Metadata } from 'next';
import type { Filter } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { getStaff } from '@/lib/queries';
import type { Task } from '@/lib/types';
import { Card, PageHeader, Tabs } from '@/components/ui';
import { TaskForm } from '@/components/crm/TaskForm';
import { TaskRows } from '@/components/crm/TaskRows';

export const metadata: Metadata = { title: 'Tasks' };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; state?: string }>;
}) {
  const ctx = await requireTenant();
  const { t } = await getI18n();
  const sp = await searchParams;
  const who = sp.who === 'all' ? 'all' : 'mine';
  const state = sp.state === 'done' ? 'done' : 'open';
  const r = await repo(ctx);
  const filter: Filter<Task> = { done: state === 'done' };
  if (who === 'mine') filter.assignedTo = ctx.user._id;
  const [tasks, staff] = await Promise.all([
    r.tasks
      .find(filter)
      .sort(state === 'done' ? { doneAt: -1 } : { dueDate: 1, createdAt: 1 })
      .limit(200)
      .toArray(),
    getStaff(ctx.tenantId),
  ]);
  // Undated open tasks go last.
  if (state === 'open') tasks.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  const href = (patch: Record<string, string>) => {
    const q = new URLSearchParams({ who, state, ...patch });
    return `/tasks?${q}`;
  };

  return (
    <>
      <PageHeader title={t('tasks.title')} intro={t('tasks.intro')} />
      <Card title={t('tasks.new')} className="mb-5">
        <TaskForm staff={staff.filter((s) => s.active)} me={String(ctx.user._id)} />
      </Card>
      <Tabs
        active={`${who}-${state}`}
        tabs={[
          {
            key: 'mine-open',
            label: `${t('tasks.mine')} · ${t('tasks.open')}`,
            href: href({ who: 'mine', state: 'open' }),
          },
          {
            key: 'all-open',
            label: `${t('common.all')} · ${t('tasks.open')}`,
            href: href({ who: 'all', state: 'open' }),
          },
          { key: `${who}-done`, label: t('tasks.done'), href: href({ state: 'done' }) },
        ]}
      />
      <Card>
        <TaskRows tasks={tasks} staff={staff} revalidate="/tasks" />
      </Card>
    </>
  );
}
