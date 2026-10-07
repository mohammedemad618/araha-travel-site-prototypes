import 'server-only';
import type { ObjectId } from 'mongodb';
import { getDb } from './db';
import type { Tenant } from './types';

// A save starts a website build at most this often; edits made in between wait
// for the next save or the "publish now" button, instead of queueing builds.
const AUTO_PUBLISH_GAP_MS = 90_000;

/** Calls the company's Netlify build hook. */
export async function triggerBuild(tenant: Tenant): Promise<'ok' | 'noHook' | 'failed'> {
  const hook = tenant.website.buildHookUrl;
  if (!hook) return 'noHook';
  try {
    const res = await fetch(hook, { method: 'POST', body: '{}', signal: AbortSignal.timeout(10000) });
    if (!res.ok) return 'failed';
  } catch {
    return 'failed';
  }
  const db = await getDb();
  await db
    .collection<Tenant>('tenants')
    .updateOne({ _id: tenant._id }, { $set: { 'website.lastPublishedAt': new Date() } });
  return 'ok';
}

/**
 * Records that website content changed and, unless a build started moments ago,
 * starts one. Returns whether a build was started.
 */
export async function contentChanged(tenantId: ObjectId): Promise<boolean> {
  const db = await getDb();
  const tenant = await db
    .collection<Tenant>('tenants')
    .findOneAndUpdate(
      { _id: tenantId },
      { $set: { 'website.contentUpdatedAt': new Date() } },
      { returnDocument: 'after' },
    );
  if (!tenant?.website.buildHookUrl) return false;
  const last = tenant.website.lastPublishedAt?.getTime() ?? 0;
  if (Date.now() - last < AUTO_PUBLISH_GAP_MS) return false;
  return (await triggerBuild(tenant)) === 'ok';
}

/** True when content was edited after the last build was started. */
export function hasUnpublished(tenant: Tenant): boolean {
  const changed = tenant.website.contentUpdatedAt?.getTime();
  if (!changed) return false;
  return changed > (tenant.website.lastPublishedAt?.getTime() ?? 0);
}
