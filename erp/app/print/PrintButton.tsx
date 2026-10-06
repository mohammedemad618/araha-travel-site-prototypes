'use client';

import { Printer } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { buttonClass } from '@/components/ui';

export function PrintButton() {
  const { t } = useI18n();
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass('primary')}>
      <Printer size={16} aria-hidden="true" /> {t('common.print')}
    </button>
  );
}
