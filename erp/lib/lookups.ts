import 'server-only';
import type { ObjectId } from 'mongodb';
import { tenantRepo } from './repo';

export async function packageOptions(tenantId: ObjectId) {
  const r = await tenantRepo(tenantId);
  const pkgs = await r.packages
    .find({}, { projection: { slug: 1, title: 1, active: 1 } })
    .sort({ title: 1 })
    .toArray();
  return pkgs.map((p) => ({ id: String(p._id), slug: p.slug, title: p.title, active: p.active }));
}
