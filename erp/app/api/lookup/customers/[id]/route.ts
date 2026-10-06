import { NextResponse } from 'next/server';
import { repo } from '@/lib/repo';
import { actionTenant, toObjectId } from '@/lib/session';
import { can } from '@/lib/rbac';

/** A customer's travellers and open bookings, for dependent pickers. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await actionTenant();
  const ctx = auth.ok ? auth.ctx : null;
  if (!ctx?.tenant || !can(ctx.role, 'customers.read')) return NextResponse.json(null, { status: 401 });
  const id = toObjectId((await params).id);
  if (!id) return NextResponse.json(null, { status: 404 });
  const r = await repo(ctx);
  const c = await r.customers.findOne({ _id: id });
  if (!c) return NextResponse.json(null, { status: 404 });
  const bookings = can(ctx.role, 'bookings.read')
    ? await r.bookings
        .find({ customerId: id, status: { $ne: 'cancelled' } }, { projection: { number: 1, title: 1 } })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray()
    : [];
  return NextResponse.json({
    travellers: c.travellers.map((t) => ({ id: String(t._id), name: t.name })),
    bookings: bookings.map((b) => ({ id: String(b._id), label: `${b.number} — ${b.title}` })),
  });
}
