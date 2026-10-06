import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { ar } from './ar';
import { en } from './en';
import { makeT, type Lang } from './translate';

export const getLang = cache(async (): Promise<Lang> => {
  const jar = await cookies();
  return jar.get('lang')?.value === 'en' ? 'en' : 'ar';
});

export async function getI18n() {
  const lang = await getLang();
  const dict = lang === 'en' ? en : ar;
  return { lang, dict, t: makeT(dict), dir: lang === 'ar' ? ('rtl' as const) : ('ltr' as const) };
}
