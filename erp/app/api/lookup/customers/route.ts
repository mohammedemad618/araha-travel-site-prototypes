import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCtx } from '@/lib/session';
import { can } from '@/lib/rbac';
import { nameOrPhone } from '@/lib/queries';
import type { Customer } from '@/lib/types';

/** Type-ahead search for the customer picker (same company only). */
export async function GET(req: Request) {
  const ctx = await getCtx();
  if (!ctx?.tenant || !can(ctx.role, 'customers.read')) return NextResponse.json([], { status: 401 });
  const q = new URL(req.url).searchParams.get('q') ?? '';
  const db = await getDb();
  const rows = await db
    .collection<Customer>('customers')
    .find({ tenantId: ctx.tenant._id, ...nameOrPhone(q) }, { projection: { name: 1, phone: 1 } })
    .sort({ updatedAt: -1 })
    .limit(12)
    .toArray();
  return NextResponse.json(rows.map((c) => ({ id: String(c._id), name: c.name, phone: c.phone })));
}
