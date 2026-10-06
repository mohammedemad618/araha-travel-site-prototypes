'use client';

import { Trash2 } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextField } from '@/components/form';
import { deleteCustomer, deleteTraveller, saveTraveller } from '@/lib/actions/customers';
import { useI18n } from '@/lib/i18n/client';

export type TravellerValues = {
  travellerId?: string;
  name?: string;
  nameEn?: string;
  relation?: string;
  birthDate?: string;
  gender?: string;
  passportNo?: string;
  passportExpiry?: string;
  nationality?: string;
};

export function TravellerForm({ customerId, values = {} }: { customerId: string; values?: TravellerValues }) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={saveTraveller}
      resetOnSuccess={!values.travellerId}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input type="hidden" name="customerId" value={customerId} />
      {values.travellerId && <input type="hidden" name="travellerId" value={values.travellerId} />}
      <TextField label={t('common.name')} name="name" required defaultValue={values.name} />
      <TextField
        label={t('common.nameEn')}
        name="nameEn"
        defaultValue={values.nameEn}
        dir="ltr"
        hint={t('customers.asPassport')}
      />
      <TextField label={t('customers.relation')} name="relation" defaultValue={values.relation} />
      <SelectField
        label={t('customers.gender')}
        name="gender"
        defaultValue={values.gender ?? ''}
        placeholder={t('common.none')}
        options={[
          { value: 'm', label: t('customers.genders.m') },
          { value: 'f', label: t('customers.genders.f') },
        ]}
      />
      <TextField
        label={t('customers.birthDate')}
        name="birthDate"
        type="date"
        defaultValue={values.birthDate}
      />
      <TextField
        label={t('customers.passportNo')}
        name="passportNo"
        defaultValue={values.passportNo}
        dir="ltr"
      />
      <TextField
        label={t('customers.passportExpiry')}
        name="passportExpiry"
        type="date"
        defaultValue={values.passportExpiry}
      />
      <TextField
        label={t('customers.nationality')}
        name="nationality"
        defaultValue={values.nationality ?? (values.travellerId ? '' : 'عراقي')}
      />
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton size="sm">
          {values.travellerId ? t('common.saveChanges') : t('customers.addTraveller')}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeleteTravellerButton({
  customerId,
  travellerId,
}: {
  customerId: string;
  travellerId: string;
}) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteTraveller} successMessage={false} className="inline">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="travellerId" value={travellerId} />
      <SubmitButton size="sm" variant="ghost" confirm={t('common.confirmDelete')}>
        <Trash2 size={14} aria-hidden="true" />
        <span className="sr-only">{t('common.delete')}</span>
      </SubmitButton>
    </ActionForm>
  );
}

export function DeleteCustomerButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteCustomer} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" confirm={t('common.confirmDelete')}>
        {t('common.delete')}
      </SubmitButton>
    </ActionForm>
  );
}
