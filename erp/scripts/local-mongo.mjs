// Starts a local MongoDB for development and tests (no Atlas needed).
// Usage: node scripts/local-mongo.mjs [port] [dataDir]
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdirSync } from 'node:fs';

const port = Number(process.argv[2] || 27077);
const dbPath = process.argv[3];
if (dbPath) mkdirSync(dbPath, { recursive: true });
const server = await MongoMemoryServer.create({
  instance: { port, dbPath, storageEngine: dbPath ? 'wiredTiger' : 'ephemeralForTest' },
});
console.log(`MongoDB ready: ${server.getUri()}`);
const stop = async () => {
  await server.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
