import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCtx } from '@/lib/session';
import { can, type Permission } from '@/lib/rbac';
import { getStaff } from '@/lib/queries';
import { fromMinor } from '@/lib/money';
import { isISODate } from '@/lib/dates';
import { audit } from '@/lib/audit';
import { makeT } from '@/lib/i18n/translate';
import { ar } from '@/lib/i18n/ar';
import { en } from '@/lib/i18n/en';
import type { Booking, Customer, Lead, Payment } from '@/lib/types';

const PERM: Record<string, Permission> = {
  leads: 'leads.read',
  customers: 'customers.read',
  bookings: 'bookings.read',
  payments: 'finance.read',
};

/** RFC 4180 CSV with a BOM so Excel opens Arabic text correctly. */
function csv(rows: (string | number | undefined | null)[][]): string {
  const esc = (v: string | number | undefined | null) => {
    let s = v === undefined || v === null ? '' : String(v);
    // Neutralise spreadsheet formulas in user-entered text.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

export async function GET(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const ctx = await getCtx();
  const { entity } = await params;
  const perm = PERM[entity];
  if (!ctx?.tenant || !perm || !can(ctx.role, perm) || !can(ctx.role, 'data.export'))
    return new NextResponse('Not found', { status: 404 });
  const tenantId = ctx.tenant._id;
  const lang = req.headers.get('cookie')?.includes('lang=en') ? 'en' : 'ar';
  const t = makeT(lang === 'en' ? en : ar);
  const db = await getDb();
  const staff = await getStaff(tenantId);
  const who = (id: unknown) => staff.find((s) => s.id === String(id))?.name ?? '';
  const LIMIT = 20000;
  let rows: (string | number | undefined | null)[][] = [];

  if (entity === 'leads') {
    const list = await db
      .collection<Lead>('leads')
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .toArray();
    rows = [
      [
        t('common.createdAt'),
        t('common.name'),
        t('common.phone'),
        t('common.email'),
        t('leads.source'),
        t('leads.stage'),
        t('leads.destination'),
        t('leads.package'),
        t('leads.travellers'),
        t('leads.budget'),
        t('leads.when'),
        t('common.assignedTo'),
        t('leads.message'),
      ],
      ...list.map((l) => [
        l.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        l.name,
        l.phone,
        l.email,
        t(`leads.sources.${l.source}`),
        t(`leads.stages.${l.stage}`),
        l.interest.destination,
        l.interest.packageTitle,
        l.interest.travellers,
        l.interest.budget,
        l.interest.when,
        who(l.assignedTo),
        l.message,
      ]),
    ];
  } else if (entity === 'customers') {
    const list = await db
      .collection<Customer>('customers')
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .toArray();
    rows = [
      [
        t('common.name'),
        t('common.phone'),
        t('customers.phone2'),
        t('common.email'),
        t('common.city'),
        t('customers.tags'),
        t('customers.travellers'),
        t('common.createdAt'),
      ],
      ...list.map((c) => [
        c.name,
        c.phone,
        c.phone2,
        c.email,
        c.city,
        c.tags.join('، '),
        c.travellers.length,
        c.createdAt.toISOString().slice(0, 10),
      ]),
    ];
  } else if (entity === 'bookings') {
    const list = await db
      .collection<Booking>('bookings')
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .toArray();
    const customers = await db
      .collection<Customer>('customers')
      .find({ tenantId }, { projection: { name: 1, phone: 1 } })
      .toArray();
    const cust = new Map(customers.map((c) => [String(c._id), c]));
    const finance = can(ctx.role, 'finance.read');
    rows = [
      [
        t('bookings.number'),
        t('bookings.titleField'),
        t('bookings.customer'),
        t('common.phone'),
        t('bookings.type'),
        t('common.status'),
        t('bookings.travelDate'),
        t('bookings.adults'),
        t('bookings.children'),
        t('common.currency'),
        t('bookings.total'),
        t('bookings.paid'),
        t('bookings.balance'),
        ...(finance ? [t('bookings.costTotal'), t('bookings.profit')] : []),
        t('common.assignedTo'),
      ],
      ...list.map((b) => [
        b.number,
        b.title,
        cust.get(String(b.customerId))?.name,
        cust.get(String(b.customerId))?.phone,
        t(`bookings.types.${b.type}`),
        t(`bookings.statuses.${b.status}`),
        b.travelDate,
        b.adults,
        b.children,
        b.currency,
        fromMinor(b.total, b.currency),
        fromMinor(b.paid, b.currency),
        fromMinor(b.total - b.paid, b.currency),
        ...(finance
          ? [fromMinor(b.costTotal, b.currency), fromMinor(b.total - b.costTotal, b.currency)]
          : []),
        who(b.assignedTo),
      ]),
    ];
  } else if (entity === 'payments') {
    const sp = new URL(req.url).searchParams;
    const filter: Record<string, unknown> = { tenantId };
    const from = sp.get('from');
    const to = sp.get('to');
    if ((from && isISODate(from)) || (to && isISODate(to)))
      filter.date = {
        ...(from && isISODate(from) ? { $gte: from } : {}),
        ...(to && isISODate(to) ? { $lte: to } : {}),
      };
    if (sp.get('method')) filter.method = sp.get('method');
    if (sp.get('kind')) filter.kind = sp.get('kind');
    const list = await db
      .collection<Payment>('payments')
      .find(filter)
      .sort({ date: -1 })
      .limit(LIMIT)
      .toArray();
    const bookings = await db
      .collection<Booking>('bookings')
      .find({ tenantId, _id: { $in: list.map((p) => p.bookingId) } }, { projection: { number: 1 } })
      .toArray();
    const customers = await db
      .collection<Customer>('customers')
      .find({ tenantId, _id: { $in: list.map((p) => p.customerId) } }, { projection: { name: 1 } })
      .toArray();
    rows = [
      [
        t('payments.number'),
        t('common.date'),
        t('bookings.customer'),
        t('payments.booking'),
        t('payments.kind'),
        t('payments.method'),
        t('common.currency'),
        t('common.amount'),
        t('payments.reference'),
        t('payments.voided'),
        t('common.by'),
      ],
      ...list.map((p) => [
        p.number,
        p.date,
        customers.find((c) => String(c._id) === String(p.customerId))?.name,
        bookings.find((b) => String(b._id) === String(p.bookingId))?.number,
        t(`payments.kinds.${p.kind}`),
        t(`payments.methods.${p.method}`),
        p.currency,
        (p.kind === 'refund' ? -1 : 1) * fromMinor(p.amount, p.currency),
        p.reference,
        p.voided ? t('common.yes') : '',
        who(p.receivedBy),
      ]),
    ];
  }

  await audit({
    tenantId,
    userId: ctx.user._id,
    action: 'export',
    entity,
    summary: `${rows.length - 1} rows`,
  });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entity}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
