'use client';

import { Trash2 } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextField } from '@/components/form';
import {
  deleteDeparture,
  deletePackage,
  importFromWebsite,
  publishWebsite,
  saveDeparture,
  savePackage,
} from '@/lib/actions/inventory';
import { useI18n } from '@/lib/i18n/client';

export type PackageValues = {
  id?: string;
  slug?: string;
  title?: string;
  titleEn?: string;
  destination?: string;
  days?: number;
  nights?: number;
  currency?: string;
  price?: string;
  childPrice?: string;
  active?: boolean;
};

export function PackageForm({
  values = {},
  defaultCurrency,
}: {
  values?: PackageValues;
  defaultCurrency: string;
}) {
  const { t } = useI18n();
  return (
    <ActionForm action={savePackage} className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <TextField
        label={t('inventory.titleField')}
        name="title"
        required
        defaultValue={values.title}
        fieldClassName="md:col-span-2"
      />
      <TextField
        label={t('inventory.slug')}
        name="slug"
        required
        defaultValue={values.slug}
        dir="ltr"
        placeholder="enchanting-istanbul"
        fieldClassName="md:col-span-2"
      />
      <TextField
        label={t('common.nameEn')}
        name="titleEn"
        defaultValue={values.titleEn}
        dir="ltr"
        fieldClassName="md:col-span-2"
      />
      <TextField
        label={t('inventory.destination')}
        name="destination"
        required
        defaultValue={values.destination}
      />
      <SelectField
        label={t('common.currency')}
        name="currency"
        defaultValue={values.currency ?? defaultCurrency}
        options={[
          { value: 'IQD', label: 'IQD — دينار' },
          { value: 'USD', label: 'USD — $' },
        ]}
      />
      <TextField
        label={t('inventory.days')}
        name="days"
        type="number"
        min={1}
        required
        defaultValue={values.days ?? 7}
      />
      <TextField
        label={t('inventory.nights')}
        name="nights"
        type="number"
        min={0}
        required
        defaultValue={values.nights ?? 6}
      />
      <TextField
        label={t('inventory.price')}
        name="price"
        required
        inputMode="decimal"
        dir="ltr"
        defaultValue={values.price}
      />
      <TextField
        label={t('inventory.childPrice')}
        name="childPrice"
        inputMode="decimal"
        dir="ltr"
        defaultValue={values.childPrice}
      />
      <label className="flex items-center gap-2 text-[14px] md:col-span-4">
        <input
          type="checkbox"
          name="active"
          defaultChecked={values.active ?? true}
          className="h-4 w-4 accent-ink"
        />
        {t('inventory.active')}
      </label>
      <div className="md:col-span-4">
        <SubmitButton>{values.id ? t('common.saveChanges') : t('inventory.newPackage')}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export type DepartureValues = {
  id?: string;
  date?: string;
  capacity?: number;
  price?: string;
  notes?: string;
  closed?: boolean;
};

export function DepartureForm({ packageId, values = {} }: { packageId: string; values?: DepartureValues }) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={saveDeparture}
      resetOnSuccess={!values.id}
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_0.7fr_1fr_1.4fr_auto_auto]"
    >
      <input type="hidden" name="packageId" value={packageId} />
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <TextField label={t('common.date')} name="date" type="date" required defaultValue={values.date} />
      <TextField
        label={t('inventory.capacity')}
        name="capacity"
        type="number"
        min={1}
        required
        defaultValue={values.capacity ?? 20}
      />
      <TextField
        label={t('inventory.priceOverride')}
        name="price"
        inputMode="decimal"
        dir="ltr"
        defaultValue={values.price}
      />
      <TextField label={t('common.notes')} name="notes" defaultValue={values.notes} />
      <label className="flex h-10 items-center gap-2 text-[14px]">
        <input type="checkbox" name="closed" defaultChecked={values.closed} className="h-4 w-4 accent-ink" />
        {t('inventory.closed')}
      </label>
      <SubmitButton size="md">{values.id ? t('common.save') : t('inventory.addDeparture')}</SubmitButton>
    </ActionForm>
  );
}

export function DeleteDepartureButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteDeparture} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="ghost" confirm={t('common.confirmDelete')}>
        <Trash2 size={14} aria-hidden="true" />
        <span className="sr-only">{t('common.delete')}</span>
      </SubmitButton>
    </ActionForm>
  );
}

export function DeletePackageButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deletePackage} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" confirm={t('common.confirmDelete')}>
        {t('common.delete')}
      </SubmitButton>
    </ActionForm>
  );
}

export function PublishButton() {
  const { t } = useI18n();
  return (
    <ActionForm action={publishWebsite} className="flex flex-col items-end">
      <SubmitButton variant="accent">{t('inventory.publish')}</SubmitButton>
    </ActionForm>
  );
}

export function ImportButton() {
  const { t } = useI18n();
  return (
    <ActionForm action={importFromWebsite} className="flex flex-col items-start">
      <SubmitButton variant="secondary">{t('inventory.import')}</SubmitButton>
    </ActionForm>
  );
}
