'use client';

import { ActionForm, SubmitButton, TextField } from '@/components/form';
import { changePassword } from '@/lib/actions/auth';
import { useI18n } from '@/lib/i18n/client';

export function PasswordForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={changePassword} className="flex max-w-md flex-col gap-4">
      <TextField
        label={t('auth.currentPassword')}
        name="current"
        type="password"
        required
        dir="ltr"
        autoComplete="current-password"
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
      <div>
        <SubmitButton>{t('auth.changePassword')}</SubmitButton>
      </div>
    </ActionForm>
  );
}
