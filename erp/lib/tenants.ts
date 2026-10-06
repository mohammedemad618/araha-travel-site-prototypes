import 'server-only';
import { randomToken } from './crypto';
import type { TenantSettings, TenantWebsite } from './types';

export function defaultSettings(): TenantSettings {
  return {
    currency: 'IQD',
    usdRate: 1310,
    accent: '#c99755',
    bookingPrefix: 'BK',
    receiptPrefix: 'RC',
    quotePrefix: 'QT',
    invoicePrefix: 'INV',
  };
}

export function newApiKey(): string {
  return `pk_${randomToken(18)}`;
}

export function defaultWebsite(): TenantWebsite {
  return { apiKey: newApiKey(), allowedOrigins: [] };
}
