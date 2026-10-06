import type { AccountKey, AccountType } from '../types';

/** The chart every company starts with. Codes follow the usual 1–6 grouping. */
export const DEFAULT_ACCOUNTS: {
  code: string;
  name: string;
  type: AccountType;
  key?: AccountKey;
  isCash?: boolean;
}[] = [
  { code: '1100', name: 'الصندوق', type: 'asset', key: 'cash', isCash: true },
  { code: '1110', name: 'البنك', type: 'asset', key: 'bank', isCash: true },
  { code: '1120', name: 'المحافظ الإلكترونية', type: 'asset', key: 'wallet', isCash: true },
  { code: '1200', name: 'ذمم العملاء', type: 'asset', key: 'receivable' },
  { code: '2100', name: 'ذمم الموردين', type: 'liability', key: 'payable' },
  { code: '3100', name: 'رأس المال', type: 'equity', key: 'capital' },
  { code: '3200', name: 'الأرباح المحتجزة', type: 'equity', key: 'retained' },
  { code: '4100', name: 'إيرادات الرحلات', type: 'revenue', key: 'sales' },
  { code: '5100', name: 'تكلفة الرحلات', type: 'expense', key: 'cogs' },
  { code: '6100', name: 'الرواتب والأجور', type: 'expense' },
  { code: '6200', name: 'الإيجار', type: 'expense' },
  { code: '6300', name: 'الكهرباء والإنترنت والاتصالات', type: 'expense' },
  { code: '6400', name: 'التسويق والإعلانات', type: 'expense' },
  { code: '6900', name: 'مصاريف عامة أخرى', type: 'expense', key: 'expenses' },
];

/** Where money received or paid by each method sits. */
export const METHOD_ACCOUNT: Record<string, AccountKey> = {
  cash: 'cash',
  bank_transfer: 'bank',
  card: 'bank',
  zaincash: 'wallet',
  fastpay: 'wallet',
  other: 'cash',
};
