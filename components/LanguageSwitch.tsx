'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/**
 * "AR | EN" toggle that keeps the visitor on the same page in the other
 * language, including any filters (query string) and anchor.
 */
export function LanguageSwitch({ large = false }: { large?: boolean }) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const pathname = usePathname();
  const path = pathname === '/' ? '/' : `${pathname.replace(/\/+$/, '')}/`;

  return (
    <div
      dir="ltr"
      className={`flex items-center gap-2 font-latin tracking-[0.1em] ${large ? 'text-[13px]' : 'text-xs'}`}
    >
      {routing.locales.map((l, i) => {
        const href = `/${l}${path}`;
        return (
          <span key={l} className="flex items-center gap-2">
            {i > 0 && <span className="h-3 w-px bg-ivory/30" aria-hidden="true" />}
            {l === locale ? (
              <span className="font-semibold text-ivory" aria-current="true">
                {l.toUpperCase()}
              </span>
            ) : (
              <a
                href={href}
                hrefLang={l}
                lang={l}
                aria-label={`${l.toUpperCase()} — ${t('switchLabel')}`}
                onClick={(e) => {
                  // Carry the current filters and anchor over to the other language.
                  const extra = window.location.search + window.location.hash;
                  if (!extra) return;
                  e.preventDefault();
                  window.location.assign(href + extra);
                }}
                className="inline-flex min-h-8 items-center text-ivory/70 transition-colors hover:text-gold"
              >
                {l.toUpperCase()}
              </a>
            )}
          </span>
        );
      })}
    </div>
  );
}
