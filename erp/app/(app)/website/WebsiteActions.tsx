'use client';

import { ActionForm, SubmitButton } from '@/components/form';
import { deleteMedia, importWebsiteContent, publishNow } from '@/lib/actions/site-content';
import { useI18n } from '@/lib/i18n/client';

export function PublishNowButton({ primary }: { primary?: boolean }) {
  const { t } = useI18n();
  return (
    <ActionForm action={publishNow} className="flex flex-col items-start">
      <SubmitButton variant={primary ? 'primary' : 'secondary'}>{t('website.publishNow')}</SubmitButton>
    </ActionForm>
  );
}

export function ImportContentButton() {
  const { t } = useI18n();
  return (
    <ActionForm action={importWebsiteContent} className="flex flex-col items-start">
      <SubmitButton variant="secondary">{t('website.import')}</SubmitButton>
    </ActionForm>
  );
}

export function DeleteMediaButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteMedia} successMessage={false} className="flex flex-col items-start">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" size="sm" confirm={t('website.confirmDeleteImage')}>
        {t('common.delete')}
      </SubmitButton>
    </ActionForm>
  );
}
