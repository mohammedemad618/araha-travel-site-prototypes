import 'server-only';
import type {
  AggregateOptions,
  AggregationCursor,
  Collection,
  CountDocumentsOptions,
  Db,
  Document,
  Filter,
  FindCursor,
  FindOneAndUpdateOptions,
  FindOptions,
  ObjectId,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
  WithId,
} from 'mongodb';
import { getDb } from './db';
import {
  SCOPED_COLLECTIONS,
  UNRESTRICTED,
  scopedFilter,
  visibilityFilter,
  type ScopedCollection,
  type Visibility,
} from './scope';
import type {
  Activity,
  AuditLog,
  Booking,
  Branch,
  Customer,
  Departure,
  Invoice,
  Lead,
  Membership,
  Payment,
  Quote,
  Supplier,
  SupplierPayment,
  Task,
  TravelPackage,
  VisaApplication,
} from './types';

/**
 * Tenant-aware data access. Every query gets the company id (and, for leads,
 * bookings, visas and payments, the member's branch/ownership scope) added
 * automatically, and every insert is stamped with the company id, so a page or
 * action cannot forget the filter and read another company's data.
 */
export class TenantCollection<T extends Document & { tenantId: ObjectId }> {
  constructor(
    private readonly col: Collection<T>,
    private readonly tenantId: ObjectId,
    private readonly extra: Filter<Document>,
  ) {}

  private f(filter?: Filter<T>): Filter<T> {
    return scopedFilter(this.tenantId, filter as Filter<Document>, this.extra) as Filter<T>;
  }

  find(filter?: Filter<T>, options?: FindOptions): FindCursor<WithId<T>> {
    return this.col.find(this.f(filter), options);
  }

  findOne(filter?: Filter<T>, options?: FindOptions): Promise<WithId<T> | null> {
    return this.col.findOne(this.f(filter), options);
  }

  countDocuments(filter?: Filter<T>, options?: CountDocumentsOptions): Promise<number> {
    return this.col.countDocuments(this.f(filter), options);
  }

  /** True when at least one matching record exists. */
  async exists(filter?: Filter<T>): Promise<boolean> {
    return (await this.col.countDocuments(this.f(filter), { limit: 1 })) > 0;
  }

  distinct(key: string, filter?: Filter<T>): Promise<unknown[]> {
    return this.col.distinct(key, this.f(filter));
  }

  /** The pipeline starts with the company/scope match. */
  aggregate<R extends Document>(pipeline: Document[], options?: AggregateOptions): AggregationCursor<R> {
    return this.col.aggregate<R>([{ $match: this.f() }, ...pipeline], options);
  }

  async insertOne(doc: Omit<T, '_id' | 'tenantId'>): Promise<ObjectId> {
    const res = await this.col.insertOne({
      ...doc,
      tenantId: this.tenantId,
    } as unknown as OptionalUnlessRequiredId<T>);
    return res.insertedId as unknown as ObjectId;
  }

  updateOne(filter: Filter<T>, update: UpdateFilter<T> | Document, options?: UpdateOptions) {
    return this.col.updateOne(this.f(filter), update as UpdateFilter<T>, options);
  }

  updateMany(filter: Filter<T>, update: UpdateFilter<T> | Document) {
    return this.col.updateMany(this.f(filter), update as UpdateFilter<T>);
  }

  deleteOne(filter: Filter<T>) {
    return this.col.deleteOne(this.f(filter));
  }

  deleteMany(filter: Filter<T>) {
    return this.col.deleteMany(this.f(filter));
  }

  /** Returns the document as it was before the update unless options say otherwise. */
  findOneAndUpdate(
    filter: Filter<T>,
    update: UpdateFilter<T> | Document,
    options: FindOneAndUpdateOptions = {},
  ): Promise<WithId<T> | null> {
    return this.col.findOneAndUpdate(this.f(filter), update as UpdateFilter<T>, options);
  }

  findOneAndDelete(filter: Filter<T>): Promise<WithId<T> | null> {
    return this.col.findOneAndDelete(this.f(filter));
  }
}

function collections(db: Db, tenantId: ObjectId, v: Visibility) {
  const scoped = <T extends Document & { tenantId: ObjectId }>(name: ScopedCollection) =>
    new TenantCollection<T>(db.collection<T>(name), tenantId, visibilityFilter(v, SCOPED_COLLECTIONS[name]));
  const plain = <T extends Document & { tenantId: ObjectId }>(name: string) =>
    new TenantCollection<T>(db.collection<T>(name), tenantId, {});
  return {
    leads: scoped<Lead>('leads'),
    bookings: scoped<Booking>('bookings'),
    visas: scoped<VisaApplication>('visas'),
    payments: scoped<Payment>('payments'),
    quotes: scoped<Quote>('quotes'),
    invoices: scoped<Invoice>('invoices'),
    customers: plain<Customer>('customers'),
    packages: plain<TravelPackage>('packages'),
    departures: plain<Departure>('departures'),
    suppliers: plain<Supplier>('suppliers'),
    supplierPayments: plain<SupplierPayment>('supplierPayments'),
    tasks: plain<Task>('tasks'),
    activities: plain<Activity>('activities'),
    branches: plain<Branch>('branches'),
    memberships: plain<Membership>('memberships'),
    auditLogs: plain<AuditLog & { tenantId: ObjectId }>('auditLogs'),
  };
}

export type Repo = ReturnType<typeof collections> & {
  /** The same collections without the member's branch/ownership scope (still limited to the company). */
  all: ReturnType<typeof collections>;
};

/** Company-wide access, for system code (public API, integrity checks, totals). */
export async function tenantRepo(tenantId: ObjectId): Promise<ReturnType<typeof collections>> {
  return collections(await getDb(), tenantId, UNRESTRICTED);
}

/** Access as a signed-in member: limited to what they may see. */
export async function repo(ctx: { tenantId: ObjectId; visibility: Visibility }): Promise<Repo> {
  const db = await getDb();
  const all = collections(db, ctx.tenantId, UNRESTRICTED);
  return { ...collections(db, ctx.tenantId, ctx.visibility), all };
}
