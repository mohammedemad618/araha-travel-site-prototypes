import { useTranslations } from 'next-intl';

export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const t = useTranslations('meta');
  return (
    <span className="flex items-center gap-3">
      <span className="h-[9px] w-[9px] rotate-45 bg-gold" aria-hidden="true" />
      <span className="flex flex-col gap-1">
        <span
          className={`font-display leading-none font-medium ${size === 'lg' ? 'text-[34px]' : 'text-2xl'}`}
        >
          {t('brandWordmark')}
        </span>
        <span
          lang="en"
          dir="ltr"
          className="text-start font-latin text-[9.5px] tracking-[0.3em] text-gold rtl:text-end"
        >
          {t('brandSub')}
        </span>
      </span>
    </span>
  );
}
