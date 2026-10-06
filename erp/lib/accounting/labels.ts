import type { TFn } from '../i18n/translate';
import type { Account } from '../types';

/** System accounts are named in the reader's language; others by their own name. */
export function accountLabel(a: Pick<Account, 'key' | 'name'>, t: TFn): string {
  return a.key ? t(`accounting.keys.${a.key}`) : a.name;
}
