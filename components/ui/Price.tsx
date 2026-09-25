import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/format';

export function Price({
  value,
  className = '',
  unitClassName = 'text-[0.55em] text-gold',
}: {
  value: number;
  className?: string;
  unitClassName?: string;
}) {
  const t = useTranslations('common');
  return (
    <span className={`font-display font-medium ${className}`}>
      <span dir="ltr">{formatPrice(value)}</span> <span className={unitClassName}>{t('currency')}</span>
    </span>
  );
}
