'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { actionTenant, toObjectId } from '../session';
import { repo } from '../repo';
import { audit } from '../audit';
import { triggerBuild } from '../website-publish';
import { fieldErrors, intField, optText, reqDate, text, toUpdate, type ActionResult } from '../forms';
import { parseMoney } from '../money';
import { seatsBooked } from '../bookings';
import type { TravelPackage } from '../types';

const packageSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,80}$/, 'invalidSlug'),
  title: text(160),
  titleEn: optText(160),
  destination: text(80),
  days: intField(1, 120),
  nights: intField(0, 120),
  currency: z.enum(['IQD', 'USD']),
  price: z.string(),
  childPrice: z.string().optional(),
  active: z.string().optional(),
});

function parsePackage(fd: FormData) {
  const parsed = packageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: fieldErrors(parsed.error) } as const;
  const d = parsed.data;
  const price = parseMoney(d.price, d.currency);
  const childPrice = d.childPrice ? parseMoney(d.childPrice, d.currency) : undefined;
  if (price === null || price < 0) return { error: { price: 'invalidAmount' } } as const;
  if (childPrice === null || (childPrice !== undefined && childPrice < 0))
    return { error: { childPrice: 'invalidAmount' } } as const;
  return {
    data: {
      slug: d.slug,
      title: d.title,
      titleEn: d.titleEn,
      destination: d.destination,
      days: d.days,
      nights: d.nights,
      currency: d.currency,
      price,
      childPrice,
      active: d.active === 'on' || d.active === '1',
    },
  } as const;
}

export async function savePackage(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('inventory.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = parsePackage(fd);
  if ('error' in parsed) return { ok: false, error: 'required', fields: parsed.error };
  const r = await repo(ctx);
  const id = toObjectId(String(fd.get('id') ?? ''));
  const dup = await r.packages.exists({ slug: parsed.data.slug, ...(id ? { _id: { $ne: id } } : {}) });
  if (dup) return { ok: false, error: 'duplicateSlug', fields: { slug: 'duplicateSlug' } };
  const now = new Date();
  if (id) {
    const res = await r.packages.updateOne({ _id: id }, toUpdate({ ...parsed.data, updatedAt: now }));
    if (!res.matchedCount) return { ok: false, error: 'notFound' };
    revalidatePath(`/inventory/${id}`);
    revalidatePath('/inventory');
    return { ok: true };
  }
  const packageId = await r.packages.insertOne({ ...parsed.data, createdAt: now, updatedAt: now });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'package.create',
    entityId: packageId,
    summary: parsed.data.title,
  });
  revalidatePath('/inventory');
  redirect(`/inventory/${packageId}`);
}

export async function deletePackage(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('inventory.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  if (await r.all.bookings.exists({ packageId: id })) return { ok: false, error: 'hasRecords' };
  const pkg = await r.packages.findOneAndDelete({ _id: id });
  if (!pkg) return { ok: false, error: 'notFound' };
  await r.departures.deleteMany({ packageId: id });
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'package.delete', summary: pkg.title });
  revalidatePath('/inventory');
  redirect('/inventory');
}

const departureSchema = z.object({
  date: reqDate,
  capacity: intField(1, 1000),
  price: z.string().optional(),
  notes: optText(300),
  closed: z.string().optional(),
});

export async function saveDeparture(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('inventory.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const packageId = toObjectId(String(fd.get('packageId') ?? ''));
  if (!packageId) return { ok: false, error: 'notFound' };
  const parsed = departureSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const r = await repo(ctx);
  const pkg = await r.packages.findOne({ _id: packageId });
  if (!pkg) return { ok: false, error: 'notFound' };
  const price = parsed.data.price ? parseMoney(parsed.data.price, pkg.currency) : undefined;
  if (price === null) return { ok: false, error: 'invalidAmount', fields: { price: 'invalidAmount' } };
  const fields = {
    date: parsed.data.date,
    capacity: parsed.data.capacity,
    price,
    notes: parsed.data.notes,
    closed: parsed.data.closed === 'on' || parsed.data.closed === '1',
  };
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (id) {
    // Capacity cannot drop below the seats already sold.
    const booked = await seatsBooked(ctx.tenantId, id);
    if (fields.capacity < booked)
      return { ok: false, error: 'seatsExceeded', fields: { capacity: 'seatsExceeded' } };
    const res = await r.departures.updateOne({ _id: id, packageId }, toUpdate(fields));
    if (!res.matchedCount) return { ok: false, error: 'notFound' };
  } else {
    await r.departures.insertOne({ packageId, ...fields, createdAt: new Date() });
  }
  revalidatePath(`/inventory/${packageId}`);
  revalidatePath('/inventory');
  return { ok: true };
}

export async function deleteDeparture(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('inventory.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  if (await r.all.bookings.exists({ departureId: id })) return { ok: false, error: 'hasRecords' };
  const dep = await r.departures.findOneAndDelete({ _id: id });
  if (!dep) return { ok: false, error: 'notFound' };
  revalidatePath(`/inventory/${dep.packageId}`);
  return { ok: true };
}

/** Triggers the company's Netlify build hook so the website shows current dates and prices. */
export async function publishWebsite(): Promise<ActionResult> {
  const auth = await actionTenant('inventory.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const result = await triggerBuild(ctx.tenant);
  if (result === 'noHook') return { ok: false, error: 'noHook' };
  if (result === 'failed') return { ok: false, error: 'generic' };
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'website.publish',
    summary: 'build hook',
  });
  revalidatePath('/inventory');
  revalidatePath('/website');
  return { ok: true, message: 'inventory.published' };
}

type WebsitePackage = {
  slug: string;
  title: string;
  titleEn?: string;
  destination: string;
  days: number;
  nights: number;
  price: number;
  childPrice?: number;
  departures: { date: string; status: string }[];
};

/** Only public https hosts: the server must not be pointed at internal addresses. */
function safeSiteUrl(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    if (
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(u.hostname) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)
    )
      return null;
    return u;
  } catch {
    return null;
  }
}

/**
 * Loads the packages and dates published by the company's website
 * (/erp-packages.json). New packages and dates are added; existing ones are kept.
 */
export async function importFromWebsite(): Promise<ActionResult> {
  const auth = await actionTenant('inventory.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const site = safeSiteUrl(ctx.tenant.website.siteUrl);
  if (!site) return { ok: false, error: 'noSite' };
  let list: WebsitePackage[];
  try {
    const res = await fetch(new URL('/erp-packages.json', site), {
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!res.ok) return { ok: false, error: 'importFailed' };
    const data = (await res.json()) as { packages?: WebsitePackage[] };
    list = Array.isArray(data.packages) ? data.packages.slice(0, 500) : [];
  } catch {
    return { ok: false, error: 'importFailed' };
  }
  const r = await repo(ctx);
  const now = new Date();
  let added = 0;
  let dates = 0;
  for (const p of list) {
    if (typeof p.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{1,80}$/.test(p.slug) || !p.title) continue;
    let pkg = await r.packages.findOne({ slug: p.slug });
    if (!pkg) {
      const doc: Omit<TravelPackage, '_id' | 'tenantId'> = {
        slug: p.slug,
        title: String(p.title).slice(0, 160),
        titleEn: p.titleEn ? String(p.titleEn).slice(0, 160) : undefined,
        destination: String(p.destination ?? '').slice(0, 80) || '—',
        days: Math.max(1, Math.min(120, Math.round(Number(p.days) || 1))),
        nights: Math.max(0, Math.min(120, Math.round(Number(p.nights) || 0))),
        currency: 'IQD',
        price: Math.max(0, Math.round(Number(p.price) || 0)),
        childPrice: p.childPrice ? Math.max(0, Math.round(Number(p.childPrice))) : undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      pkg = { ...doc, tenantId: ctx.tenantId, _id: await r.packages.insertOne(doc) };
      added++;
    }
    for (const d of Array.isArray(p.departures) ? p.departures : []) {
      if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) continue;
      if (await r.departures.exists({ packageId: pkg._id, date: d.date })) continue;
      await r.departures.insertOne({
        packageId: pkg._id,
        date: d.date,
        capacity: 20,
        closed: d.status === 'soldout',
        createdAt: now,
      });
      dates++;
    }
  }
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'package.import',
    summary: `${added} packages, ${dates} dates from ${site.host}`,
  });
  revalidatePath('/inventory');
  return { ok: true, message: 'inventory.imported', data: { added, dates } };
}
