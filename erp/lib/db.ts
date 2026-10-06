import 'server-only';
import { MongoClient, type Db } from 'mongodb';
import { ensureIndexes } from './indexes';
import { migrate } from './migrations';

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
        await ensureIndexes(db);
        await migrate(db);
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
