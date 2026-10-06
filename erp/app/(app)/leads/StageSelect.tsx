'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLeadStage } from '@/lib/actions/leads';
import { useI18n } from '@/lib/i18n/client';
import { leadStages } from '@/lib/types';

/** Moves a lead to another stage as soon as a new stage is picked. */
export function StageSelect({ id, stage, label }: { id: string; stage: string; label?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={label ?? t('leads.moveTo')}
      value={stage}
      disabled={pending}
      onChange={(e) => {
        const fd = new FormData();
        fd.set('id', id);
        fd.set('stage', e.target.value);
        start(async () => {
          await setLeadStage(null, fd);
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-line-2 bg-surface px-2 text-[12.5px]"
    >
      {leadStages.map((s) => (
        <option key={s} value={s}>
          {t(`leads.stages.${s}`)}
        </option>
      ))}
    </select>
  );
}
