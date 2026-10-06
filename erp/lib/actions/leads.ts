'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDb } from '../db';
import { actionTenant, toObjectId } from '../session';
import { audit, logActivity } from '../audit';
import { fieldErrors, optDate, optEmail, optText, text, toUpdate, type ActionResult } from '../forms';
import { isValidPhone, normalizePhone } from '../phone';
import { parseMoney } from '../money';
import { newBookingNumber } from '../bookings';
import {
  leadSources,
  leadStages,
  type Booking,
  type Customer,
  type Lead,
  type TravelPackage,
} from '../types';

const leadSchema = z.object({
  name: text(120),
  phone: z
    .string()
    .trim()
    .refine((v) => isValidPhone(v), 'invalidPhone')
    .transform(normalizePhone),
  email: optEmail,
  source: z.enum(leadSources),
  destination: optText(120),
  packageSlug: optText(120),
  departure: optText(60),
  travellers: optText(120),
  budget: optText(120),
  when: optText(120),
  message: optText(3000),
  value: z.string().optional(),
  assignedTo: z.string().optional(),
  nextFollowUp: optDate,
});

async function packageTitle(tenantId: ObjectId, slug?: string) {
  if (!slug) return undefined;
  const db = await getDb();
  const pkg = await db.collection<TravelPackage>('packages').findOne({ tenantId, slug });
  return pkg?.title;
}

function leadFields(data: z.infer<typeof leadSchema>, currency: 'IQD' | 'USD') {
  const value = data.value ? parseMoney(data.value, currency) : null;
  return {
    name: data.name,
    phone: data.phone,
    email: data.email,
    source: data.source,
    message: data.message,
    value: value ?? undefined,
    assignedTo: toObjectId(data.assignedTo) ?? undefined,
    nextFollowUp: data.nextFollowUp,
  };
}

export async function createLead(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('leads.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = leadSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const now = new Date();
  const db = await getDb();
  const res = await db.collection<Omit<Lead, '_id'>>('leads').insertOne({
    tenantId: ctx.tenantId,
    ...leadFields(d, ctx.tenant.settings.currency),
    stage: 'new',
    interest: {
      destination: d.destination,
      packageSlug: d.packageSlug,
      packageTitle: await packageTitle(ctx.tenantId, d.packageSlug),
      departure: d.departure,
      travellers: d.travellers,
      budget: d.budget,
      when: d.when,
    },
    createdAt: now,
    updatedAt: now,
  });
  await logActivity(ctx.tenantId, { type: 'lead', id: res.insertedId }, 'system', 'created', ctx.user._id);
  revalidatePath('/leads');
  redirect(`/leads/${res.insertedId}`);
}

export async function updateLead(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('leads.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const parsed = leadSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const db = await getDb();
  const res = await db.collection('leads').updateOne(
    { _id: id, tenantId: ctx.tenantId },
    toUpdate({
      ...leadFields(d, ctx.tenant.settings.currency),
      interest: {
        destination: d.destination,
        packageSlug: d.packageSlug,
        packageTitle: await packageTitle(ctx.tenantId, d.packageSlug),
        departure: d.departure,
        travellers: d.travellers,
        budget: d.budget,
        when: d.when,
      },
      updatedAt: new Date(),
    }),
  );
  if (!res.matchedCount) return { ok: false, error: 'notFound' };
  revalidatePath(`/leads/${id}`);
  revalidatePath('/leads');
  return { ok: true };
}

export async function setLeadStage(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('leads.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  const stage = z.enum(leadStages).safeParse(fd.get('stage'));
  if (!id || !stage.success) return { ok: false, error: 'notFound' };
  const lostReason =
    String(fd.get('lostReason') ?? '')
      .trim()
      .slice(0, 300) || undefined;
  const db = await getDb();
  const res = await db.collection('leads').updateOne(
    { _id: id, tenantId: ctx.tenantId },
    toUpdate({
      stage: stage.data,
      lostReason: stage.data === 'lost' ? lostReason : undefined,
      updatedAt: new Date(),
    }),
  );
  if (!res.matchedCount) return { ok: false, error: 'notFound' };
  await logActivity(ctx.tenantId, { type: 'lead', id }, 'system', `stage:${stage.data}`, ctx.user._id);
  revalidatePath('/leads');
  revalidatePath(`/leads/${id}`);
  return { ok: true };
}

/** Creates (or reuses by phone) a customer and a draft booking from a lead. */
export async function convertLead(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const lead = await db.collection<Lead>('leads').findOne({ _id: id, tenantId: ctx.tenantId });
  if (!lead) return { ok: false, error: 'notFound' };
  if (lead.bookingId) redirect(`/bookings/${lead.bookingId}`);

  const now = new Date();
  let customer = await db
    .collection<Customer>('customers')
    .findOne({ tenantId: ctx.tenantId, phone: lead.phone });
  if (!customer) {
    const doc: Omit<Customer, '_id'> = {
      tenantId: ctx.tenantId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      tags: [],
      source: lead.source,
      travellers: [{ _id: new ObjectId(), name: lead.name }],
      createdAt: now,
      updatedAt: now,
    };
    const res = await db.collection<Omit<Customer, '_id'>>('customers').insertOne(doc);
    customer = { ...doc, _id: res.insertedId };
    await logActivity(
      ctx.tenantId,
      { type: 'customer', id: customer._id },
      'system',
      'created',
      ctx.user._id,
    );
  }

  const pkg = lead.interest.packageSlug
    ? await db
        .collection<TravelPackage>('packages')
        .findOne({ tenantId: ctx.tenantId, slug: lead.interest.packageSlug })
    : null;
  const title = [lead.interest.packageTitle || lead.interest.destination, customer.name]
    .filter(Boolean)
    .join(' — ');
  const booking: Omit<Booking, '_id'> = {
    tenantId: ctx.tenantId,
    number: await newBookingNumber(ctx.tenant),
    customerId: customer._id,
    leadId: lead._id,
    type: pkg ? 'package' : 'custom',
    title: title || customer.name,
    packageId: pkg?._id,
    adults: 1,
    children: 0,
    travellerIds: [],
    status: 'draft',
    currency: pkg?.currency ?? ctx.tenant.settings.currency,
    items: [],
    discount: 0,
    total: 0,
    costs: [],
    costTotal: 0,
    paid: 0,
    assignedTo: lead.assignedTo ?? ctx.user._id,
    notes: lead.message,
    createdBy: ctx.user._id,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection<Omit<Booking, '_id'>>('bookings').insertOne(booking);
  await db
    .collection('leads')
    .updateOne(
      { _id: lead._id },
      { $set: { customerId: customer._id, bookingId: res.insertedId, stage: 'won', updatedAt: now } },
    );
  await logActivity(
    ctx.tenantId,
    { type: 'lead', id: lead._id },
    'system',
    `converted:${booking.number}`,
    ctx.user._id,
  );
  await logActivity(ctx.tenantId, { type: 'booking', id: res.insertedId }, 'system', 'created', ctx.user._id);
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'lead.convert',
    entity: 'booking',
    entityId: res.insertedId,
    summary: booking.number,
  });
  revalidatePath('/leads');
  redirect(`/bookings/${res.insertedId}`);
}

export async function deleteLead(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('leads.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const lead = await db.collection<Lead>('leads').findOneAndDelete({ _id: id, tenantId: ctx.tenantId });
  if (!lead) return { ok: false, error: 'notFound' };
  await db
    .collection('activities')
    .deleteMany({ tenantId: ctx.tenantId, 'entity.type': 'lead', 'entity.id': id });
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'lead.delete',
    summary: `${lead.name} ${lead.phone}`,
  });
  revalidatePath('/leads');
  redirect('/leads');
}
