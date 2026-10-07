'use server';

import { revalidatePath } from 'next/cache';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { getDb } from '../db';
import { actionTenant, toObjectId } from '../session';
import { repo } from '../repo';
import { audit } from '../audit';
import { fieldErrors, type ActionResult } from '../forms';
import { sniffType } from '../files';
import { IMAGE_TYPES, MAX_IMAGE, mediaBucket, type MediaFile } from '../media';
import { contentChanged, triggerBuild } from '../website-publish';
import { MEDIA_PREFIX, contentKey, contentSchemas, imageSources } from '../site-content';
import { siteContentKinds, type SiteContentKind } from '../types';

const PERM = 'website.write' as const;

function done(kind?: SiteContentKind, key?: string, published?: boolean): ActionResult {
  revalidatePath('/website');
  if (kind && key) revalidatePath(`/website/${kind}/${key}`);
  return { ok: true, message: published ? 'website.savedPublishing' : 'website.saved' };
}

/** Saves one page of website content (the editor sends it as JSON in "data"). */
export async function saveContent(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant(PERM);
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const kind = z.enum(siteContentKinds).safeParse(fd.get('kind'));
  const key = contentKey.safeParse(String(fd.get('key') ?? '').trim());
  if (!kind.success) return { ok: false, error: 'notFound' };
  if (!key.success) return { ok: false, error: 'invalidKey', fields: { key: 'invalidKey' } };
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get('data') ?? ''));
  } catch {
    return { ok: false, error: 'generic' };
  }
  const parsed = contentSchemas[kind.data].safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'checkFields', fields: fieldErrors(parsed.error) };
  const data = parsed.data as Record<string, unknown>;

  const r = await repo(ctx);
  if (kind.data === 'package' && !(await r.packages.exists({ slug: key.data })))
    return { ok: false, error: 'noInventoryPackage' };
  // Images from the media library must belong to this company.
  const ids = imageSources(data)
    .filter((s) => s.startsWith(MEDIA_PREFIX))
    .map((s) => toObjectId(s.slice(MEDIA_PREFIX.length)));
  if (ids.length) {
    const db = await getDb();
    const owned = await db
      .collection<MediaFile>('media.files')
      .countDocuments({ _id: { $in: ids.filter((x) => x !== null) }, 'metadata.tenantId': ctx.tenantId });
    if (owned !== new Set(ids.map(String)).size) return { ok: false, error: 'imageSrc' };
  }

  const isNew = fd.get('isNew') === '1';
  const existing = await r.siteContent.findOne({ kind: kind.data, key: key.data });
  if (isNew && existing) return { ok: false, error: 'duplicateKey', fields: { key: 'duplicateKey' } };
  if (existing) {
    await r.siteContent.updateOne(
      { _id: existing._id },
      { $set: { data, updatedAt: new Date(), updatedBy: ctx.user._id } },
    );
  } else {
    await r.siteContent.insertOne({
      kind: kind.data,
      key: key.data,
      data,
      updatedAt: new Date(),
      updatedBy: ctx.user._id,
    });
  }
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'website.content',
    summary: `${kind.data}:${key.data}`,
  });
  const published = await contentChanged(ctx.tenantId);
  const result = done(kind.data, key.data, published);
  return isNew && result.ok ? { ...result, redirect: `/website/${kind.data}/${key.data}` } : result;
}

export async function uploadMedia(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant(PERM);
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: 'required', fields: { file: 'required' } };
  if (file.size > MAX_IMAGE) return { ok: false, error: 'fileTooLarge', fields: { file: 'fileTooLarge' } };
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = sniffType(buf);
  if (!contentType || !IMAGE_TYPES.includes(contentType))
    return { ok: false, error: 'imageType', fields: { file: 'imageType' } };
  const name = file.name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'image';
  const upload = (await mediaBucket()).openUploadStream(name, {
    metadata: { tenantId: ctx.tenantId, contentType, uploadedBy: ctx.user._id },
  });
  await new Promise<void>((resolve, reject) => {
    Readable.from(buf).pipe(upload).on('finish', resolve).on('error', reject);
  });
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'media.upload', summary: name });
  revalidatePath('/website');
  return { ok: true, message: 'website.uploaded', data: { src: `${MEDIA_PREFIX}${upload.id}` } };
}

/** Deletes an image that no page uses any more. */
export async function deleteMedia(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant(PERM);
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const file = await db
    .collection<MediaFile>('media.files')
    .findOne({ _id: id, 'metadata.tenantId': ctx.tenantId });
  if (!file) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  const pages = await r.siteContent.find({}, { projection: { data: 1 } }).toArray();
  if (pages.some((p) => imageSources(p.data).includes(`${MEDIA_PREFIX}${id}`)))
    return { ok: false, error: 'imageInUse' };
  await (await mediaBucket()).delete(id);
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'media.delete',
    summary: file.filename,
  });
  revalidatePath('/website');
  return { ok: true };
}

/** Starts a website build now, whatever the automatic schedule. */
export async function publishNow(): Promise<ActionResult> {
  const auth = await actionTenant(PERM);
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const result = await triggerBuild(ctx.tenant);
  if (result === 'noHook') return { ok: false, error: 'noHook' };
  if (result === 'failed') return { ok: false, error: 'generic' };
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'website.publish', summary: 'manual' });
  revalidatePath('/website');
  return { ok: true, message: 'inventory.published' };
}

/** Only public https hosts: the server must not be pointed at internal addresses. */
function safeSiteUrl(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    if (
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(u.hostname) ||
      /^\d+(\.\d+){3}$/.test(u.hostname)
    )
      return null;
    return u;
  } catch {
    return null;
  }
}

// Fields the website keeps in its files but the back office holds elsewhere
// (inventory) or as the document key.
const NOT_CONTENT = new Set(['slug', 'destination', 'days', 'nights', 'price', 'childPrice', 'departures']);

/**
 * Copies the website's current pages (/erp-content.json) into the back office,
 * so editing starts from what visitors see. Pages already here are kept.
 */
export async function importWebsiteContent(): Promise<ActionResult> {
  const auth = await actionTenant(PERM);
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const site = safeSiteUrl(ctx.tenant.website.siteUrl);
  if (!site) return { ok: false, error: 'noSite' };
  let body: Record<string, unknown>;
  try {
    const res = await fetch(new URL('/erp-content.json', site), {
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!res.ok) return { ok: false, error: 'importFailed' };
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: 'importFailed' };
  }
  const r = await repo(ctx);
  const list = (v: unknown) => (Array.isArray(v) ? (v.slice(0, 500) as Record<string, unknown>[]) : []);
  const items: { kind: SiteContentKind; key: unknown; data: Record<string, unknown> }[] = [
    ...list(body.packages).map((p) => {
      const data = Object.fromEntries(Object.entries(p).filter(([k]) => !NOT_CONTENT.has(k)));
      return { kind: 'package' as const, key: p.slug, data: { ...data, destination: p.destination } };
    }),
    ...list(body.visas).map((v) => {
      const { destination, ...data } = v;
      return { kind: 'visa' as const, key: destination, data };
    }),
    ...list(body.destinations).map((d) => {
      const { slug, ...data } = d;
      return { kind: 'destination' as const, key: slug, data };
    }),
  ];
  let added = 0;
  let skipped = 0;
  for (const item of items) {
    const key = contentKey.safeParse(item.key);
    const parsed = contentSchemas[item.kind].safeParse(item.data);
    if (!key.success || !parsed.success) {
      skipped++;
      continue;
    }
    if (await r.siteContent.exists({ kind: item.kind, key: key.data })) continue;
    await r.siteContent.insertOne({
      kind: item.kind,
      key: key.data,
      data: parsed.data as Record<string, unknown>,
      updatedAt: new Date(),
      updatedBy: ctx.user._id,
    });
    added++;
  }
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'website.import',
    summary: `${added} pages from ${site.host}`,
  });
  revalidatePath('/website');
  return { ok: true, message: 'website.imported', data: { added, skipped } };
}
