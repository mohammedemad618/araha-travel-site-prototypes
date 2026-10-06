'use client';

import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from '@/components/form';
import { createCustomer, updateCustomer } from '@/lib/actions/customers';
import { useI18n } from '@/lib/i18n/client';
import { leadSources } from '@/lib/types';

export type CustomerValues = {
  id?: string;
  name?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  city?: string;
  notes?: string;
  tags?: string;
  source?: string;
};

export function CustomerForm({ values = {} }: { values?: CustomerValues }) {
  const { t } = useI18n();
  const editing = Boolean(values.id);
  return (
    <ActionForm
      action={editing ? updateCustomer : createCustomer}
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}
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
        label={t('customers.phone2')}
        name="phone2"
        defaultValue={values.phone2}
        dir="ltr"
        inputMode="tel"
      />
      <TextField label={t('common.email')} name="email" type="email" defaultValue={values.email} dir="ltr" />
      <TextField label={t('common.city')} name="city" defaultValue={values.city} />
      <SelectField
        label={t('customers.source')}
        name="source"
        defaultValue={values.source ?? ''}
        placeholder={t('common.none')}
        options={leadSources.map((s) => ({ value: s, label: t(`leads.sources.${s}`) }))}
      />
      <TextField
        label={t('customers.tags')}
        name="tags"
        defaultValue={values.tags}
        hint={t('customers.tagsHint')}
        fieldClassName="md:col-span-3"
      />
      <TextArea
        label={t('common.notes')}
        name="notes"
        defaultValue={values.notes}
        fieldClassName="md:col-span-3"
      />
      <div className="md:col-span-3">
        <SubmitButton>{editing ? t('common.saveChanges') : t('customers.new')}</SubmitButton>
      </div>
    </ActionForm>
  );
}
