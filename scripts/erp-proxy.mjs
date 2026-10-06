// After the build: route /erp-api/* to the ERP through Netlify, so website
// forms post to their own origin (no CORS, and the CSP stays 'self').
import { readFile, writeFile } from 'node:fs/promises';

const url = process.env.ERP_URL?.replace(/\/+$/, '');
if (!url) process.exit(0);
const file = 'out/_redirects';
const current = await readFile(file, 'utf8').catch(() => '');
const rule = `/erp-api/*  ${url}/api/public/:splat  200!\n`;
if (!current.includes('/erp-api/*')) await writeFile(file, rule + current);
console.log(`[erp] proxy /erp-api/* -> ${url}/api/public/`);
