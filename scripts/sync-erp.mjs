// Before the build: pull live prices and departure availability from the
// Niura ERP (when ERP_URL and NEXT_PUBLIC_ERP_KEY are set). Never fails the
// build: without the ERP the site simply uses the dates in content/packages.
import { rm, writeFile } from 'node:fs/promises';

const OUT = 'content/.erp-catalog.json';
const url = process.env.ERP_URL?.replace(/\/+$/, '');
const key = process.env.NEXT_PUBLIC_ERP_KEY;

await rm(OUT, { force: true });
if (!url || !key) {
  console.log('[erp] ERP_URL / NEXT_PUBLIC_ERP_KEY not set: using local package dates.');
  process.exit(0);
}
try {
  const res = await fetch(`${url}/api/public/v1/catalog?key=${encodeURIComponent(key)}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.packages)) throw new Error('unexpected response');
  await writeFile(OUT, JSON.stringify(data, null, 2));
  console.log(`[erp] synced ${data.packages.length} packages from ${url}`);
} catch (err) {
  console.warn(`[erp] could not reach the ERP (${err.message}); using local package dates.`);
}
