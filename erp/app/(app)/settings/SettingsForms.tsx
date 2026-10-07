'use client';

import { useState } from 'react';
import {
  ActionButton,
  ActionForm,
  SelectField,
  SubmitButton,
  TextArea,
  TextField,
  useFieldError,
} from '@/components/form';
import { buttonClass } from '@/components/ui';
import { saveBranch, toggleBranch } from '@/lib/actions/branches';
import { memberScopes } from '@/lib/types';
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
  quotePrefix: string;
  invoicePrefix: string;
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
        <TextField
          label={t('settings.quotePrefix')}
          name="quotePrefix"
          required
          defaultValue={values.quotePrefix}
          dir="ltr"
        />
        <TextField
          label={t('settings.invoicePrefix')}
          name="invoicePrefix"
          required
          defaultValue={values.invoicePrefix}
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

export type BranchOption = { id: string; name: string };
type Access = { role: string; scope: string; branchIds: string[] };

/** Role, visibility scope and branches of a member. */
function AccessFields({
  branches,
  initial,
  person,
}: {
  branches: BranchOption[];
  initial: Access;
  person?: string;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState(initial.role);
  const [scope, setScope] = useState(initial.scope);
  const branchError = useFieldError('branchIds');
  const suffix = person ? ` — ${person}` : '';
  const owner = role === 'owner';
  return (
    <>
      <SelectField
        label={t('settings.role') + suffix}
        name="role"
        defaultValue={initial.role}
        onChange={(e) => setRole(e.target.value)}
        options={tenantRoles.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
      />
      {owner ? (
        <input type="hidden" name="scope" value="all" />
      ) : (
        <SelectField
          label={t('settings.scope') + suffix}
          name="scope"
          defaultValue={initial.scope}
          onChange={(e) => setScope(e.target.value)}
          options={memberScopes.map((s) => ({ value: s, label: t(`settings.scopes.${s}`) }))}
        />
      )}
      {!owner && scope !== 'all' && branches.length === 1 && (
        <input type="hidden" name="branchIds" value={branches[0]!.id} />
      )}
      {!owner && scope !== 'all' && branches.length > 1 && (
        <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0 md:col-span-full">
          <legend className="mb-1.5 text-[13px] font-medium text-ink-3">
            {t('settings.memberBranches') + suffix}
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {branches.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-[13.5px]">
                <input
                  type="checkbox"
                  name="branchIds"
                  value={b.id}
                  defaultChecked={initial.branchIds.includes(b.id)}
                />
                {b.name}
              </label>
            ))}
          </div>
          {branchError && <p className="m-0 text-[12.5px] text-danger">{t(`errors.${branchError}`)}</p>}
        </fieldset>
      )}
    </>
  );
}

export function NewUserForm({ branches }: { branches: BranchOption[] }) {
  const { t } = useI18n();
  const [result, setResult] = useState<{ email: string; password?: string } | null>(null);
  return (
    <>
      <p className="m-0 mb-4 text-[13px] text-muted">{t('settings.scopeHint')}</p>
      <ActionForm
        action={createUser}
        resetOnSuccess
        successMessage={false}
        onSuccess={(r) => setResult(r.data as { email: string; password?: string })}
        className="grid grid-cols-1 items-end gap-3 md:grid-cols-4"
      >
        <TextField label={t('common.name')} name="name" required />
        <TextField label={t('common.email')} name="email" type="email" required dir="ltr" />
        <AccessFields branches={branches} initial={{ role: 'sales', scope: 'all', branchIds: [] }} />
        <div className="md:col-span-full">
          <SubmitButton>{t('settings.newUser')}</SubmitButton>
        </div>
      </ActionForm>
      {result?.password ? (
        <Credentials creds={{ email: result.email, password: result.password }} />
      ) : result ? (
        <p role="status" className="m-0 mt-4 rounded-xl border border-line bg-sand p-4">
          {t('settings.memberAdded')}{' '}
          <span className="font-latin" dir="ltr">
            {result.email}
          </span>
        </p>
      ) : null}
    </>
  );
}

export function UserRow({
  id,
  name,
  access,
  branches,
  active,
  self,
}: {
  id: string;
  name: string;
  access: Access;
  branches: BranchOption[];
  active: boolean;
  self: boolean;
}) {
  const { t } = useI18n();
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <details className="group">
          <summary className={buttonClass('secondary', 'sm', 'cursor-pointer list-none')}>
            {t('settings.editAccess')}
          </summary>
          <div className="mt-2 w-[min(560px,80vw)] rounded-xl border border-line bg-surface p-4 text-start shadow-sm">
            <ActionForm action={updateUser} className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="op" value="access" />
              <AccessFields branches={branches} initial={access} person={name} />
              <div className="md:col-span-full">
                <SubmitButton size="sm">{t('common.save')}</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </details>
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

export function BranchForm({
  branch,
}: {
  branch?: { id: string; name: string; code: string; phone?: string; address?: string };
}) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={saveBranch}
      resetOnSuccess={!branch}
      className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1.2fr_0.7fr_1fr_1.5fr_auto]"
    >
      {branch && <input type="hidden" name="id" value={branch.id} />}
      <TextField label={t('settings.branchName')} name="name" required defaultValue={branch?.name} />
      <TextField
        label={t('settings.branchCode')}
        name="code"
        required
        dir="ltr"
        defaultValue={branch?.code}
        hint={branch ? undefined : t('settings.branchCodeHint')}
      />
      <TextField label={t('common.phone')} name="phone" dir="ltr" defaultValue={branch?.phone} />
      <TextField label={t('settings.address')} name="address" defaultValue={branch?.address} />
      <SubmitButton size={branch ? 'sm' : 'md'}>
        {branch ? t('common.save') : t('settings.newBranch')}
      </SubmitButton>
    </ActionForm>
  );
}

export function ToggleBranchButton({ id, active }: { id: string; active: boolean }) {
  const { t } = useI18n();
  return (
    <ActionButton action={toggleBranch} fields={{ id }} variant={active ? 'danger' : 'secondary'}>
      {active ? t('settings.closeBranch') : t('settings.openBranch')}
    </ActionButton>
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
        autoComplete="off"
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
        // A text field, not a password one: browsers ignore autocomplete="off" on
        // password fields and fill in the saved sign-in password.
        type="text"
        inputMode="url"
        spellCheck={false}
        defaultValue={buildHookUrl}
        dir="ltr"
        hint={t('settings.buildHookHint')}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
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
