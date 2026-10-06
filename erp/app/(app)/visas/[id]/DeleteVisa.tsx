'use client';

import { ActionForm, SubmitButton } from '@/components/form';
import { deleteVisa } from '@/lib/actions/visas';
import { useI18n } from '@/lib/i18n/client';

export function DeleteVisaButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteVisa} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" confirm={t('common.confirmDelete')}>
        {t('common.delete')}
      </SubmitButton>
    </ActionForm>
  );
}
