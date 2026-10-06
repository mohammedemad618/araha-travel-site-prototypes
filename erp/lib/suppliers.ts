import 'server-only';
import type { ObjectId } from 'mongodb';
import { tenantRepo } from './repo';
import type { Currency } from './types';

export type SupplierBalance = { costs: Record<Currency, number>; paid: Record<Currency, number> };

const zero = (): Record<Currency, number> => ({ IQD: 0, USD: 0 });

/** Costs recorded against each supplier minus what was paid to them, per currency. */
export async function supplierBalances(
  tenantId: ObjectId,
  supplierIds?: ObjectId[],
): Promise<Map<string, SupplierBalance>> {
  // Supplier balances are company-wide: costs from every branch count.
  const r = await tenantRepo(tenantId);
  const idFilter = supplierIds ? { $in: supplierIds } : { $exists: true, $ne: null };
  const [costs, paid] = await Promise.all([
    r.bookings
      .aggregate<{ _id: { s: ObjectId; c: Currency }; n: number }>([
        { $match: { 'services.supplierId': idFilter } },
        { $unwind: '$services' },
        // Cancelled services and lines without a cost owe the supplier nothing.
        {
          $match: {
            'services.supplierId': idFilter,
            'services.status': { $ne: 'cancelled' },
            'services.cost': { $gt: 0 },
          },
        },
        {
          $group: {
            _id: { s: '$services.supplierId', c: '$services.costCurrency' },
            n: { $sum: '$services.cost' },
          },
        },
      ])
      .toArray(),
    r.supplierPayments
      .aggregate<{ _id: { s: ObjectId; c: Currency }; n: number }>([
        { $match: { supplierId: idFilter } },
        { $group: { _id: { s: '$supplierId', c: '$currency' }, n: { $sum: '$amount' } } },
      ])
      .toArray(),
  ]);
  const map = new Map<string, SupplierBalance>();
  const get = (id: ObjectId) => {
    const k = String(id);
    if (!map.has(k)) map.set(k, { costs: zero(), paid: zero() });
    return map.get(k)!;
  };
  for (const r of costs) get(r._id.s).costs[r._id.c] += r.n;
  for (const r of paid) get(r._id.s).paid[r._id.c] += r.n;
  return map;
}
