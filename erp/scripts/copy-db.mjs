// Copies the ERP database to another MongoDB (e.g. a cluster in another region).
// Usage: FROM_URI=... TO_URI=... [MONGODB_DB=niura_erp] node scripts/copy-db.mjs [--dry-run]
// Every collection is copied with its _id values, including uploaded files and
// sessions (nobody is signed out). Skipped: rate-limit counters, and the schema
// stamp, so the app creates its indexes on the new database when it first starts.
// Refuses to write into a database that already has data. The source is only read.
import { MongoClient } from 'mongodb';

const from = process.env.FROM_URI;
const to = process.env.TO_URI;
const dbName = process.env.MONGODB_DB || 'niura_erp';
const dryRun = process.argv.includes('--dry-run');
if (!from || !to) {
  console.error('Set FROM_URI and TO_URI.');
  process.exit(1);
}
const SKIP = new Set(['meta', 'rateLimits']);
const BATCH = 500;

const source = await MongoClient.connect(from);
const target = await MongoClient.connect(to);
try {
  const src = source.db(dbName);
  const dst = target.db(dbName);
  const existing = (await dst.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
  for (const name of existing) {
    if (!name.startsWith('system.') && (await dst.collection(name).estimatedDocumentCount()) > 0) {
      throw new Error(`The target already has data (${name}); nothing was copied.`);
    }
  }
  const names = (await src.listCollections({ type: 'collection' }, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.') && !SKIP.has(n))
    .sort();
  let total = 0;
  for (const name of names) {
    const expected = await src.collection(name).countDocuments();
    let copied = 0;
    if (!dryRun) {
      let batch = [];
      for await (const doc of src.collection(name).find({}, { sort: { _id: 1 } })) {
        batch.push(doc);
        if (batch.length === BATCH) {
          await dst.collection(name).insertMany(batch, { ordered: true });
          copied += batch.length;
          batch = [];
        }
      }
      if (batch.length) {
        await dst.collection(name).insertMany(batch, { ordered: true });
        copied += batch.length;
      }
    }
    const landed = dryRun ? 0 : await dst.collection(name).countDocuments();
    const ok = dryRun || landed === expected;
    console.log(
      `${ok ? 'ok ' : 'MISMATCH'} ${name.padEnd(24)} source=${expected}${dryRun ? '' : ` copied=${copied} target=${landed}`}`,
    );
    if (!ok) process.exitCode = 1;
    total += expected;
  }
  console.log(`${dryRun ? 'Would copy' : 'Copied'} ${total} documents in ${names.length} collections.`);
} finally {
  await source.close();
  await target.close();
}
