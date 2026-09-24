import { useTranslations } from 'next-intl';

export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const t = useTranslations('meta');
  return (
    <span className="flex items-center gap-3">
      <span className="h-[9px] w-[9px] rotate-45 bg-gold" aria-hidden="true" />
      <span className="flex flex-col gap-0.5">
        <span className={`font-display leading-none font-medium ${size === 'lg' ? 'text-[34px]' : 'text-2xl'}`}>
          {t('brandWordmark')}
        </span>
        <span dir="ltr" className="font-latin text-[8.5px] tracking-[0.34em] text-gold">
          {t('brandSub')}
        </span>
      </span>
    </span>
  );
}
