'use client';

import { useState } from 'react';
import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from '@/components/form';
import { CopyButton } from '@/components/CopyButton';
import {
  createUser,
  regenerateApiKey,
  updateCompany,
  updateUser,
  updateWebsite,
} from '@/lib/actions/settings';
import { useI18n } from '@/lib/i18n/client';
import { tenantRoles } from '@/lib/rbac';

export type CompanyValues = {
  name: string;
  currency: string;
  usdRate: number;
  accent: string;
  bookingPrefix: string;
  receiptPrefix: string;
  phone?: string;
  address?: string;
  invoiceFooter?: string;
};

export function CompanyForm({ values }: { values: CompanyValues }) {
  const { t } = useI18n();
  return (
    <ActionForm action={updateCompany} className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <TextField
        label={t('settings.companyName')}
        name="name"
        required
        defaultValue={values.name}
        fieldClassName="md:col-span-2"
      />
      <TextField label={t('settings.accent')} name="accent" type="color" defaultValue={values.accent} />
      <SelectField
        label={t('settings.defaultCurrency')}
        name="currency"
        defaultValue={values.currency}
        options={[
          { value: 'IQD', label: 'IQD — دينار عراقي' },
          { value: 'USD', label: 'USD — دولار' },
        ]}
      />
      <TextField
        label={t('settings.usdRate')}
        name="usdRate"
        type="number"
        step="1"
        required
        defaultValue={values.usdRate}
        dir="ltr"
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t('settings.bookingPrefix')}
          name="bookingPrefix"
          required
          defaultValue={values.bookingPrefix}
          dir="ltr"
        />
        <TextField
          label={t('settings.receiptPrefix')}
          name="receiptPrefix"
          required
          defaultValue={values.receiptPrefix}
          dir="ltr"
        />
      </div>
      <TextField label={t('common.phone')} name="phone" defaultValue={values.phone} dir="ltr" />
      <TextField
        label={t('settings.address')}
        name="address"
        defaultValue={values.address}
        fieldClassName="md:col-span-2"
      />
      <TextArea
        label={t('settings.invoiceFooter')}
        name="invoiceFooter"
        defaultValue={values.invoiceFooter}
        fieldClassName="md:col-span-3"
      />
      <div className="md:col-span-3">
        <SubmitButton>{t('common.saveChanges')}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function Credentials({ creds }: { creds: { email: string; password: string } | null }) {
  const { t } = useI18n();
  if (!creds) return null;
  return (
    <div role="status" className="mt-4 rounded-xl border border-gold/40 bg-sand p-4">
      <p className="m-0 mb-2 font-medium">{t('auth.tempPassword')}</p>
      <p className="m-0 flex flex-wrap items-center gap-3 font-latin" dir="ltr">
        <span>{creds.email}</span>
        <code className="rounded bg-surface px-2 py-1 text-[15px]">{creds.password}</code>
        <CopyButton value={`${creds.email}\n${creds.password}`} />
      </p>
      <p className="m-0 mt-2 text-[13px] text-muted">{t('auth.tempPasswordHint')}</p>
    </div>
  );
}

export function NewUserForm() {
  const { t } = useI18n();
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  return (
    <>
      <ActionForm
        action={createUser}
        resetOnSuccess
        successMessage={false}
        onSuccess={(r) => setCreds(r.data as { email: string; password: string })}
        className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1.2fr_1fr_auto]"
      >
        <TextField label={t('common.name')} name="name" required />
        <TextField label={t('common.email')} name="email" type="email" required dir="ltr" />
        <SelectField
          label={t('settings.role')}
          name="role"
          defaultValue="sales"
          options={tenantRoles.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
        />
        <SubmitButton>{t('settings.newUser')}</SubmitButton>
      </ActionForm>
      <Credentials creds={creds} />
    </>
  );
}

export function UserRow({
  id,
  name,
  role,
  active,
  self,
}: {
  id: string;
  name: string;
  role: string;
  active: boolean;
  self: boolean;
}) {
  const { t } = useI18n();
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ActionForm action={updateUser} successMessage={false} className="flex items-center gap-1">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="role" />
          <label className="sr-only" htmlFor={`role-${id}`}>
            {t('settings.role')} — {name}
          </label>
          <select
            id={`role-${id}`}
            name="role"
            defaultValue={role}
            className="h-8 rounded-md border border-line-2 bg-surface px-2 text-[13px]"
          >
            {tenantRoles.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
          <SubmitButton size="sm" variant="secondary">
            {t('common.save')}
          </SubmitButton>
        </ActionForm>
        <ActionForm
          action={updateUser}
          successMessage={false}
          onSuccess={(r) => r.data && setCreds(r.data as { email: string; password: string })}
          className="inline"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="reset" />
          <SubmitButton size="sm" variant="ghost">
            {t('settings.resetPassword')}
          </SubmitButton>
        </ActionForm>
        {!self && (
          <ActionForm action={updateUser} successMessage={false} className="inline">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="op" value="toggle" />
            <SubmitButton size="sm" variant={active ? 'danger' : 'secondary'}>
              {active ? t('settings.disable') : t('settings.enable')}
            </SubmitButton>
          </ActionForm>
        )}
      </div>
      <Credentials creds={creds} />
    </div>
  );
}

export function WebsiteForm({
  siteUrl,
  buildHookUrl,
  allowedOrigins,
}: {
  siteUrl?: string;
  buildHookUrl?: string;
  allowedOrigins: string[];
}) {
  const { t } = useI18n();
  return (
    <ActionForm action={updateWebsite} className="grid grid-cols-1 gap-4">
      <TextField
        label={t('settings.siteUrl')}
        name="siteUrl"
        defaultValue={siteUrl}
        dir="ltr"
        placeholder="https://araha-travel.netlify.app"
      />
      <TextArea
        label={t('settings.allowedOrigins')}
        name="allowedOrigins"
        defaultValue={allowedOrigins.join('\n')}
        dir="ltr"
        hint={t('settings.allowedOriginsHint')}
        rows={3}
      />
      <TextField
        label={t('settings.buildHook')}
        name="buildHookUrl"
        type="password"
        defaultValue={buildHookUrl}
        dir="ltr"
        hint={t('settings.buildHookHint')}
        autoComplete="off"
      />
      <div>
        <SubmitButton>{t('common.saveChanges')}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function RegenerateKeyButton() {
  const { t } = useI18n();
  return (
    <ActionForm action={regenerateApiKey} successMessage={false} className="inline">
      <SubmitButton size="sm" variant="secondary" confirm={t('settings.regenerateConfirm')}>
        {t('settings.regenerate')}
      </SubmitButton>
    </ActionForm>
  );
}
