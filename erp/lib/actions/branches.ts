'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { actionTenant, toObjectId } from '../session';
import { repo } from '../repo';
import { audit } from '../audit';
import { fieldErrors, optText, text, toUpdate, type ActionResult } from '../forms';

const branchSchema = z.object({
  name: text(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,8}$/, 'invalidSlug'),
  phone: optText(40),
  address: optText(300),
});

export async function saveBranch(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('settings.manage');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = branchSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const r = await repo(ctx);
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (await r.branches.exists({ code: parsed.data.code, ...(id ? { _id: { $ne: id } } : {}) }))
    return { ok: false, error: 'duplicateCode', fields: { code: 'duplicateCode' } };
  if (id) {
    const res = await r.branches.updateOne({ _id: id }, toUpdate(parsed.data));
    if (!res.matchedCount) return { ok: false, error: 'notFound' };
  } else {
    await r.branches.insertOne({ ...parsed.data, isMain: false, active: true, createdAt: new Date() });
  }
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: id ? 'branch.update' : 'branch.create',
    summary: `${parsed.data.name} (${parsed.data.code})`,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Closes or reopens a branch. Its records stay; closed branches cannot take new ones. */
export async function toggleBranch(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('settings.manage');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const r = await repo(ctx);
  const branch = await r.branches.findOne({ _id: id });
  if (!branch) return { ok: false, error: 'notFound' };
  if (branch.isMain) return { ok: false, error: 'mainBranch' };
  await r.branches.updateOne({ _id: id }, { $set: { active: !branch.active } });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: branch.active ? 'branch.close' : 'branch.open',
    summary: branch.name,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}
