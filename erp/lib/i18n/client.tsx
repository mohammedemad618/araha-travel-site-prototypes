'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Dict } from './ar';
import { makeT, type Lang, type TFn } from './translate';

const I18nContext = createContext<{ lang: Lang; t: TFn } | null>(null);

export function I18nProvider({
  lang,
  dict,
  children,
}: {
  lang: Lang;
  dict: Dict;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ lang, t: makeT(dict) }), [lang, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
