// Before the build: pull from the Niura ERP (when ERP_URL and NEXT_PUBLIC_ERP_KEY
// are set) the live prices and dates, and everything edited in its "Website
// content" section: trip programs, visas, destinations, guides, pages, company
// details, the home page, testimonials, the FAQ and their images.
// Never fails the build: without the ERP the site uses the files in content/.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const CATALOG = 'content/.erp-catalog.json';
const MEDIA_DIR = 'public/uploads/erp';
const url = process.env.ERP_URL?.replace(/\/+$/, '');
const key = process.env.NEXT_PUBLIC_ERP_KEY;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

await rm(CATALOG, { force: true });
if (!url || !key) {
  console.log('[erp] ERP_URL / NEXT_PUBLIC_ERP_KEY not set: using the files in content/.');
  process.exit(0);
}

async function getJson(path, timeout = 20000) {
  const res = await fetch(`${url}${path}?key=${encodeURIComponent(key)}`, {
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

try {
  const data = await getJson('/api/public/v1/catalog', 15000);
  if (!Array.isArray(data.packages)) throw new Error('unexpected response');
  await writeFile(CATALOG, JSON.stringify(data, null, 2));
  console.log(`[erp] synced prices for ${data.packages.length} packages`);
} catch (err) {
  console.warn(`[erp] could not read prices (${err.message}); using local package dates.`);
}

// Library images come as links to the ERP; they are downloaded into the site so
// pages load them from the site's own CDN (and the CSP stays unchanged).
const MEDIA_SRC = /^https?:\/\/[^/\s]+\/api\/public\/media\/([a-f0-9]{24})$/;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function collectMedia(value, found) {
  if (Array.isArray(value)) value.forEach((v) => collectMedia(v, found));
  else if (value && typeof value === 'object') {
    if (typeof value.src === 'string' && MEDIA_SRC.test(value.src)) found.add(value.src);
    Object.values(value).forEach((v) => collectMedia(v, found));
  }
  return found;
}

function rewriteMedia(value, local) {
  if (Array.isArray(value)) return value.map((v) => rewriteMedia(v, local));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        k === 'src' && local.has(v) ? local.get(v) : rewriteMedia(v, local),
      ]),
    );
  }
  return value;
}

try {
  const data = await getJson('/api/public/v1/content', 30000);
  const lists = ['packages', 'visas', 'destinations'];
  if (!lists.every((k) => Array.isArray(data[k]))) throw new Error('unexpected response');

  // Download every image first: if one fails, nothing is written.
  const local = new Map();
  await mkdir(MEDIA_DIR, { recursive: true });
  for (const src of collectMedia(data, new Set())) {
    const res = await fetch(src, { signal: AbortSignal.timeout(30000) });
    const ext = EXT[res.headers.get('content-type') ?? ''];
    if (!res.ok || !ext) throw new Error(`image ${src}: HTTP ${res.status}`);
    const name = `${MEDIA_SRC.exec(src)[1]}.${ext}`;
    await writeFile(`${MEDIA_DIR}/${name}`, Buffer.from(await res.arrayBuffer()));
    local.set(src, `/uploads/erp/${name}`);
  }
  const content = rewriteMedia(data, local);

  const write = (folder, id, item) =>
    SLUG.test(id) ? writeFile(`content/${folder}/${id}.json`, `${JSON.stringify(item, null, 2)}\n`) : null;
  for (const d of content.destinations) await write('destinations', d.slug, d);
  for (const v of content.visas) await write('visas', v.destination, v);
  for (const p of content.packages) await write('packages', p.slug, p);
  for (const g of content.guides ?? []) await write('guides', g.slug, g);
  // Once guides are managed in the ERP, its list is the whole list: a guide
  // deleted there leaves the site.
  if (content.guides?.length) {
    const keep = new Set(content.guides.map((g) => `${g.slug}.json`));
    for (const f of await readdir('content/guides'))
      if (f.endsWith('.json') && !keep.has(f)) await rm(`content/guides/${f}`, { force: true });
  }
  for (const [key, page] of Object.entries(content.pages ?? {}))
    if (['about', 'privacy', 'terms'].includes(key)) await write('pages', key, page);
  const singles = { site: 'site', home: 'home', testimonials: 'testimonials', faq: 'faq' };
  for (const [kind, file] of Object.entries(singles))
    if (content[kind] && typeof content[kind] === 'object') await write('settings', file, content[kind]);

  // Hidden packages leave the site, unless the home page still features them.
  const home = JSON.parse(await readFile('content/settings/home.json', 'utf8'));
  const featured = new Set([home.featuredPackage, home.offer?.package]);
  for (const slug of data.hiddenPackages ?? []) {
    if (!SLUG.test(slug)) continue;
    if (featured.has(slug)) {
      console.warn(`[erp] "${slug}" is hidden but featured on the home page; it stays on the site.`);
      continue;
    }
    await rm(`content/packages/${slug}.json`, { force: true });
  }
  console.log(
    `[erp] synced ${content.packages.length} trip programs, ${content.visas.length} visas, ` +
      `${content.destinations.length} destinations, ${content.guides?.length ?? 0} guides, ` +
      `${Object.keys(content.pages ?? {}).length} pages, ` +
      `${Object.keys(singles).filter((k) => content[k]).length} settings, ${local.size} images`,
  );
} catch (err) {
  console.warn(`[erp] could not read website content (${err.message}); using the files in content/.`);
}
