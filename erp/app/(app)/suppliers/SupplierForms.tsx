'use client';

import { Trash2 } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from '@/components/form';
import { deleteSupplier, saveSupplier } from '@/lib/actions/suppliers';
import { deleteSupplierPayment, recordSupplierPayment } from '@/lib/actions/payments';
import { useI18n } from '@/lib/i18n/client';
import { paymentMethods, supplierTypes } from '@/lib/types';

export type SupplierValues = {
  id?: string;
  name?: string;
  type?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  country?: string;
  notes?: string;
};

export function SupplierForm({ values = {} }: { values?: SupplierValues }) {
  const { t } = useI18n();
  return (
    <ActionForm action={saveSupplier} className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <TextField label={t('common.name')} name="name" required defaultValue={values.name} />
      <SelectField
        label={t('suppliers.type')}
        name="type"
        defaultValue={values.type ?? 'hotel'}
        options={supplierTypes.map((s) => ({ value: s, label: t(`suppliers.types.${s}`) }))}
      />
      <TextField label={t('suppliers.country')} name="country" defaultValue={values.country} />
      <TextField label={t('suppliers.contactName')} name="contactName" defaultValue={values.contactName} />
      <TextField label={t('common.phone')} name="phone" defaultValue={values.phone} dir="ltr" />
      <TextField label={t('common.email')} name="email" type="email" defaultValue={values.email} dir="ltr" />
      <TextArea
        label={t('common.notes')}
        name="notes"
        defaultValue={values.notes}
        fieldClassName="md:col-span-3"
      />
      <div className="md:col-span-3">
        <SubmitButton>{values.id ? t('common.saveChanges') : t('suppliers.new')}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function SupplierPaymentForm({
  supplierId,
  today,
  currency,
}: {
  supplierId: string;
  today: string;
  currency: string;
}) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={recordSupplierPayment}
      resetOnSuccess
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <input type="hidden" name="supplierId" value={supplierId} />
      <TextField label={t('common.amount')} name="amount" required inputMode="decimal" dir="ltr" />
      <SelectField
        label={t('common.currency')}
        name="currency"
        defaultValue={currency}
        options={[
          { value: 'IQD', label: 'IQD' },
          { value: 'USD', label: 'USD' },
        ]}
      />
      <SelectField
        label={t('payments.method')}
        name="method"
        defaultValue="bank_transfer"
        options={paymentMethods.map((m) => ({ value: m, label: t(`payments.methods.${m}`) }))}
      />
      <TextField label={t('common.date')} name="date" type="date" required defaultValue={today} />
      <TextField label={t('payments.reference')} name="reference" dir="ltr" />
      <TextField label={t('common.notes')} name="notes" />
      <div className="sm:col-span-2 lg:col-span-3">
        <SubmitButton>{t('suppliers.recordPayment')}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeleteSupplierPaymentButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteSupplierPayment} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="ghost" confirm={t('common.confirmDelete')}>
        <Trash2 size={14} aria-hidden="true" />
        <span className="sr-only">{t('common.delete')}</span>
      </SubmitButton>
    </ActionForm>
  );
}

export function DeleteSupplierButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteSupplier} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" confirm={t('common.confirmDelete')}>
        {t('common.delete')}
      </SubmitButton>
    </ActionForm>
  );
}
