// Keeps the dashboard's server warm. Netlify stops an idle server after a few
// minutes; the next visitor then waits several seconds while a new one starts
// and connects to the database. A light request every few minutes keeps one
// running, with its database connection open.

declare const Netlify: { env: { get(name: string): string | undefined } };

export default async function keepWarm() {
  const site = Netlify.env.get('URL');
  if (!site) return;
  try {
    await fetch(`${site}/api/health`, { signal: AbortSignal.timeout(20000) });
  } catch {
    // The next run tries again; nothing to report.
  }
}

export const config = { schedule: '*/4 * * * *' };
