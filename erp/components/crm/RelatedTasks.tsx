import type { ObjectId } from 'mongodb';
import { tenantRepo } from '@/lib/repo';
import { getI18n } from '@/lib/i18n/server';
import { getStaff } from '@/lib/queries';
import type { EntityType } from '@/lib/types';
import { Card } from '../ui';
import { TaskForm } from './TaskForm';
import { TaskRows } from './TaskRows';

export async function RelatedTasks({
  tenantId,
  userId,
  type,
  id,
  path,
}: {
  tenantId: ObjectId;
  userId: ObjectId;
  type: EntityType;
  id: ObjectId;
  path: string;
}) {
  const { t } = await getI18n();
  const r = await tenantRepo(tenantId);
  const [tasks, staff] = await Promise.all([
    r.tasks.find({ 'related.type': type, 'related.id': id }).sort({ done: 1, dueDate: 1 }).toArray(),
    getStaff(tenantId),
  ]);
  const active = staff.filter((s) => s.active);
  return (
    <Card title={t('tasks.title')}>
      <TaskRows tasks={tasks} staff={staff} revalidate={path} showRelated={false} />
      <div className="mt-4 border-t border-line pt-4">
        <TaskForm staff={active} me={String(userId)} entityType={type} entityId={String(id)} compact />
      </div>
    </Card>
  );
}
