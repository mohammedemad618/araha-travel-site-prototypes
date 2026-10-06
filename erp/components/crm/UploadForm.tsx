'use client';

import { Trash2, Upload } from 'lucide-react';
import { ActionForm, Field, SubmitButton } from '../form';
import { deleteAttachment, uploadAttachment } from '@/lib/actions/files';
import { useI18n } from '@/lib/i18n/client';

export function UploadForm({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={uploadAttachment}
      resetOnSuccess
      successMessage={false}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <Field
        label={t('common.upload')}
        name="file"
        hint={t('common.uploadHint')}
        className="min-w-[220px] flex-1"
      >
        {(p) => (
          <input
            {...p}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="field-input py-1.5"
          />
        )}
      </Field>
      <SubmitButton size="md" variant="secondary">
        <Upload size={15} aria-hidden="true" /> {t('common.upload')}
      </SubmitButton>
    </ActionForm>
  );
}

export function DeleteFileButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteAttachment} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="ghost" confirm={t('common.confirmDelete')}>
        <Trash2 size={14} aria-hidden="true" />
        <span className="sr-only">{t('common.delete')}</span>
      </SubmitButton>
    </ActionForm>
  );
}
