import 'server-only';
import { createHash } from 'node:crypto';
import { MongoClient, type Db } from 'mongodb';
import { ensureIndexes } from './indexes';
import { MIGRATION_IDS, migrate } from './migrations';

// Changes whenever an index or a migration is added. Each new server process
// (a cold start on Netlify) checks this one value instead of re-declaring every
// index and listing migrations, which took dozens of round trips.
const SCHEMA_VERSION = createHash('sha1')
  .update(ensureIndexes.toString())
  .update(MIGRATION_IDS.join(','))
  .digest('hex')
  .slice(0, 16);

async function prepare(db: Db): Promise<void> {
  const meta = db.collection<{ _id: string; version: string; at: Date }>('meta');
  if ((await meta.findOne({ _id: 'schema' }))?.version === SCHEMA_VERSION) return;
  await ensureIndexes(db);
  await migrate(db);
  await meta.updateOne(
    { _id: 'schema' },
    { $set: { version: SCHEMA_VERSION, at: new Date() } },
    { upsert: true },
  );
}

// One client per server process (reused across hot reloads in development and
// across invocations of a warm serverless function).
type Cache = { client?: MongoClient; db?: Promise<Db> };
const globalCache = globalThis as unknown as { __niuraMongo?: Cache };
const cache: Cache = (globalCache.__niuraMongo ??= {});

export function getDb(): Promise<Db> {
  if (!cache.db) {
    const uri = process.env.MONGODB_URI;
    if (!uri)
      throw new Error('MONGODB_URI is not set. Add the MongoDB Atlas connection string to the environment.');
    // ignoreUndefined: optional fields left empty are omitted rather than stored as null.
    cache.client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      ignoreUndefined: true,
    });
    cache.db = cache.client
      .connect()
      .then(async (client) => {
        const db = client.db(process.env.MONGODB_DB || 'niura_erp');
        await prepare(db);
        return db;
      })
      .catch((err) => {
        cache.db = undefined;
        throw err;
      });
  }
  return cache.db;
}

export async function getClient(): Promise<MongoClient> {
  await getDb();
  return cache.client!;
}
