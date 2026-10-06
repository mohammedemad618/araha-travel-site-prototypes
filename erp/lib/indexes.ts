import type { Db } from 'mongodb';

// Every tenant-owned collection is indexed by tenantId first, so each company's
// queries stay fast and never scan another company's documents.
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection('tenants').createIndex({ slug: 1 }, { unique: true }),
    db.collection('tenants').createIndex({ 'website.apiKey': 1 }, { unique: true, sparse: true }),

    db.collection('users').createIndex({ email: 1 }, { unique: true }),

    db.collection('memberships').createIndex({ userId: 1, tenantId: 1 }, { unique: true }),
    db.collection('memberships').createIndex({ tenantId: 1, role: 1 }),

    db.collection('branches').createIndex({ tenantId: 1, code: 1 }, { unique: true }),
    db
      .collection('branches')
      .createIndex(
        { tenantId: 1 },
        { unique: true, partialFilterExpression: { isMain: true }, name: 'one_main_branch' },
      ),

    db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('sessions').createIndex({ userId: 1 }),

    db.collection('rateLimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

    db.collection('leads').createIndex({ tenantId: 1, stage: 1, createdAt: -1 }),
    db.collection('leads').createIndex({ tenantId: 1, phone: 1 }),
    db.collection('leads').createIndex({ tenantId: 1, assignedTo: 1 }),
    db.collection('leads').createIndex({ tenantId: 1, branchId: 1, stage: 1 }),

    db.collection('customers').createIndex({ tenantId: 1, phone: 1 }),
    db.collection('customers').createIndex({ tenantId: 1, createdAt: -1 }),
    db.collection('customers').createIndex({ tenantId: 1, 'travellers.passportExpiry': 1 }),

    db.collection('packages').createIndex({ tenantId: 1, slug: 1 }, { unique: true }),
    db.collection('departures').createIndex({ tenantId: 1, packageId: 1, date: 1 }),
    db.collection('departures').createIndex({ tenantId: 1, date: 1 }),

    db.collection('bookings').createIndex({ tenantId: 1, number: 1 }, { unique: true }),
    db.collection('bookings').createIndex({ tenantId: 1, customerId: 1 }),
    db.collection('bookings').createIndex({ tenantId: 1, departureId: 1, status: 1 }),
    db.collection('bookings').createIndex({ tenantId: 1, createdAt: -1 }),
    db.collection('bookings').createIndex({ tenantId: 1, 'services.supplierId': 1 }),
    db.collection('bookings').createIndex({ tenantId: 1, branchId: 1, createdAt: -1 }),

    db.collection('payments').createIndex({ tenantId: 1, number: 1 }, { unique: true }),
    db.collection('payments').createIndex({ tenantId: 1, bookingId: 1 }),
    db.collection('payments').createIndex({ tenantId: 1, date: -1 }),
    db.collection('payments').createIndex({ tenantId: 1, branchId: 1, date: -1 }),

    db.collection('quotes').createIndex({ tenantId: 1, number: 1 }, { unique: true }),
    db.collection('quotes').createIndex({ tenantId: 1, status: 1, createdAt: -1 }),
    db.collection('quotes').createIndex({ tenantId: 1, customerId: 1 }),
    db.collection('quotes').createIndex({ tenantId: 1, leadId: 1 }),
    db.collection('invoices').createIndex({ tenantId: 1, number: 1 }, { unique: true }),
    db.collection('invoices').createIndex({ tenantId: 1, bookingId: 1 }),
    db.collection('invoices').createIndex({ tenantId: 1, date: -1 }),

    db.collection('accounts').createIndex({ tenantId: 1, code: 1 }, { unique: true }),
    db
      .collection('accounts')
      .createIndex(
        { tenantId: 1, key: 1 },
        { unique: true, partialFilterExpression: { key: { $type: 'string' } } },
      ),
    db.collection('journalEntries').createIndex({ tenantId: 1, number: 1 }, { unique: true }),
    db.collection('journalEntries').createIndex({ tenantId: 1, date: -1 }),
    db.collection('journalEntries').createIndex({ tenantId: 1, 'lines.accountId': 1, date: 1 }),
    // One entry per payment, void, supplier payment or expense: posting twice is impossible.
    db
      .collection('journalEntries')
      .createIndex(
        { tenantId: 1, uniqueKey: 1 },
        { unique: true, partialFilterExpression: { uniqueKey: { $type: 'string' } } },
      ),
    db
      .collection('journalEntries')
      .createIndex({ tenantId: 1, 'source.type': 1, 'source.id': 1, date: 1 }, { name: 'by_source' }),
    db.collection('expenses').createIndex({ tenantId: 1, date: -1 }),

    db.collection('suppliers').createIndex({ tenantId: 1, name: 1 }),
    db.collection('supplierPayments').createIndex({ tenantId: 1, supplierId: 1, date: -1 }),

    db.collection('visas').createIndex({ tenantId: 1, status: 1, updatedAt: -1 }),
    db.collection('visas').createIndex({ tenantId: 1, customerId: 1 }),
    db.collection('visas').createIndex({ tenantId: 1, branchId: 1, status: 1 }),

    db.collection('tasks').createIndex({ tenantId: 1, done: 1, dueDate: 1 }),
    db.collection('tasks').createIndex({ tenantId: 1, assignedTo: 1, done: 1 }),

    db.collection('activities').createIndex({ tenantId: 1, 'entity.type': 1, 'entity.id': 1, createdAt: -1 }),
    db.collection('auditLogs').createIndex({ tenantId: 1, at: -1 }),
  ]);
}
