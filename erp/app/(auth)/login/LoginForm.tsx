'use client';

import { ActionForm, SubmitButton, TextField } from '@/components/form';
import { login } from '@/lib/actions/auth';
import { useI18n } from '@/lib/i18n/client';

export function LoginForm({ next }: { next?: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={login} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ''} />
      <TextField
        label={t('auth.email')}
        name="email"
        type="email"
        autoComplete="username"
        required
        dir="ltr"
      />
      <TextField
        label={t('auth.password')}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        dir="ltr"
      />
      <SubmitButton className="mt-2 w-full">{t('auth.signIn')}</SubmitButton>
    </ActionForm>
  );
}
