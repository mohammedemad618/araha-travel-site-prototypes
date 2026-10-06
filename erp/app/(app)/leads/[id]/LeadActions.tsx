'use client';

import { ActionForm, SubmitButton } from '@/components/form';
import { convertLead, deleteLead, setLeadStage } from '@/lib/actions/leads';
import { useI18n } from '@/lib/i18n/client';
import { leadStages } from '@/lib/types';

export function StageButtons({ id, stage }: { id: string; stage: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      {leadStages
        .filter((s) => s !== 'lost')
        .map((s) => (
          <ActionForm key={s} action={setLeadStage} successMessage={false} className="inline">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="stage" value={s} />
            <SubmitButton size="sm" variant={s === stage ? 'primary' : 'secondary'}>
              {t(`leads.stages.${s}`)}
            </SubmitButton>
          </ActionForm>
        ))}
    </div>
  );
}

export function LostForm({ id, reason }: { id: string; reason?: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={setLeadStage} successMessage={false} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stage" value="lost" />
      <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[13px] font-medium text-ink-3">
        {t('leads.lostReason')}
        <input name="lostReason" defaultValue={reason} className="field-input" />
      </label>
      <SubmitButton size="md" variant="danger">
        {t('leads.stages.lost')}
      </SubmitButton>
    </ActionForm>
  );
}

export function ConvertButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={convertLead} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="accent">{t('leads.convert')}</SubmitButton>
    </ActionForm>
  );
}

export function DeleteLeadButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteLead} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" confirm={t('common.confirmDelete')}>
        {t('common.delete')}
      </SubmitButton>
    </ActionForm>
  );
}
