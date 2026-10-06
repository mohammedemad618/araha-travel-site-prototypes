import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { fieldErrors, intField, optDate, optText, text } from './forms';
import { convert, parseMoney } from './money';
import {
  serviceStatuses,
  serviceTypes,
  type Currency,
  type Departure,
  type ServiceLine,
  type TravelPackage,
} from './types';

// Service lines are shared by bookings and quotations: the same parsing,
// totals and package pricing apply to both.

/** Cancelled services stay on record but no longer count. */
export const isActive = (l: Pick<ServiceLine, 'status'>) => l.status !== 'cancelled';

export function lineTotal(l: Pick<ServiceLine, 'qty' | 'unitPrice'>): number {
  return l.qty * l.unitPrice;
}

export function lineTotals(lines: ServiceLine[], discount = 0) {
  const active = lines.filter(isActive);
  const subtotal = active.reduce((s, l) => s + lineTotal(l), 0);
  const total = Math.max(0, subtotal - (discount || 0));
  const costTotal = active.reduce((s, l) => s + (l.costInBooking ?? 0), 0);
  return { subtotal, total, costTotal };
}

/** How many of the active services the supplier has confirmed. */
export function readiness(lines: ServiceLine[]): { confirmed: number; total: number } {
  const active = lines.filter(isActive);
  return { confirmed: active.filter((l) => l.status === 'confirmed').length, total: active.length };
}

const lineSchema = z.object({
  type: z.enum(serviceTypes),
  description: text(300),
  details: optText(500),
  startDate: optDate,
  endDate: optDate,
  qty: intField(1, 10000),
  unitPrice: z.string(),
  status: z.enum(serviceStatuses).optional(),
  confirmation: optText(80),
  supplierId: z.string().optional(),
  cost: z.string().optional(),
  costCurrency: z.enum(['IQD', 'USD']).optional(),
});

/**
 * Reads a service line from a form. Supplier cost fields are only taken from
 * staff who may see costs; for others the previous cost is kept as it was.
 */
export function parseLine(
  fd: FormData,
  opts: {
    currency: Currency;
    usdRate: number;
    canCost: boolean;
    previous?: ServiceLine;
    supplierIds: Set<string>;
  },
): { ok: true; line: Omit<ServiceLine, '_id'> } | { ok: false; fields: Record<string, string> } {
  const parsed = lineSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const unitPrice = parseMoney(d.unitPrice, opts.currency);
  if (unitPrice === null || unitPrice < 0) return { ok: false, fields: { unitPrice: 'invalidAmount' } };
  if (d.startDate && d.endDate && d.endDate < d.startDate)
    return { ok: false, fields: { endDate: 'invalidDate' } };

  let cost: Pick<ServiceLine, 'supplierId' | 'cost' | 'costCurrency' | 'costInBooking'> = {
    supplierId: opts.previous?.supplierId,
    cost: opts.previous?.cost,
    costCurrency: opts.previous?.costCurrency,
    costInBooking: opts.previous?.costInBooking,
  };
  if (opts.canCost) {
    const supplierId =
      d.supplierId && opts.supplierIds.has(d.supplierId) ? new ObjectId(d.supplierId) : undefined;
    if (d.supplierId && !supplierId) return { ok: false, fields: { supplierId: 'notFound' } };
    const costCurrency = d.costCurrency ?? opts.currency;
    const amount = d.cost?.trim() ? parseMoney(d.cost, costCurrency) : undefined;
    if (amount === null || (amount !== undefined && amount < 0))
      return { ok: false, fields: { cost: 'invalidAmount' } };
    cost = {
      supplierId,
      cost: amount,
      costCurrency: amount !== undefined ? costCurrency : undefined,
      costInBooking:
        amount !== undefined ? convert(amount, costCurrency, opts.currency, opts.usdRate) : undefined,
    };
  }
  return {
    ok: true,
    line: {
      type: d.type,
      description: d.description,
      details: d.details,
      startDate: d.startDate,
      endDate: d.endDate,
      qty: d.qty,
      unitPrice,
      status: d.status ?? opts.previous?.status ?? 'pending',
      confirmation: d.confirmation,
      ...cost,
    },
  };
}

/** Sale lines for a package departure: adults and children at the departure's prices. */
export function packageLines(
  pkg: TravelPackage,
  dep: Departure | null,
  adults: number,
  children: number,
  labels: { adult: string; child: string },
): ServiceLine[] {
  const adultPrice = dep?.price ?? pkg.price;
  const base = {
    type: 'package' as const,
    startDate: dep?.date,
    status: 'pending' as const,
  };
  const lines: ServiceLine[] = [];
  if (adults > 0)
    lines.push({
      ...base,
      _id: new ObjectId(),
      description: `${pkg.title} — ${labels.adult}`,
      qty: adults,
      unitPrice: adultPrice,
    });
  if (children > 0)
    lines.push({
      ...base,
      _id: new ObjectId(),
      description: `${pkg.title} — ${labels.child}`,
      qty: children,
      unitPrice: pkg.childPrice ?? adultPrice,
    });
  return lines;
}
