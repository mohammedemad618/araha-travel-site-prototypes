import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCtx, toObjectId } from '@/lib/session';
import { can } from '@/lib/rbac';
import type { Booking, Customer } from '@/lib/types';

/** A customer's travellers and open bookings, for dependent pickers. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCtx();
  if (!ctx?.tenant || !can(ctx.role, 'customers.read')) return NextResponse.json(null, { status: 401 });
  const id = toObjectId((await params).id);
  if (!id) return NextResponse.json(null, { status: 404 });
  const db = await getDb();
  const c = await db.collection<Customer>('customers').findOne({ _id: id, tenantId: ctx.tenant._id });
  if (!c) return NextResponse.json(null, { status: 404 });
  const bookings = can(ctx.role, 'bookings.read')
    ? await db
        .collection<Booking>('bookings')
        .find(
          { tenantId: ctx.tenant._id, customerId: id, status: { $ne: 'cancelled' } },
          { projection: { number: 1, title: 1 } },
        )
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray()
    : [];
  return NextResponse.json({
    travellers: c.travellers.map((t) => ({ id: String(t._id), name: t.name })),
    bookings: bookings.map((b) => ({ id: String(b._id), label: `${b.number} — ${b.title}` })),
  });
}
