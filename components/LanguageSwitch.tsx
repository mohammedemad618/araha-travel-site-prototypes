'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/** "AR | EN" toggle that keeps the visitor on the same page in the other language. */
export function LanguageSwitch({ large = false }: { large?: boolean }) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <div dir="ltr" className={`flex items-center gap-2 font-latin tracking-[0.1em] ${large ? 'text-[13px]' : 'text-xs'}`}>
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-2">
          {i > 0 && <span className="h-3 w-px bg-ivory/30" aria-hidden="true" />}
          {l === locale ? (
            <span className="font-bold text-ivory">{l.toUpperCase()}</span>
          ) : (
            <Link
              href={pathname}
              locale={l}
              hrefLang={l}
              aria-label={t('switchLabel')}
              className="text-ivory/60 transition-colors hover:text-gold"
            >
              {l.toUpperCase()}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
