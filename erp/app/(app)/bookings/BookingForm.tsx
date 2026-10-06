'use client';

import { useState } from 'react';
import { ActionForm, SelectField, SubmitButton, TextArea, TextField, BranchField } from '@/components/form';
import { CustomerPicker } from '@/components/CustomerPicker';
import { createBooking, updateBooking } from '@/lib/actions/bookings';
import { useI18n } from '@/lib/i18n/client';
import { bookingTypes } from '@/lib/types';

export type PackageChoice = {
  id: string;
  title: string;
  currency: string;
  departures: { id: string; label: string; left: number; closed: boolean }[];
};

export type BookingValues = {
  id?: string;
  customer?: { id: string; name: string; phone: string };
  type?: string;
  title?: string;
  packageId?: string;
  departureId?: string;
  travelDate?: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  currency?: string;
  assignedTo?: string;
  branchId?: string;
  notes?: string;
  currencyLocked?: boolean;
};

export function BookingForm({
  values = {},
  packages,
  staff,
  branches,
  me,
  defaultCurrency,
}: {
  values?: BookingValues;
  packages: PackageChoice[];
  staff: { id: string; name: string }[];
  branches?: { id: string; name: string }[];
  me: string;
  defaultCurrency: string;
}) {
  const { t } = useI18n();
  const editing = Boolean(values.id);
  const [type, setType] = useState(values.type ?? (packages.length ? 'package' : 'custom'));
  const [pkgId, setPkgId] = useState(values.packageId ?? '');
  const [title, setTitle] = useState(values.title ?? '');
  const pkg = packages.find((p) => p.id === pkgId);

  return (
    <ActionForm
      action={editing ? updateBooking : createBooking}
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {editing ? (
        <input type="hidden" name="customerId" value={values.customer?.id ?? ''} />
      ) : (
        <div className="md:col-span-2">
          <CustomerPicker name="customerId" label={t('bookings.customer')} initial={values.customer} />
        </div>
      )}
      <SelectField
        label={t('bookings.type')}
        name="type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={bookingTypes.map((x) => ({ value: x, label: t(`bookings.types.${x}`) }))}
      />
      {type === 'package' && (
        <>
          <SelectField
            label={t('bookings.package')}
            name="packageId"
            value={pkgId}
            onChange={(e) => {
              setPkgId(e.target.value);
              const p = packages.find((x) => x.id === e.target.value);
              if (p && !title) setTitle(p.title);
            }}
            placeholder={t('common.select')}
            options={packages.map((p) => ({ value: p.id, label: p.title }))}
          />
          <SelectField
            label={t('bookings.departure')}
            name="departureId"
            defaultValue={values.departureId ?? ''}
            key={pkgId}
            placeholder={t('common.none')}
            options={(pkg?.departures ?? []).map((d) => ({
              value: d.id,
              label: `${d.label} · ${d.closed ? t('inventory.closed') : d.left <= 0 ? t('inventory.full') : t('dashboard.seatsLeft', { count: d.left })}`,
            }))}
          />
        </>
      )}
      <TextField
        label={t('bookings.titleField')}
        name="title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        hint={t('bookings.titleHint')}
        fieldClassName={type === 'package' ? '' : 'md:col-span-2'}
      />
      {type !== 'package' && (
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
      )}
      {(type === 'package' || values.currencyLocked) && (
        <input type="hidden" name="currency" value={pkg?.currency ?? values.currency ?? defaultCurrency} />
      )}
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
        label={t('common.notes')}
        name="notes"
        defaultValue={values.notes}
        fieldClassName="md:col-span-3"
      />
      <div className="md:col-span-3">
        <SubmitButton>{editing ? t('common.saveChanges') : t('bookings.new')}</SubmitButton>
      </div>
    </ActionForm>
  );
}
