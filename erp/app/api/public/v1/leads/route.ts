import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { logActivity } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { isValidPhone, normalizePhone } from '@/lib/phone';
import { clientIp, corsHeaders, tenantByKey } from '@/lib/public-api';
import type { Lead, TravelPackage } from '@/lib/types';

const FORMS = ['custom-trip', 'package-booking', 'contact', 'callback'];

/** Preflight for direct browser calls from an allowed website origin. */
export async function OPTIONS(req: Request) {
  const url = new URL(req.url);
  const tenant = await tenantByKey(url.searchParams.get('key') ?? req.headers.get('x-api-key'));
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin'), tenant) });
}

async function readBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get('content-type') ?? '';
  const out: Record<string, string> = {};
  if (type.includes('application/json')) {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [k, v] of Object.entries(json))
      if (typeof v === 'string' || typeof v === 'number') out[k] = String(v);
  } else {
    const fd = await req.formData().catch(() => null);
    fd?.forEach((v, k) => {
      if (typeof v === 'string') out[k] = v;
    });
  }
  for (const k of Object.keys(out)) out[k] = out[k]!.trim().slice(0, 3000);
  return out;
}

/**
 * Receives a lead from a company's website. Authenticated by the public site
 * key (which only allows creating leads), rate-limited, and honeypot-protected.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  const body = await readBody(req);
  const tenant = await tenantByKey(req.headers.get('x-api-key') ?? url.searchParams.get('key') ?? body.key);
  const headers = corsHeaders(origin, tenant);
  if (!tenant) return NextResponse.json({ ok: false, error: 'invalid_key' }, { status: 401, headers });
  // Browsers must come from one of the company's sites; server-to-server calls send no Origin.
  if (origin && !tenant.website.allowedOrigins.includes(origin))
    return NextResponse.json({ ok: false, error: 'origin_not_allowed' }, { status: 403, headers });

  const ip = clientIp(req.headers);
  const allowed =
    (await rateLimit(`lead-ip:${tenant._id}:${ip}`, 10, 600)) &&
    (await rateLimit(`lead-tenant:${tenant._id}`, 500, 3600));
  if (!allowed) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers });

  // Bots fill the hidden field; pretend success so they learn nothing.
  if (body['bot-field']) return NextResponse.json({ ok: true }, { status: 201, headers });

  const name = body.name ?? '';
  const phoneRaw = body.phone ?? '';
  if (!name || !phoneRaw || !isValidPhone(phoneRaw))
    return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 422, headers });
  const phone = normalizePhone(phoneRaw);
  const formType = FORMS.includes(body['form-name'] ?? '') ? body['form-name'] : undefined;

  const db = await getDb();
  // Package pages post their path, e.g. /ar/packages/enchanting-istanbul/.
  const slug = body.packageSlug || (body.page ?? '').match(/\/packages\/([a-z0-9-]+)\/?$/)?.[1];
  const pkg = slug
    ? await db.collection<TravelPackage>('packages').findOne({ tenantId: tenant._id, slug })
    : null;

  const message =
    [body.message, body.notes, body.time ? `⏰ ${body.time}` : ''].filter(Boolean).join('\n') || undefined;
  const interest = {
    destination: body.destination || undefined,
    packageSlug: pkg?.slug ?? slug ?? undefined,
    packageTitle: pkg?.title ?? (body.package || undefined),
    departure: body.departure || undefined,
    travellers: body.travellers || body.travelers || undefined,
    budget: body.budget || undefined,
    when: body.date || body.when || undefined,
  };

  // A repeat enquiry from the same number within a day joins the open lead.
  const now = new Date();
  const recent = await db.collection<Lead>('leads').findOne({
    tenantId: tenant._id,
    phone,
    stage: { $in: ['new', 'contacted', 'quoted'] },
    createdAt: { $gte: new Date(now.getTime() - 86400_000) },
  });
  if (recent) {
    await db.collection('leads').updateOne({ _id: recent._id }, { $set: { updatedAt: now } });
    await logActivity(
      tenant._id,
      { type: 'lead', id: recent._id },
      'note',
      [formType, interest.packageTitle, interest.departure, interest.travellers, message]
        .filter(Boolean)
        .join(' · '),
    );
    return NextResponse.json({ ok: true, id: String(recent._id) }, { status: 201, headers });
  }

  const doc: Omit<Lead, '_id'> = {
    tenantId: tenant._id,
    name: name.slice(0, 120),
    phone,
    email: body.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ? body.email.toLowerCase() : undefined,
    source: 'website',
    formType,
    stage: 'new',
    interest,
    message,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection<Omit<Lead, '_id'>>('leads').insertOne(doc);
  await logActivity(tenant._id, { type: 'lead', id: res.insertedId as ObjectId }, 'system', 'website');
  return NextResponse.json({ ok: true, id: String(res.insertedId) }, { status: 201, headers });
}
