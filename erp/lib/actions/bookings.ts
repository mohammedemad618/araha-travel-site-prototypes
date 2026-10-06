'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDb } from '../db';
import { actionTenant, toObjectId, type TenantCtx } from '../session';
import { audit, logActivity } from '../audit';
import { fieldErrors, intField, optDate, optText, text, toUpdate, type ActionResult } from '../forms';
import { convert, parseMoney } from '../money';
import { addDays } from '../dates';
import { can } from '../rbac';
import { newBookingNumber, packageItems, recalcBooking, seatsBooked } from '../bookings';
import { getI18n } from '../i18n/server';
import {
  bookingStatuses,
  bookingTypes,
  type Booking,
  type BookingStatus,
  type Customer,
  type Departure,
  type TravelPackage,
} from '../types';

const bookingSchema = z.object({
  customerId: z.string(),
  type: z.enum(bookingTypes),
  title: text(200),
  packageId: z.string().optional(),
  departureId: z.string().optional(),
  travelDate: optDate,
  returnDate: optDate,
  adults: intField(0, 500),
  children: intField(0, 500),
  currency: z.enum(['IQD', 'USD']),
  assignedTo: z.string().optional(),
  notes: optText(3000),
});

type Resolved = {
  pkg: TravelPackage | null;
  dep: Departure | null;
};

/** Loads the package/departure chosen in the form and checks seats. */
async function resolvePackage(
  ctx: TenantCtx,
  d: z.infer<typeof bookingSchema>,
  bookingId?: ObjectId,
): Promise<{ ok: true; value: Resolved } | { ok: false; result: ActionResult }> {
  const db = await getDb();
  const packageId = d.type === 'package' ? toObjectId(d.packageId) : null;
  const departureId = packageId ? toObjectId(d.departureId) : null;
  const pkg = packageId
    ? await db.collection<TravelPackage>('packages').findOne({ _id: packageId, tenantId: ctx.tenantId })
    : null;
  if (packageId && !pkg)
    return { ok: false, result: { ok: false, error: 'notFound', fields: { packageId: 'required' } } };
  const dep = departureId
    ? await db
        .collection<Departure>('departures')
        .findOne({ _id: departureId, tenantId: ctx.tenantId, packageId: packageId! })
    : null;
  if (departureId && !dep)
    return { ok: false, result: { ok: false, error: 'notFound', fields: { departureId: 'required' } } };
  if (dep) {
    const taken = await seatsBooked(ctx.tenantId, dep._id, bookingId);
    if (taken + d.adults + d.children > dep.capacity)
      return {
        ok: false,
        result: { ok: false, error: 'seatsExceeded', fields: { adults: 'seatsExceeded' } },
      };
  }
  return { ok: true, value: { pkg, dep } };
}

export async function createBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const parsed = bookingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const db = await getDb();
  const customerId = toObjectId(d.customerId);
  const customer = customerId
    ? await db.collection<Customer>('customers').findOne({ _id: customerId, tenantId: ctx.tenantId })
    : null;
  if (!customer) return { ok: false, error: 'required', fields: { customerId: 'required' } };
  const resolved = await resolvePackage(ctx, d);
  if (!resolved.ok) return resolved.result;
  const { pkg, dep } = resolved.value;
  const { t } = await getI18n();

  const now = new Date();
  const currency = pkg?.currency ?? d.currency;
  const items = pkg
    ? packageItems(pkg, dep, d.adults, d.children, {
        adult: t('bookings.adults'),
        child: t('bookings.children'),
      })
    : [];
  const travelDate = dep?.date ?? d.travelDate;
  const booking: Omit<Booking, '_id'> = {
    tenantId: ctx.tenantId,
    number: await newBookingNumber(ctx.tenant),
    customerId: customer._id,
    type: d.type,
    title: d.title,
    packageId: pkg?._id,
    departureId: dep?._id,
    travelDate,
    returnDate: d.returnDate ?? (dep && pkg ? addDays(dep.date, Math.max(pkg.nights, 0)) : undefined),
    adults: d.adults,
    children: d.children,
    travellerIds: [],
    status: 'draft',
    currency,
    items,
    discount: 0,
    total: 0,
    costs: [],
    costTotal: 0,
    paid: 0,
    assignedTo: toObjectId(d.assignedTo) ?? ctx.user._id,
    notes: d.notes,
    createdBy: ctx.user._id,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection<Omit<Booking, '_id'>>('bookings').insertOne(booking);
  await recalcBooking(ctx.tenantId, res.insertedId);
  await logActivity(ctx.tenantId, { type: 'booking', id: res.insertedId }, 'system', 'created', ctx.user._id);
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: 'booking.create',
    entity: 'booking',
    entityId: res.insertedId,
    summary: booking.number,
  });
  revalidatePath('/bookings');
  redirect(`/bookings/${res.insertedId}${items.length ? '?auto=1' : ''}`);
}

export async function updateBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  if (!id) return { ok: false, error: 'notFound' };
  const parsed = bookingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const db = await getDb();
  const existing = await db.collection<Booking>('bookings').findOne({ _id: id, tenantId: ctx.tenantId });
  if (!existing) return { ok: false, error: 'notFound' };
  const resolved = await resolvePackage(ctx, d, id);
  if (!resolved.ok) return resolved.result;
  const { pkg, dep } = resolved.value;
  // The currency is fixed once money has moved, so balances stay consistent.
  const currency =
    existing.paid !== 0 || existing.costs.length ? existing.currency : (pkg?.currency ?? d.currency);
  await db.collection('bookings').updateOne(
    { _id: id, tenantId: ctx.tenantId },
    toUpdate({
      type: d.type,
      title: d.title,
      packageId: pkg?._id,
      departureId: dep?._id,
      travelDate: dep?.date ?? d.travelDate,
      returnDate: d.returnDate,
      adults: d.adults,
      children: d.children,
      currency,
      assignedTo: toObjectId(d.assignedTo) ?? undefined,
      notes: d.notes,
      updatedAt: new Date(),
    }),
  );
  revalidatePath(`/bookings/${id}`);
  return { ok: true };
}

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'draft'],
  completed: ['confirmed'],
  cancelled: ['draft'],
};

export async function setBookingStatus(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const id = toObjectId(String(fd.get('id') ?? ''));
  const status = z.enum(bookingStatuses).safeParse(fd.get('status'));
  if (!id || !status.success) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const b = await db.collection<Booking>('bookings').findOne({ _id: id, tenantId: ctx.tenantId });
  if (!b) return { ok: false, error: 'notFound' };
  if (!TRANSITIONS[b.status].includes(status.data)) return { ok: false, error: 'forbidden' };
  // Reopening a cancelled booking needs its seats back.
  if (b.status === 'cancelled' && b.departureId) {
    const dep = await db
      .collection<Departure>('departures')
      .findOne({ _id: b.departureId, tenantId: ctx.tenantId });
    if (dep && (await seatsBooked(ctx.tenantId, dep._id, id)) + b.adults + b.children > dep.capacity)
      return { ok: false, error: 'seatsExceeded' };
  }
  await db
    .collection('bookings')
    .updateOne({ _id: id }, { $set: { status: status.data, updatedAt: new Date() } });
  await logActivity(ctx.tenantId, { type: 'booking', id }, 'system', `status:${status.data}`, ctx.user._id);
  await audit({
    tenantId: ctx.tenantId,
    userId: ctx.user._id,
    action: `booking.${status.data}`,
    entity: 'booking',
    entityId: id,
    summary: b.number,
  });
  revalidatePath(`/bookings/${id}`);
  revalidatePath('/bookings');
  return { ok: true, message: 'bookings.statusChanged' };
}

async function loadEditable(ctx: TenantCtx, fd: FormData) {
  const id = toObjectId(String(fd.get('bookingId') ?? fd.get('id') ?? ''));
  if (!id) return null;
  const db = await getDb();
  return db.collection<Booking>('bookings').findOne({ _id: id, tenantId: ctx.tenantId });
}

const itemSchema = z.object({ description: text(300), qty: intField(1, 10000), unitPrice: z.string() });

export async function saveItem(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const b = await loadEditable(ctx, fd);
  if (!b) return { ok: false, error: 'notFound' };
  const parsed = itemSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const unitPrice = parseMoney(parsed.data.unitPrice, b.currency);
  if (unitPrice === null || unitPrice < 0)
    return { ok: false, error: 'invalidAmount', fields: { unitPrice: 'invalidAmount' } };
  const db = await getDb();
  const itemId = toObjectId(String(fd.get('itemId') ?? ''));
  if (itemId) {
    await db.collection('bookings').updateOne(
      { _id: b._id, 'items._id': itemId },
      {
        $set: {
          'items.$.description': parsed.data.description,
          'items.$.qty': parsed.data.qty,
          'items.$.unitPrice': unitPrice,
        },
      },
    );
  } else {
    await db.collection<Booking>('bookings').updateOne(
      { _id: b._id },
      {
        $push: {
          items: {
            _id: new ObjectId(),
            description: parsed.data.description,
            qty: parsed.data.qty,
            unitPrice,
          },
        },
      },
    );
  }
  await recalcBooking(ctx.tenantId, b._id);
  revalidatePath(`/bookings/${b._id}`);
  return { ok: true };
}

export async function deleteItem(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const b = await loadEditable(ctx, fd);
  const itemId = toObjectId(String(fd.get('itemId') ?? ''));
  if (!b || !itemId) return { ok: false, error: 'notFound' };
  const db = await getDb();
  await db.collection<Booking>('bookings').updateOne({ _id: b._id }, { $pull: { items: { _id: itemId } } });
  await recalcBooking(ctx.tenantId, b._id);
  revalidatePath(`/bookings/${b._id}`);
  return { ok: true };
}

export async function setDiscount(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const b = await loadEditable(ctx, fd);
  if (!b) return { ok: false, error: 'notFound' };
  const raw = String(fd.get('discount') ?? '').trim();
  const discount = raw ? parseMoney(raw, b.currency) : 0;
  if (discount === null || discount < 0)
    return { ok: false, error: 'invalidAmount', fields: { discount: 'invalidAmount' } };
  const db = await getDb();
  await db.collection('bookings').updateOne({ _id: b._id }, { $set: { discount } });
  await recalcBooking(ctx.tenantId, b._id);
  revalidatePath(`/bookings/${b._id}`);
  return { ok: true };
}

const costSchema = z.object({
  description: text(300),
  amount: z.string(),
  currency: z.enum(['IQD', 'USD']),
  supplierId: z.string().optional(),
});

/** Supplier costs: visible with finance access, editable by booking staff who can see them. */
function canEditCosts(ctx: TenantCtx) {
  return can(ctx.role, 'bookings.write') && can(ctx.role, 'finance.read');
}

export async function saveCost(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  if (!canEditCosts(ctx)) return { ok: false, error: 'forbidden' };
  const b = await loadEditable(ctx, fd);
  if (!b) return { ok: false, error: 'notFound' };
  const parsed = costSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'required', fields: fieldErrors(parsed.error) };
  const amount = parseMoney(parsed.data.amount, parsed.data.currency);
  if (amount === null || amount <= 0)
    return { ok: false, error: 'invalidAmount', fields: { amount: 'invalidAmount' } };
  const db = await getDb();
  const supplierId = toObjectId(parsed.data.supplierId);
  if (
    supplierId &&
    !(await db.collection('suppliers').countDocuments({ _id: supplierId, tenantId: ctx.tenantId }))
  )
    return { ok: false, error: 'notFound' };
  await db.collection<Booking>('bookings').updateOne(
    { _id: b._id },
    {
      $push: {
        costs: {
          _id: new ObjectId(),
          supplierId: supplierId ?? undefined,
          description: parsed.data.description,
          amount,
          currency: parsed.data.currency,
          amountInBooking: convert(amount, parsed.data.currency, b.currency, ctx.tenant.settings.usdRate),
        },
      },
    },
  );
  await recalcBooking(ctx.tenantId, b._id);
  revalidatePath(`/bookings/${b._id}`);
  if (supplierId) revalidatePath(`/suppliers/${supplierId}`);
  return { ok: true };
}

export async function deleteCost(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  if (!canEditCosts(ctx)) return { ok: false, error: 'forbidden' };
  const b = await loadEditable(ctx, fd);
  const costId = toObjectId(String(fd.get('costId') ?? ''));
  if (!b || !costId) return { ok: false, error: 'notFound' };
  const db = await getDb();
  await db.collection<Booking>('bookings').updateOne({ _id: b._id }, { $pull: { costs: { _id: costId } } });
  await recalcBooking(ctx.tenantId, b._id);
  revalidatePath(`/bookings/${b._id}`);
  return { ok: true };
}

export async function setTravellers(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const b = await loadEditable(ctx, fd);
  if (!b) return { ok: false, error: 'notFound' };
  const db = await getDb();
  const customer = await db
    .collection<Customer>('customers')
    .findOne({ _id: b.customerId, tenantId: ctx.tenantId });
  if (!customer) return { ok: false, error: 'notFound' };
  const allowed = new Set(customer.travellers.map((t) => String(t._id)));
  const ids = fd
    .getAll('travellerIds')
    .map(String)
    .filter((id) => allowed.has(id))
    .map((id) => new ObjectId(id));
  await db
    .collection('bookings')
    .updateOne({ _id: b._id }, { $set: { travellerIds: ids, updatedAt: new Date() } });
  revalidatePath(`/bookings/${b._id}`);
  return { ok: true };
}

export async function deleteBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const auth = await actionTenant('bookings.write');
  if (!auth.ok) return auth;
  const { ctx } = auth;
  const b = await loadEditable(ctx, fd);
  if (!b) return { ok: false, error: 'notFound' };
  const db = await getDb();
  // Only drafts without any payment can be deleted; anything else is cancelled instead.
  if (
    b.status !== 'draft' ||
    (await db
      .collection('payments')
      .countDocuments({ tenantId: ctx.tenantId, bookingId: b._id }, { limit: 1 }))
  )
    return { ok: false, error: 'hasRecords' };
  await db.collection('bookings').deleteOne({ _id: b._id });
  await db
    .collection('leads')
    .updateMany(
      { tenantId: ctx.tenantId, bookingId: b._id },
      { $unset: { bookingId: '' }, $set: { stage: 'quoted' } },
    );
  await db
    .collection('activities')
    .deleteMany({ tenantId: ctx.tenantId, 'entity.type': 'booking', 'entity.id': b._id });
  await audit({ tenantId: ctx.tenantId, userId: ctx.user._id, action: 'booking.delete', summary: b.number });
  revalidatePath('/bookings');
  redirect('/bookings');
}
