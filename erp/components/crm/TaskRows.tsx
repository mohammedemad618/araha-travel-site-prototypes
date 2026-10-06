import Link from 'next/link';
import { getI18n } from '@/lib/i18n/server';
import { formatDate, todayISO } from '@/lib/dates';
import { toggleTask } from '@/lib/actions/activity';
import type { Task } from '@/lib/types';
import { ActionButton } from '../form';
import { Badge } from '../ui';

const SECTION: Record<string, string> = {
  lead: 'leads',
  customer: 'customers',
  booking: 'bookings',
  visa: 'visas',
  supplier: 'suppliers',
};

export async function TaskRows({
  tasks,
  staff,
  revalidate,
  showRelated = true,
}: {
  tasks: Task[];
  staff: { id: string; name: string }[];
  revalidate?: string;
  showRelated?: boolean;
}) {
  const { t, lang } = await getI18n();
  const today = todayISO();
  if (!tasks.length) return <p className="m-0 text-[13.5px] text-muted">{t('tasks.noTasks')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
      {tasks.map((task) => {
        const overdue = !task.done && task.dueDate && task.dueDate < today;
        return (
          <li key={String(task._id)} className="flex items-start gap-3 py-2.5">
            <ActionButton
              action={toggleTask}
              fields={{ id: String(task._id), done: task.done ? '0' : '1', path: revalidate ?? '' }}
              variant={task.done ? 'secondary' : 'ghost'}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${task.done ? 'border-success bg-success text-white' : 'border-line-2'}`}
                aria-hidden="true"
              >
                {task.done ? '✓' : ''}
              </span>
              <span className="sr-only">{task.done ? t('tasks.reopen') : t('tasks.markDone')}</span>
            </ActionButton>
            <div className="min-w-0 flex-1">
              <div className={task.done ? 'text-faint line-through' : ''}>{task.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-muted">
                {task.dueDate && (
                  <Badge tone={overdue ? 'danger' : task.dueDate === today ? 'warning' : 'neutral'}>
                    {overdue ? `${t('common.overdue')} · ` : ''}
                    {formatDate(task.dueDate, lang)}
                  </Badge>
                )}
                <span>{staff.find((s) => s.id === String(task.assignedTo))?.name}</span>
                {showRelated && task.related && (
                  <Link
                    href={`/${SECTION[task.related.type]}/${task.related.id}`}
                    className="text-info hover:underline"
                  >
                    {t(`nav.${SECTION[task.related.type]}`)}
                  </Link>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
