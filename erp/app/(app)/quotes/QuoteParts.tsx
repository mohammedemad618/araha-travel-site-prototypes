'use client';

import { ActionForm, SubmitButton } from '@/components/form';
import { acceptQuote, deleteQuote, setQuoteStatus } from '@/lib/actions/quotes';
import { useI18n } from '@/lib/i18n/client';

export function QuoteStatusButton({
  id,
  status,
  label,
  variant = 'secondary',
}: {
  id: string;
  status: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const { t } = useI18n();
  return (
    <ActionForm action={setQuoteStatus} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant} confirm={status === 'rejected' ? t('quotes.rejectConfirm') : undefined}>
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

export function AcceptQuoteButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={acceptQuote} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="primary" confirm={t('quotes.acceptConfirm')}>
        {t('quotes.accept')}
      </SubmitButton>
    </ActionForm>
  );
}

export function DeleteQuoteButton({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deleteQuote} successMessage={false} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" confirm={t('common.confirmDelete')}>
        {t('common.delete')}
      </SubmitButton>
    </ActionForm>
  );
}
