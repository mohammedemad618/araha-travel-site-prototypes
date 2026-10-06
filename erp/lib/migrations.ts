import type { Db, ObjectId } from 'mongodb';

// Data changes applied once per database, in order, on first connection.
// Each migration is idempotent so two servers starting together cannot corrupt data.

type Migration = { id: string; run: (db: Db) => Promise<void> };

const MAIN_BRANCH = { ar: 'الفرع الرئيسي', code: 'MAIN' };

/** The company's main branch, created when missing. */
export async function ensureMainBranch(
  db: Db,
  tenant: { _id: ObjectId; settings?: { phone?: string; address?: string } },
): Promise<ObjectId> {
  const existing = await db.collection('branches').findOne({ tenantId: tenant._id, isMain: true });
  if (existing) return existing._id as ObjectId;
  try {
    const res = await db.collection('branches').insertOne({
      tenantId: tenant._id,
      name: MAIN_BRANCH.ar,
      code: MAIN_BRANCH.code,
      phone: tenant.settings?.phone,
      address: tenant.settings?.address,
      isMain: true,
      active: true,
      createdAt: new Date(),
    });
    return res.insertedId;
  } catch {
    // Another server created it at the same moment (unique index).
    const again = await db.collection('branches').findOne({ tenantId: tenant._id, isMain: true });
    return again!._id as ObjectId;
  }
}

const MIGRATIONS: Migration[] = [
  {
    // Users get memberships (one user, several companies); companies get branches.
    id: '2026-10-memberships-branches',
    run: async (db) => {
      const users = db.collection('users');
      await users.updateMany(
        { role: 'platform' },
        { $set: { platformAdmin: true }, $unset: { role: '', tenantId: '' } },
      );
      for await (const u of users.find({ tenantId: { $type: 'objectId' } })) {
        await db.collection('memberships').updateOne(
          { userId: u._id, tenantId: u.tenantId },
          {
            $setOnInsert: {
              role: u.role ?? 'viewer',
              scope: 'all',
              branchIds: [],
              active: u.active !== false,
              createdAt: u.createdAt ?? new Date(),
            },
          },
          { upsert: true },
        );
        await users.updateOne({ _id: u._id }, { $unset: { role: '', tenantId: '' }, $set: { active: true } });
      }
      await users.updateMany({ tenantId: null }, { $unset: { tenantId: '', role: '' } });

      for await (const t of db.collection('tenants').find({}, { projection: { settings: 1 } })) {
        const branchId = await ensureMainBranch(db, t as { _id: ObjectId });
        for (const name of ['leads', 'bookings', 'visas', 'payments'])
          await db
            .collection(name)
            .updateMany({ tenantId: t._id, branchId: { $exists: false } }, { $set: { branchId } });
      }
    },
  },
];

export async function migrate(db: Db): Promise<void> {
  const done = new Set(
    (
      await db
        .collection<{ _id: string }>('migrations')
        .find({}, { projection: { _id: 1 } })
        .toArray()
    ).map((m) => m._id),
  );
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await m.run(db);
    await db
      .collection<{ _id: string; at: Date }>('migrations')
      .updateOne({ _id: m.id }, { $set: { at: new Date() } }, { upsert: true });
  }
}
