// Starts a throwaway MongoDB and the built app for end-to-end tests.
// Used as Playwright's webServer; everything is torn down on exit.
import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = process.env.PORT || '3101';
const mongo = await MongoMemoryServer.create({ instance: { port: 27099 } });
console.log(`[test] MongoDB at ${mongo.getUri()}`);
const app = spawn('npx', ['next', 'start', '-p', port], {
  stdio: 'inherit',
  env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'niura_test', INSECURE_COOKIES: '1' },
});
const stop = async (code = 0) => {
  app.kill('SIGTERM');
  await mongo.stop();
  process.exit(code);
};
app.on('exit', (code) => stop(code ?? 0));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
