import { NextResponse } from 'next/server';
import { repo } from '@/lib/repo';
import { actionTenant } from '@/lib/session';
import { can } from '@/lib/rbac';
import { nameOrPhone } from '@/lib/queries';

/** Type-ahead search for the customer picker (same company only). */
export async function GET(req: Request) {
  const auth = await actionTenant();
  const ctx = auth.ok ? auth.ctx : null;
  if (!ctx?.tenant || !can(ctx.role, 'customers.read')) return NextResponse.json([], { status: 401 });
  const q = new URL(req.url).searchParams.get('q') ?? '';
  const r = await repo(ctx);
  const rows = await r.customers
    .find({ ...nameOrPhone(q) }, { projection: { name: 1, phone: 1 } })
    .sort({ updatedAt: -1 })
    .limit(12)
    .toArray();
  return NextResponse.json(rows.map((c) => ({ id: String(c._id), name: c.name, phone: c.phone })));
}
