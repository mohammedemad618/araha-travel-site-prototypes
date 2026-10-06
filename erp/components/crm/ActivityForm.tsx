'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '../form';
import { addActivity } from '@/lib/actions/activity';
import { useI18n } from '@/lib/i18n/client';

const KINDS = ['note', 'call', 'whatsapp', 'meeting'] as const;

export function ActivityForm({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<(typeof KINDS)[number]>('note');
  return (
    <ActionForm action={addActivity} resetOnSuccess successMessage={false} className="flex flex-col gap-2">
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t('common.status')}>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className="rounded-full border border-line-2 px-3 py-1 text-[12.5px] text-muted aria-checked:border-ink aria-checked:bg-ink aria-checked:text-white"
          >
            {t(`activities.kinds.${k}`)}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={`act-${entityId}`}>
        {t('activities.placeholder')}
      </label>
      <textarea
        id={`act-${entityId}`}
        name="text"
        required
        className="field-input"
        rows={2}
        placeholder={t('activities.placeholder')}
      />
      <div>
        <SubmitButton size="sm">{t('activities.add')}</SubmitButton>
      </div>
    </ActionForm>
  );
}
