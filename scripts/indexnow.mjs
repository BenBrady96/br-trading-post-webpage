import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE } from '../config/site.mjs';
import { DIST } from './lib/util.mjs';

const mode = process.argv[2];
const SITE_URL = (process.env.SITE_URL || SITE.url).replace(/\/*$/, '/');

const entries = (xml) => new Map([...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => [m[1], m[2] || '']));

async function changedUrls() {
  const built = entries(await readFile(join(DIST, 'sitemap.xml'), 'utf8'));
  let live = new Map();
  try {
    const res = await fetch(`${SITE_URL}sitemap.xml`, { signal: AbortSignal.timeout(15000) });
    if (res.ok) live = entries(await res.text());
  } catch {}
  return [...built].filter(([url, lastmod]) => live.get(url) !== lastmod).map(([url]) => url);
}

async function submit(urls) {
  const host = new URL(SITE_URL).hostname;
  if (!urls.length) return console.log('IndexNow: nothing changed');
  if (host.endsWith('github.io') || host === 'localhost') return console.log(`IndexNow: skipped for ${host}`);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: SITE.indexNowKey, keyLocation: `${SITE_URL}${SITE.indexNowKey}.txt`, urlList: urls.slice(0, 10000) }),
    signal: AbortSignal.timeout(20000),
  });
  console.log(`IndexNow: submitted ${urls.length} URL(s), response ${res.status}`);
  if (res.status >= 400 && res.status !== 429) process.exitCode = 1;
}

if (mode === 'diff') {
  const urls = await changedUrls();
  console.log(`IndexNow: ${urls.length} new or changed URL(s)`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `urls=${JSON.stringify(urls)}\n`);
  else console.log(urls.join('\n'));
} else if (mode === 'submit') {
  await submit(JSON.parse(process.env.INDEXNOW_URLS || '[]'));
} else {
  console.error('Usage: node scripts/indexnow.mjs diff|submit');
  process.exitCode = 1;
}
