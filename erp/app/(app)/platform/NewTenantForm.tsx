'use client';

import { useState } from 'react';
import { ActionForm, SelectField, SubmitButton, TextField } from '@/components/form';
import { createTenant } from '@/lib/actions/platform';
import { useI18n } from '@/lib/i18n/client';
import { CopyButton } from '@/components/CopyButton';

export function NewTenantForm() {
  const { t } = useI18n();
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  return (
    <>
      <ActionForm
        action={createTenant}
        resetOnSuccess
        onSuccess={(r) => setCreds(r.data as { email: string; password: string })}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <TextField label={t('settings.companyName')} name="name" required />
        <TextField
          label={t('platform.slug')}
          name="slug"
          required
          dir="ltr"
          placeholder="ariha-travel"
          hint={t('errors.invalidSlug')}
        />
        <TextField label={t('platform.ownerName')} name="ownerName" required />
        <TextField label={t('platform.ownerEmail')} name="ownerEmail" type="email" required dir="ltr" />
        <SelectField
          label={t('platform.plan')}
          name="plan"
          defaultValue="trial"
          options={(['trial', 'basic', 'pro'] as const).map((p) => ({
            value: p,
            label: t(`platform.plans.${p}`),
          }))}
        />
        <div className="flex items-end">
          <SubmitButton>{t('platform.newTenant')}</SubmitButton>
        </div>
      </ActionForm>
      {creds && (
        <div role="status" className="mt-5 rounded-xl border border-gold/40 bg-sand p-4">
          <p className="m-0 mb-2 font-medium">{t('auth.tempPassword')}</p>
          <p className="m-0 flex flex-wrap items-center gap-3 font-latin" dir="ltr">
            <span>{creds.email}</span>
            <code className="rounded bg-surface px-2 py-1 text-[15px]">{creds.password}</code>
            <CopyButton value={`${creds.email}\n${creds.password}`} />
          </p>
          <p className="m-0 mt-2 text-[13px] text-muted">{t('auth.tempPasswordHint')}</p>
        </div>
      )}
    </>
  );
}
