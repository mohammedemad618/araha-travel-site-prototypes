'use client';

import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from '@/components/form';
import { useI18n } from '@/lib/i18n/client';
import { serviceStatuses, serviceTypes } from '@/lib/types';
import type { ActionResult } from '@/lib/forms';

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

export type LineValues = {
  id: string;
  type: string;
  description: string;
  details?: string;
  startDate?: string;
  endDate?: string;
  qty: number;
  unitPrice: string;
  status: string;
  confirmation?: string;
  supplierId?: string;
  cost?: string;
  costCurrency?: string;
};

export type PackagePrice = { id: string; title: string; price: string; childPrice?: string };

/** Add or edit one service (flight, hotel, visa…) of a booking or quote. */
export function ServiceForm({
  action,
  parent,
  line,
  suppliers,
  packages = [],
  currency,
  canCost,
  operational,
}: {
  action: Action;
  /** Hidden parent field, e.g. { name: 'bookingId', value: '…' }. */
  parent: { name: string; value: string };
  line?: LineValues;
  suppliers: { id: string; name: string }[];
  packages?: PackagePrice[];
  currency: string;
  canCost: boolean;
  /** Bookings track status and supplier references; quotes do not. */
  operational: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  // Picking a package fills in its name and adult price; staff can still change them.
  const fillFromPackage = (id: string) => {
    const p = packages.find((x) => x.id === id);
    const root = ref.current;
    if (!p || !root) return;
    const set = (name: string, v: string) => {
      const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
      if (el) el.value = v;
    };
    set('type', 'package');
    set('description', p.title);
    set('unitPrice', p.price);
  };
  return (
    <ActionForm action={action} resetOnSuccess={!line} successMessage={false}>
      <div ref={ref} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name={parent.name} value={parent.value} />
        {line && <input type="hidden" name="lineId" value={line.id} />}
        {!line && packages.length > 0 && (
          <SelectField
            label={t('services.fromPackage')}
            name="_package"
            placeholder={t('common.none')}
            options={packages.map((p) => ({ value: p.id, label: p.title }))}
            onChange={(e) => fillFromPackage(e.target.value)}
            fieldClassName="lg:col-span-4"
          />
        )}
        <SelectField
          label={t('services.type')}
          name="type"
          defaultValue={line?.type ?? 'flight'}
          options={serviceTypes.map((s) => ({ value: s, label: t(`services.types.${s}`) }))}
        />
        <TextField
          label={t('bookings.description')}
          name="description"
          required
          defaultValue={line?.description}
          fieldClassName="sm:col-span-1 lg:col-span-3"
        />
        <TextField
          label={t('services.startDate')}
          name="startDate"
          type="date"
          defaultValue={line?.startDate}
        />
        <TextField label={t('services.endDate')} name="endDate" type="date" defaultValue={line?.endDate} />
        <TextField
          label={t('bookings.qty')}
          name="qty"
          type="number"
          min={1}
          required
          defaultValue={line?.qty ?? 1}
        />
        <TextField
          label={`${t('bookings.unitPrice')} (${currency})`}
          name="unitPrice"
          required
          inputMode="decimal"
          dir="ltr"
          defaultValue={line?.unitPrice}
        />
        {canCost && (
          <>
            <SelectField
              label={t('bookings.supplier')}
              name="supplierId"
              defaultValue={line?.supplierId ?? ''}
              placeholder={t('common.none')}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              fieldClassName="lg:col-span-2"
            />
            <TextField
              label={t('services.cost')}
              name="cost"
              inputMode="decimal"
              dir="ltr"
              defaultValue={line?.cost}
              hint={t('services.costHint')}
            />
            <SelectField
              label={t('services.costCurrency')}
              name="costCurrency"
              defaultValue={line?.costCurrency ?? currency}
              options={[
                { value: 'IQD', label: 'IQD' },
                { value: 'USD', label: 'USD' },
              ]}
            />
          </>
        )}
        {operational && (
          <>
            <SelectField
              label={t('common.status')}
              name="status"
              defaultValue={line?.status ?? 'pending'}
              options={serviceStatuses.map((s) => ({ value: s, label: t(`services.statuses.${s}`) }))}
            />
            <TextField
              label={t('services.confirmation')}
              name="confirmation"
              dir="ltr"
              defaultValue={line?.confirmation}
            />
          </>
        )}
        <TextArea
          label={t('services.details')}
          name="details"
          rows={2}
          defaultValue={line?.details}
          placeholder={t('services.detailsHint')}
          fieldClassName={operational ? 'sm:col-span-2' : 'sm:col-span-2 lg:col-span-4'}
        />
        <div className={operational ? 'sm:col-span-2 lg:col-span-4' : 'sm:col-span-2 lg:col-span-4'}>
          <SubmitButton variant={line ? 'primary' : 'secondary'}>
            {line ? t('common.save') : t('services.add')}
          </SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}

export function DeleteLineButton({
  action,
  parent,
  lineId,
}: {
  action: Action;
  parent: { name: string; value: string };
  lineId: string;
}) {
  const { t } = useI18n();
  return (
    <ActionForm action={action} successMessage={false} className="inline">
      <input type="hidden" name={parent.name} value={parent.value} />
      <input type="hidden" name="lineId" value={lineId} />
      <SubmitButton size="sm" variant="ghost" confirm={t('common.confirmDelete')}>
        <Trash2 size={14} aria-hidden="true" />
        <span className="sr-only">{t('common.delete')}</span>
      </SubmitButton>
    </ActionForm>
  );
}

/** One-tap status change for a booking service. */
export function ServiceStatusSelect({
  action,
  bookingId,
  lineId,
  status,
  label,
}: {
  action: Action;
  bookingId: string;
  lineId: string;
  status: string;
  label: string;
}) {
  const { t } = useI18n();
  return (
    <ActionForm action={action} successMessage={false} className="inline">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="lineId" value={lineId} />
      <select
        name="status"
        aria-label={label}
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-md border border-line-2 bg-surface px-2 text-[12.5px]"
      >
        {serviceStatuses.map((s) => (
          <option key={s} value={s}>
            {t(`services.statuses.${s}`)}
          </option>
        ))}
      </select>
    </ActionForm>
  );
}

export function DiscountField({
  action,
  parent,
  value,
}: {
  action: Action;
  parent: { name: string; value: string };
  value: string;
}) {
  const { t } = useI18n();
  return (
    <ActionForm action={action} successMessage={false} className="flex items-end gap-2">
      <input type="hidden" name={parent.name} value={parent.value} />
      <TextField
        label={t('bookings.discount')}
        name="discount"
        inputMode="decimal"
        dir="ltr"
        defaultValue={value}
        fieldClassName="w-40"
      />
      <SubmitButton size="md" variant="secondary">
        {t('common.save')}
      </SubmitButton>
    </ActionForm>
  );
}
