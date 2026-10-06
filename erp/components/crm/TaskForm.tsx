'use client';

import { ActionForm, SelectField, SubmitButton, TextField } from '../form';
import { createTask } from '@/lib/actions/activity';
import { useI18n } from '@/lib/i18n/client';

export function TaskForm({
  staff,
  me,
  entityType,
  entityId,
  compact = false,
}: {
  staff: { id: string; name: string }[];
  me: string;
  entityType?: string;
  entityId?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={createTask}
      resetOnSuccess
      successMessage={false}
      className={`grid grid-cols-1 gap-3 ${compact ? '' : 'md:grid-cols-[2fr_1fr_1fr_auto]'} items-end`}
    >
      {entityType && <input type="hidden" name="entityType" value={entityType} />}
      {entityId && <input type="hidden" name="entityId" value={entityId} />}
      <TextField label={t('tasks.titleField')} name="title" required />
      <TextField label={t('tasks.due')} name="dueDate" type="date" />
      <SelectField
        label={t('common.assignedTo')}
        name="assignedTo"
        defaultValue={me}
        options={staff.map((s) => ({ value: s.id, label: s.name }))}
      />
      <div>
        <SubmitButton size="md">{t('common.add')}</SubmitButton>
      </div>
    </ActionForm>
  );
}
