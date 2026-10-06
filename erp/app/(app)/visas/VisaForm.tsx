'use client';

import { useEffect, useState } from 'react';
import { ActionForm, SelectField, SubmitButton, TextArea, TextField, BranchField } from '@/components/form';
import { CustomerPicker } from '@/components/CustomerPicker';
import { saveVisa } from '@/lib/actions/visas';
import { useI18n } from '@/lib/i18n/client';
import { visaStatuses } from '@/lib/types';

export type VisaValues = {
  id?: string;
  customer?: { id: string; name: string; phone: string };
  travellerId?: string;
  bookingId?: string;
  country?: string;
  visaType?: string;
  status?: string;
  submittedAt?: string;
  expectedAt?: string;
  decisionAt?: string;
  reference?: string;
  notes?: string;
  assignedTo?: string;
  branchId?: string;
};

type Related = { travellers: { id: string; name: string }[]; bookings: { id: string; label: string }[] };

export function VisaForm({
  values = {},
  staff,
  branches,
  me,
}: {
  values?: VisaValues;
  staff: { id: string; name: string }[];
  branches?: { id: string; name: string }[];
  me: string;
}) {
  const { t } = useI18n();
  const [customerId, setCustomerId] = useState(values.customer?.id);
  const [related, setRelated] = useState<Related>({ travellers: [], bookings: [] });

  useEffect(() => {
    if (!customerId) {
      setRelated({ travellers: [], bookings: [] });
      return;
    }
    let live = true;
    fetch(`/api/lookup/customers/${customerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Related | null) => live && d && setRelated(d));
    return () => {
      live = false;
    };
  }, [customerId]);

  return (
    <ActionForm action={saveVisa} className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="md:col-span-1">
        <CustomerPicker
          name="customerId"
          label={t('visas.customer')}
          initial={values.customer}
          onSelect={(o) => setCustomerId(o?.id)}
        />
      </div>
      <SelectField
        label={t('visas.traveller')}
        name="travellerId"
        key={`tr-${customerId}-${related.travellers.length}`}
        defaultValue={values.travellerId ?? related.travellers[0]?.id ?? ''}
        options={related.travellers.map((x) => ({ value: x.id, label: x.name }))}
        placeholder={related.travellers.length ? undefined : t('common.select')}
      />
      <SelectField
        label={t('visas.booking')}
        name="bookingId"
        key={`bk-${customerId}-${related.bookings.length}`}
        defaultValue={values.bookingId ?? ''}
        placeholder={t('common.none')}
        options={related.bookings.map((x) => ({ value: x.id, label: x.label }))}
      />
      <TextField label={t('visas.country')} name="country" required defaultValue={values.country} />
      <TextField label={t('visas.visaType')} name="visaType" defaultValue={values.visaType} />
      <SelectField
        label={t('common.status')}
        name="status"
        defaultValue={values.status ?? 'collecting'}
        options={visaStatuses.map((s) => ({ value: s, label: t(`visas.statuses.${s}`) }))}
      />
      <TextField
        label={t('visas.submittedAt')}
        name="submittedAt"
        type="date"
        defaultValue={values.submittedAt}
      />
      <TextField
        label={t('visas.expectedAt')}
        name="expectedAt"
        type="date"
        defaultValue={values.expectedAt}
      />
      <TextField
        label={t('visas.decisionAt')}
        name="decisionAt"
        type="date"
        defaultValue={values.decisionAt}
      />
      <TextField label={t('visas.reference')} name="reference" defaultValue={values.reference} dir="ltr" />
      <SelectField
        label={t('common.assignedTo')}
        name="assignedTo"
        defaultValue={values.assignedTo ?? me}
        placeholder={t('common.unassigned')}
        options={staff.map((s) => ({ value: s.id, label: s.name }))}
      />
      <BranchField branches={branches} value={values.branchId} />
      <TextArea
        label={t('common.notes')}
        name="notes"
        defaultValue={values.notes}
        fieldClassName="md:col-span-3"
      />
      <div className="md:col-span-3">
        <SubmitButton>{values.id ? t('common.saveChanges') : t('visas.new')}</SubmitButton>
      </div>
    </ActionForm>
  );
}
