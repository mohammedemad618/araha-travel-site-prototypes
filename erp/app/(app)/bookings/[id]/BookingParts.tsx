'use client';

import { ActionForm, SelectField, SubmitButton, TextField } from '@/components/form';
import { deleteBooking, setBookingStatus, setTravellers } from '@/lib/actions/bookings';
import { issueInvoice, voidInvoice } from '@/lib/actions/invoices';
import { recordPayment, voidPayment } from '@/lib/actions/payments';
import { useI18n } from '@/lib/i18n/client';
import { paymentMethods } from '@/lib/types';

export function StatusButton({
  id,
  status,
  label,
  variant = 'secondary',
}: {
  id: string;
  status: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'accent';
}) {
  const { t } = useI18n();
  return (
    <ActionForm action={setBookingStatus} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton
        variant={variant}
        confirm={status === 'cancelled' ? t('bookings.cancelConfirm') : undefined}
      >
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

export function DeleteBookingButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteBooking} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" confirm={t('common.confirmDelete')}>
        {t('common.delete')}
      </SubmitButton>
    </ActionForm>
  );
}

export function TravellersForm({
  bookingId,
  travellers,
  selected,
}: {
  bookingId: string;
  travellers: { id: string; name: string; passportNo?: string; warning?: string }[];
  selected: string[];
}) {
  const { t } = useI18n();
  return (
    <ActionForm action={setTravellers} successMessage={false} className="flex flex-col gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-[13px] text-muted">{t('bookings.pickTravellers')}</legend>
        {travellers.map((tr) => (
          <label
            key={tr.id}
            className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-[14px] has-checked:border-ink has-checked:bg-canvas"
          >
            <input
              type="checkbox"
              name="travellerIds"
              value={tr.id}
              defaultChecked={selected.includes(tr.id)}
              className="h-4 w-4 accent-ink"
            />
            <span className="flex-1">{tr.name}</span>
            {tr.passportNo && (
              <span className="font-latin text-[12.5px] text-muted" dir="ltr">
                {tr.passportNo}
              </span>
            )}
            {tr.warning && (
              <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11.5px] text-warning">
                {tr.warning}
              </span>
            )}
          </label>
        ))}
      </fieldset>
      <div>
        <SubmitButton size="sm" variant="secondary">
          {t('common.save')}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PaymentForm({
  bookingId,
  currency,
  today,
  balance,
}: {
  bookingId: string;
  currency: string;
  today: string;
  balance: string;
}) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={recordPayment}
      resetOnSuccess
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <SelectField
        label={t('payments.kind')}
        name="kind"
        defaultValue="payment"
        options={[
          { value: 'payment', label: t('payments.kinds.payment') },
          { value: 'refund', label: t('payments.kinds.refund') },
        ]}
      />
      <SelectField
        label={t('payments.method')}
        name="method"
        defaultValue="cash"
        options={paymentMethods.map((m) => ({ value: m, label: t(`payments.methods.${m}`) }))}
      />
      <TextField
        label={t('common.amount')}
        name="amount"
        required
        inputMode="decimal"
        dir="ltr"
        placeholder={balance}
      />
      <SelectField
        label={t('common.currency')}
        name="currency"
        defaultValue={currency}
        options={[
          { value: 'IQD', label: 'IQD' },
          { value: 'USD', label: 'USD' },
        ]}
      />
      <TextField label={t('common.date')} name="date" type="date" required defaultValue={today} />
      <TextField label={t('payments.reference')} name="reference" dir="ltr" />
      <TextField label={t('common.notes')} name="notes" fieldClassName="sm:col-span-2" />
      <div className="sm:col-span-2">
        <SubmitButton>{t('payments.record')}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function VoidPaymentButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={voidPayment} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="ghost" confirm={t('payments.voidConfirm')}>
        {t('payments.void')}
      </SubmitButton>
    </ActionForm>
  );
}

export function IssueInvoiceForm({ bookingId, today }: { bookingId: string; today: string }) {
  const { t } = useI18n();
  return (
    <ActionForm
      action={issueInvoice}
      successMessage={false}
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <TextField label={t('invoices.date')} name="date" type="date" defaultValue={today} />
      <TextField label={t('invoices.dueDate')} name="dueDate" type="date" />
      <SubmitButton>{t('invoices.issue')}</SubmitButton>
    </ActionForm>
  );
}

export function VoidInvoiceForm({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={voidInvoice} successMessage={false} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <TextField label={t('invoices.voidReason')} name="reason" fieldClassName="min-w-[200px] flex-1" />
      <SubmitButton variant="danger" size="md" confirm={t('invoices.voidConfirm')}>
        {t('invoices.void')}
      </SubmitButton>
    </ActionForm>
  );
}
