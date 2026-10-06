'use client';

import { ActionForm, BranchField, SelectField, SubmitButton, TextArea, TextField } from '@/components/form';
import { CustomerPicker } from '@/components/CustomerPicker';
import { createQuote, updateQuote } from '@/lib/actions/quotes';
import { useI18n } from '@/lib/i18n/client';

export type QuoteValues = {
  id?: string;
  leadId?: string;
  leadName?: string;
  customer?: { id: string; name: string; phone: string };
  title?: string;
  travelDate?: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  currency?: string;
  currencyLocked?: boolean;
  validUntil?: string;
  assignedTo?: string;
  branchId?: string;
  notes?: string;
};

export function QuoteForm({
  values = {},
  staff,
  branches,
  me,
  defaultCurrency,
}: {
  values?: QuoteValues;
  staff: { id: string; name: string }[];
  branches?: { id: string; name: string }[];
  me: string;
  defaultCurrency: string;
}) {
  const { t } = useI18n();
  const editing = Boolean(values.id);
  return (
    <ActionForm
      action={editing ? updateQuote : createQuote}
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.leadId && <input type="hidden" name="leadId" value={values.leadId} />}
      {!editing && !values.leadId && (
        <div className="md:col-span-3">
          <CustomerPicker name="customerId" label={t('bookings.customer')} initial={values.customer} />
        </div>
      )}
      {!editing && values.leadId && (
        <p className="m-0 rounded-lg bg-canvas px-3 py-2 text-[13.5px] md:col-span-3">
          {t('quotes.forLead', { name: values.leadName ?? '' })}
        </p>
      )}
      <TextField
        label={t('bookings.titleField')}
        name="title"
        required
        defaultValue={values.title}
        fieldClassName="md:col-span-2"
        placeholder={t('quotes.titleHint')}
      />
      <SelectField
        label={t('common.currency')}
        name="currency"
        defaultValue={values.currency ?? defaultCurrency}
        disabled={values.currencyLocked}
        options={[
          { value: 'IQD', label: 'IQD' },
          { value: 'USD', label: 'USD' },
        ]}
      />
      {values.currencyLocked && <input type="hidden" name="currency" value={values.currency} />}
      <TextField
        label={t('bookings.travelDate')}
        name="travelDate"
        type="date"
        defaultValue={values.travelDate}
      />
      <TextField
        label={t('bookings.returnDate')}
        name="returnDate"
        type="date"
        defaultValue={values.returnDate}
      />
      <TextField
        label={t('quotes.validUntil')}
        name="validUntil"
        type="date"
        defaultValue={values.validUntil}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t('bookings.adults')}
          name="adults"
          type="number"
          min={0}
          required
          defaultValue={values.adults ?? 1}
        />
        <TextField
          label={t('bookings.children')}
          name="children"
          type="number"
          min={0}
          required
          defaultValue={values.children ?? 0}
        />
      </div>
      <SelectField
        label={t('common.assignedTo')}
        name="assignedTo"
        defaultValue={values.assignedTo ?? me}
        placeholder={t('common.unassigned')}
        options={staff.map((s) => ({ value: s.id, label: s.name }))}
      />
      <BranchField branches={branches} value={values.branchId} />
      <TextArea
        label={t('quotes.notes')}
        name="notes"
        defaultValue={values.notes}
        hint={t('quotes.notesHint')}
        fieldClassName="md:col-span-3"
      />
      <div className="md:col-span-3">
        <SubmitButton>{editing ? t('common.saveChanges') : t('quotes.new')}</SubmitButton>
      </div>
    </ActionForm>
  );
}
