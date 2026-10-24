import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { CATEGORIES, SITE } from '../../config/site.mjs';
import * as pages from './pages.mjs';
import { DIST, PUBLIC, ROOT, exists, listFiles } from './util.mjs';

function gitDate(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || null;
  } catch {
    return null;
  }
}

const outFile = (path) => (path.endsWith('/') ? `${path}index.html` : path);

async function emit(out, path, text) {
  const file = join(out, outFile(path));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text);
}

async function stampServiceWorker(out, version) {
  const swPath = join(out, 'sw.js');
  const sw = await readFile(swPath, 'utf8');
  const versionPattern = /const VERSION = '[^']*';/;
  if (!versionPattern.test(sw)) throw new Error('sw.js: VERSION constant not found');
  await writeFile(swPath, sw.replace(versionPattern, `const VERSION = '${version}';`));
  const block = /const SHELL = \[([\s\S]*?)\];/.exec(sw);
  if (!block) throw new Error('sw.js: SHELL list not found');
  const shell = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const missing = [];
  for (const path of shell) if (path !== './' && !(await exists(join(out, outFile(path))))) missing.push(path);
  if (missing.length) throw new Error(`sw.js SHELL lists files that don't exist: ${missing.join(', ')}`);
  return new Set(shell.map((path) => (path === './' ? 'index.html' : outFile(path))));
}

export async function build({ siteUrl, apiUrl, data, out = DIST, now = new Date(), version = 'local' }) {
  await mkdir(out, { recursive: true });
  for (const entry of await readdir(out)) await rm(join(out, entry), { recursive: true, force: true });
  await cp(PUBLIC, out, { recursive: true });

  const ctx = {
    siteUrl,
    apiUrl,
    now,
    items: data.items,
    promotions: pages.livePromotions(data.promotions, now),
    promotionsUpdated: data.promotionsUpdated,
  };

  const list = [
    await pages.homePage(ctx),
    await pages.shopPage(ctx),
    ...await Promise.all(CATEGORIES.map((c) => pages.shopPage(ctx, c))),
    ...await Promise.all(ctx.items.map((item) => pages.itemPage(ctx, item))),
    await pages.promotionsPage(ctx),
    await pages.aboutPage(ctx),
    await pages.contactPage(ctx),
    await pages.deliveryPage(ctx),
    await pages.privacyPage(ctx),
    await pages.termsPage(ctx),
    await pages.accessibilityPage(ctx),
    await pages.newsletterPage(ctx),
    await pages.newsletterConfirmPage(ctx),
    await pages.newsletterUnsubscribePage(ctx),
    await pages.notFoundPage(ctx),
  ];

  for (const page of list) await emit(out, page.path, await pages.renderPage(ctx, page));

  const buildDay = now.toISOString().slice(0, 10);
  const sitemap = list.filter((p) => p.indexable !== false).map((p) => ({
    path: p.path,
    lastmod: p.lastmod || (p.templateFile ? gitDate(join('templates', p.templateFile)) : null) || data.shopUpdated || buildDay,
    images: p.images,
  }));
  sitemap.find((e) => e.path === 'index.html').lastmod = [data.shopUpdated, data.promotionsUpdated].filter(Boolean).sort().at(-1) || buildDay;
  await writeFile(join(out, 'sitemap.xml'), pages.sitemapXml(siteUrl, sitemap));
  await writeFile(join(out, 'robots.txt'), pages.robotsTxt(siteUrl));
  await writeFile(join(out, `${SITE.indexNowKey}.txt`), SITE.indexNowKey);

  const shell = await stampServiceWorker(out, version);
  const files = await listFiles(out);
  const rel = (file) => relative(out, file).split(sep).join('/');
  const exempt = (path) => path === 'sw.js' || path === '404.html' || path.startsWith('item/') || /^shop\/[^/]+\/index\.html$/.test(path);
  const unlisted = files.map(rel).filter((path) => /\.(js|css|html)$/.test(path) && !exempt(path) && !shell.has(path));
  if (unlisted.length) throw new Error(`Add these to the SHELL list in sw.js so they work offline: ${unlisted.join(', ')}`);

  let bytes = 0;
  for (const file of files) bytes += (await stat(file)).size;
  return { pages: list.length, items: ctx.items.length, promotions: ctx.promotions.length, files: files.length, bytes, sitemap, list };
}

