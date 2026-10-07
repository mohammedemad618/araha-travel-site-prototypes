'use client';

import { ActionForm, SubmitButton, TextField } from '@/components/form';
import { resetPlatformAdmin } from '@/lib/actions/auth';
import { useI18n } from '@/lib/i18n/client';

export function ResetAdminForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={resetPlatformAdmin} className="flex flex-col gap-4">
      <TextField
        label={t('auth.resetToken')}
        name="token"
        type="password"
        required
        dir="ltr"
        autoComplete="off"
      />
      <TextField
        label={t('auth.email')}
        name="email"
        type="email"
        required
        dir="ltr"
        autoComplete="username"
      />
      <TextField
        label={t('auth.newPassword')}
        name="password"
        type="password"
        required
        dir="ltr"
        autoComplete="new-password"
        hint={t('errors.weakPassword')}
      />
      <TextField
        label={t('auth.confirmPassword')}
        name="confirm"
        type="password"
        required
        dir="ltr"
        autoComplete="new-password"
      />
      <SubmitButton className="mt-2 w-full">{t('common.save')}</SubmitButton>
    </ActionForm>
  );
}
