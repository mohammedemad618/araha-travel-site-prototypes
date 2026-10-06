import 'server-only';
import { getDb } from './db';
import type { Tenant } from './types';

export async function tenantByKey(key: string | null | undefined): Promise<Tenant | null> {
  if (!key || !/^pk_[\w-]{10,60}$/.test(key)) return null;
  const db = await getDb();
  const tenant = await db.collection<Tenant>('tenants').findOne({ 'website.apiKey': key });
  return tenant && tenant.status === 'active' ? tenant : null;
}

/** CORS headers for a browser request from one of the company's own sites. */
export function corsHeaders(origin: string | null, tenant: Tenant | null): Record<string, string> {
  const base: Record<string, string> = { Vary: 'Origin' };
  if (origin && tenant?.website.allowedOrigins.includes(origin)) {
    base['Access-Control-Allow-Origin'] = origin;
    base['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    base['Access-Control-Allow-Headers'] = 'Content-Type, X-Api-Key';
    base['Access-Control-Max-Age'] = '86400';
  }
  return base;
}

export function clientIp(headers: Headers): string {
  return (headers.get('x-nf-client-connection-ip') || headers.get('x-forwarded-for') || 'unknown')
    .split(',')[0]!
    .trim();
}
