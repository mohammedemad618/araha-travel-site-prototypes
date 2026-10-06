import 'server-only';
import type { ObjectId } from 'mongodb';
import { getDb } from './db';
import type { TravelPackage } from './types';

export async function packageOptions(tenantId: ObjectId) {
  const db = await getDb();
  const pkgs = await db
    .collection<TravelPackage>('packages')
    .find({ tenantId }, { projection: { slug: 1, title: 1, active: 1 } })
    .sort({ title: 1 })
    .toArray();
  return pkgs.map((p) => ({ id: String(p._id), slug: p.slug, title: p.title, active: p.active }));
}
