'use client';

import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from '@/components/form';
import { createLead, updateLead } from '@/lib/actions/leads';
import { useI18n } from '@/lib/i18n/client';
import { leadSources } from '@/lib/types';

export type LeadFormValues = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  source?: string;
  destination?: string;
  packageSlug?: string;
  departure?: string;
  travellers?: string;
  budget?: string;
  when?: string;
  message?: string;
  value?: string;
  assignedTo?: string;
  nextFollowUp?: string;
};

export function LeadForm({
  values = {},
  staff,
  packages,
  me,
}: {
  values?: LeadFormValues;
  staff: { id: string; name: string }[];
  packages: { slug: string; title: string }[];
  me: string;
}) {
  const { t } = useI18n();
  const editing = Boolean(values.id);
  return (
    <ActionForm action={editing ? updateLead : createLead} className="flex flex-col gap-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TextField label={t('common.name')} name="name" required defaultValue={values.name} />
        <TextField
          label={t('common.phone')}
          name="phone"
          required
          defaultValue={values.phone}
          dir="ltr"
          inputMode="tel"
          placeholder="07xx xxx xxxx"
        />
        <TextField
          label={t('common.email')}
          name="email"
          type="email"
          defaultValue={values.email}
          dir="ltr"
        />
        <SelectField
          label={t('leads.source')}
          name="source"
          defaultValue={values.source ?? 'whatsapp'}
          options={leadSources.map((s) => ({ value: s, label: t(`leads.sources.${s}`) }))}
        />
        <SelectField
          label={t('common.assignedTo')}
          name="assignedTo"
          defaultValue={values.assignedTo ?? me}
          placeholder={t('common.unassigned')}
          options={staff.map((s) => ({ value: s.id, label: s.name }))}
        />
        <TextField
          label={t('leads.nextFollowUp')}
          name="nextFollowUp"
          type="date"
          defaultValue={values.nextFollowUp}
        />
      </div>
      <fieldset className="m-0 grid grid-cols-1 gap-4 rounded-xl border border-line p-4 md:grid-cols-3">
        <legend className="px-1 text-[13px] font-medium text-muted">{t('leads.interest')}</legend>
        <TextField label={t('leads.destination')} name="destination" defaultValue={values.destination} />
        <SelectField
          label={t('leads.package')}
          name="packageSlug"
          defaultValue={values.packageSlug ?? ''}
          placeholder={t('common.none')}
          options={packages.map((p) => ({ value: p.slug, label: p.title }))}
        />
        <TextField label={t('leads.departure')} name="departure" defaultValue={values.departure} />
        <TextField label={t('leads.travellers')} name="travellers" defaultValue={values.travellers} />
        <TextField label={t('leads.budget')} name="budget" defaultValue={values.budget} />
        <TextField label={t('leads.when')} name="when" defaultValue={values.when} />
        <TextField
          label={t('leads.value')}
          name="value"
          inputMode="decimal"
          defaultValue={values.value}
          dir="ltr"
        />
        <TextArea
          label={t('leads.message')}
          name="message"
          defaultValue={values.message}
          fieldClassName="md:col-span-2"
        />
      </fieldset>
      <div>
        <SubmitButton>{editing ? t('common.saveChanges') : t('leads.new')}</SubmitButton>
      </div>
    </ActionForm>
  );
}
