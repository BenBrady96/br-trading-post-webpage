import { readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CATEGORIES, SITE, placeholders } from '../config/site.mjs';
import { checkContrast, tokenBlocks } from './lib/contrast.mjs';
import { DESCRIPTION_MAX, TITLE_MAX } from './lib/seo.mjs';
import { DIST, ROOT, exists, listFiles } from './lib/util.mjs';

let checks = 0;
let failures = 0;
const warnings = [];

function check(ok, message) {
  checks++;
  if (!ok) {
    failures++;
    console.error(`FAIL ${message}`);
  }
}

const rel = (file) => relative(DIST, file).split(sep).join('/');
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", lsquo: '‘', rsquo: '’', copy: '©', nbsp: ' ' };
const decode = (s) => String(s ?? '').replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => {
  if (ENTITIES[e] !== undefined) return ENTITIES[e];
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return m;
});
const attr = (tag, name) => decode(new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1] ?? null);
const meta = (html, key, value) => {
  const tag = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).find((t) => attr(t, key) === value);
  return tag ? attr(tag, 'content') : null;
};

if (!(await exists(join(DIST, 'index.html')))) {
  console.error('dist/ is empty: run npm run build first');
  process.exit(1);
}

const files = await listFiles(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const home = await readFile(join(DIST, 'index.html'), 'utf8');
const siteUrl = /<link rel="canonical" href="([^"]+)"/.exec(home)?.[1];
check(siteUrl && siteUrl.endsWith('/'), 'home page has a canonical URL ending in /');
const site = new URL(siteUrl);
const localDev = site.hostname === 'localhost';

const urlFor = (path) => {
  if (path === 'index.html') return siteUrl;
  return `${siteUrl}${path.endsWith('/index.html') ? path.slice(0, -'index.html'.length) : path}`;
};

function resolveLocal(fromPath, url) {
  const base = new URL(fromPath, siteUrl);
  const target = new URL(url, base);
  if (target.origin !== site.origin) return null;
  let path = decodeURIComponent(target.pathname).replace(/^\//, '');
  const sitePath = site.pathname.replace(/^\//, '');
  if (sitePath && path.startsWith(sitePath)) path = path.slice(sitePath.length);
  if (path === '' || path.endsWith('/')) path += 'index.html';
  return path;
}

const EM_DASH = String.fromCharCode(0x2014);
const apiUrl = /data-api="([^"]+)"/.exec(home)?.[1];
const titles = new Map();
const descriptions = new Map();
const indexable = new Set();
const csps = new Set();
const PAGE_TYPES = new Set();

for (const file of htmlFiles) {
  const path = rel(file);
  const html = await readFile(file, 'utf8');
  const label = path;
  const robots = meta(html, 'name', 'robots') || '';
  const noindex = /noindex/.test(robots);
  if (!noindex) indexable.add(path);

  const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1]);
  const description = meta(html, 'name', 'description');
  check(title, `${label}: has a <title>`);
  check(title && title.length <= TITLE_MAX, `${label}: title is ${title?.length} characters (max ${TITLE_MAX}): ${title}`);
  check(description, `${label}: has a meta description`);
  check(description && description.length <= DESCRIPTION_MAX + 5, `${label}: description is ${description?.length} characters (max ${DESCRIPTION_MAX})`);
  if (!noindex) {
    check(!titles.has(title), `${label}: title is unique (also on ${titles.get(title)})`);
    check(!descriptions.has(description), `${label}: description is unique (also on ${descriptions.get(description)})`);
    titles.set(title, label);
    descriptions.set(description, label);
  }

  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  check(canonical === urlFor(path), `${label}: canonical is ${canonical}, expected ${urlFor(path)}`);
  for (const key of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:site_name', 'og:locale']) check(meta(html, 'property', key), `${label}: has ${key}`);
  for (const key of ['twitter:card', 'twitter:title', 'twitter:image']) check(meta(html, 'name', key), `${label}: has ${key}`);
  check(meta(html, 'property', 'og:url') === canonical, `${label}: og:url matches the canonical URL`);
  check(/<html lang="en-GB"/.test(html), `${label}: lang is en-GB`);
  check(/<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/.test(html), `${label}: has the mobile viewport`);

  const h1s = (html.match(/<h1\b/g) || []).length;
  check(h1s === 1, `${label}: has exactly one <h1> (found ${h1s})`);
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  const skips = levels.filter((level, i) => i > 0 && level > levels[i - 1] + 1);
  check(!skips.length, `${label}: heading levels don't skip (${levels.join(' ')})`);

  const csp = meta(html, 'http-equiv', 'Content-Security-Policy');
  check(csp && /default-src 'self'/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp), `${label}: has a strict Content-Security-Policy`);
  check(csp && !/'unsafe-inline'|'unsafe-eval'/.test(csp), `${label}: CSP doesn't allow unsafe-inline or unsafe-eval`);
  csps.add(csp);

  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const type = attr(m[0], 'type');
    const src = attr(m[0], 'src');
    if (src) continue;
    check(type === 'application/ld+json' || type === 'speculationrules', `${label}: no inline JavaScript (found a script of type ${type || 'text/javascript'})`);
    if (type === 'application/ld+json' || type === 'speculationrules') {
      let data = null;
      try {
        data = JSON.parse(m[2]);
      } catch (err) {
        check(false, `${label}: ${type} parses as JSON (${err.message})`);
        continue;
      }
      if (type === 'application/ld+json') {
        check(data['@context'] === 'https://schema.org', `${label}: JSON-LD uses the schema.org context`);
        for (const node of data['@graph'] || [data]) {
          PAGE_TYPES.add(node['@type']);
          const need = (cond, what) => check(cond, `${label}: ${node['@type']} has ${what}`);
          if (node['@type'] === 'OnlineStore') {
            need(node.name && node.url && node.logo?.url, 'name, url and logo');
          } else if (node['@type'] === 'WebSite') {
            need(node.name === SITE.name && node.url === siteUrl, 'the site name and URL');
          } else if (node['@type'] === 'BreadcrumbList') {
            need(node.itemListElement?.length >= 2 && node.itemListElement.every((li, i) => li.position === i + 1 && li.name && li.item), 'numbered items with names and URLs');
            need(node.itemListElement?.at(-1)?.item === canonical, 'this page as the last crumb');
          } else if (node['@type'] === 'Product') {
            need(node.name && node.offers?.price && node.offers?.priceCurrency === 'GBP' && /schema\.org\/(InStock|SoldOut)$/.test(node.offers?.availability || ''), 'a name and an offer with price, GBP and availability');
            need(Array.isArray(node.image) && node.image.length > 0, 'at least one image');
          } else if (node['@type'] === 'ItemList') {
            need(node.itemListElement?.every((li, i) => li.position === i + 1 && li.url), 'numbered items with URLs');
          }
        }
      }
    }
  }
  check(!/\son[a-z]+="/i.test(html), `${label}: no inline event handlers`);
  check(!/\sstyle="/i.test(html), `${label}: no inline style attributes (blocked by the CSP)`);
  check(!/TODO/.test(html), `${label}: no TODO placeholders in the page`);
  check(label.startsWith('item/') || !html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '').includes(EM_DASH), `${label}: no em dashes`);

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    check(attr(tag, 'alt') !== null, `${label}: image has alt text: ${tag.slice(0, 80)}`);
    check(attr(tag, 'width') && attr(tag, 'height'), `${label}: image has width and height: ${tag.slice(0, 80)}`);
  }

  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = m[0];
    const href = attr(tag, 'href');
    if (!href || /^(mailto:|tel:|#)/.test(href)) continue;
    const target = new URL(href, new URL(path, siteUrl));
    if (target.origin !== site.origin) {
      check(/noopener/.test(attr(tag, 'rel') || ''), `${label}: external link has rel="noopener": ${href}`);
      check(target.protocol === 'https:', `${label}: external link uses https: ${href}`);
    }
  }

  const refs = [
    ...[...html.matchAll(/\s(?:href|src)="([^"]+)"/gi)].map((m) => decode(m[1])),
    ...[...html.matchAll(/\ssrcset="([^"]+)"/gi)].flatMap((m) => decode(m[1]).split(',').map((p) => p.trim().split(/\s+/)[0])),
  ];
  for (const ref of refs) {
    if (/^(mailto:|tel:|data:|#)/.test(ref) || (apiUrl && ref.startsWith(apiUrl))) continue;
    if (/^http:/.test(ref) && !localDev) check(false, `${label}: no http:// URLs: ${ref}`);
    const local = resolveLocal(path, ref);
    if (local === null) continue;
    check(await exists(join(DIST, local)), `${label}: link or asset exists: ${ref}`);
  }
}

check(csps.size === 1, `every page has the same CSP (found ${csps.size} variants)`);
for (const type of ['OnlineStore', 'WebSite', 'BreadcrumbList', 'CollectionPage', 'AboutPage', 'ContactPage']) check(PAGE_TYPES.has(type), `the site has ${type} structured data`);

const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
check(locs.length > 0, 'sitemap.xml lists pages');
check(new Set(locs).size === locs.length, 'sitemap.xml has no duplicates');
for (const loc of locs) {
  const path = resolveLocal('', loc);
  check(path && indexable.has(path), `sitemap.xml only lists indexable built pages: ${loc}`);
}
for (const path of indexable) check(locs.includes(urlFor(path)), `${path} is in sitemap.xml`);
check([...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].every((m) => /^\d{4}-\d{2}-\d{2}$/.test(m[1])), 'sitemap.xml lastmod dates are YYYY-MM-DD');
const robots = await readFile(join(DIST, 'robots.txt'), 'utf8');
check(robots.includes(`Sitemap: ${siteUrl}sitemap.xml`), 'robots.txt points to the sitemap');
check(!/Disallow: \/\s*$/m.test(robots), 'robots.txt does not block the site');
check(await exists(join(DIST, `${SITE.indexNowKey}.txt`)), 'IndexNow key file exists');
const notFound = await readFile(join(DIST, '404.html'), 'utf8');
check(/noindex/.test(meta(notFound, 'name', 'robots') || ''), '404 page is noindex');
for (const c of CATEGORIES) check(await exists(join(DIST, 'shop', c.id, 'index.html')), `category page exists: ${c.id}`);
for (const path of ['index.html', 'shop/index.html', 'promotions/index.html', 'about/index.html', 'contact/index.html', 'delivery-returns/index.html', 'privacy/index.html', 'terms/index.html', 'accessibility/index.html']) check(indexable.has(path), `${path} can be indexed`);
for (const path of htmlFiles.map(rel).filter((p) => p.startsWith('item/'))) check(indexable.has(path), `${path} can be indexed`);
for (const c of CATEGORIES) {
  const path = `shop/${c.id}/index.html`;
  const cards = ((await readFile(join(DIST, path), 'utf8')).match(/<li class="card[ "]/g) || []).length;
  check(indexable.has(path) === cards > 0, `${path}: ${cards ? `has ${cards} items, so it must be indexable` : 'has no items yet, so it must be noindex'}`);
}

const css = await readFile(join(DIST, 'css', 'styles.css'), 'utf8');
const tokens = tokenBlocks(css);
check(tokens.light && tokens.dark && tokens.darkAuto, 'styles.css has light, dark and auto-dark token blocks');
check(JSON.stringify(tokens.dark) === JSON.stringify(tokens.darkAuto), 'the two dark token blocks are identical');
for (const [name, block] of [['light', tokens.light], ['dark', { ...tokens.light, ...tokens.dark }]]) {
  for (const failure of checkContrast(block)) check(false, `${name} theme contrast: ${failure}`);
  checks++;
}

const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const cssGz = gz(await readFile(join(DIST, 'css', 'styles.css')));
check(cssGz <= 30 * 1024, `CSS is ${kb(cssGz)} compressed (budget 30 KB)`);

async function moduleGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const source = await readFile(join(DIST, entry), 'utf8');
  for (const m of source.matchAll(/(?:import|export)\s[^'"]*?from\s*'([^']+)'|import\('([^']+)'\)/g)) {
    const spec = m[1] || m[2];
    if (!spec.startsWith('.')) continue;
    await moduleGraph(new URL(spec, `file:///${entry}`).pathname.slice(1), seen);
  }
  return seen;
}
for (const entry of ['home', 'shop', 'item', 'promotions', 'page']) {
  const graph = await moduleGraph(`js/pages/${entry}.js`);
  let total = gz(await readFile(join(DIST, 'js', 'shared', 'theme-init.js')));
  for (const file of graph) total += gz(await readFile(join(DIST, file)));
  check(total <= 25 * 1024, `${entry} page JavaScript is ${kb(total)} compressed (budget 25 KB)`);
}
for (const file of files.filter((f) => /storefront-(wide-)?(480|800|1200)\.(avif|webp)$/.test(f))) {
  const size = (await readFile(file)).length;
  check(size <= 150 * 1024, `${rel(file)} is ${kb(size)} (budget 150 KB)`);
}

const SOURCE_DIRS = ['templates', 'public', 'config', 'scripts', '.github', 'tests'];
const TEXT = /\.(html|css|js|mjs|json|webmanifest|txt|svg|xml|yml|yaml|md)$/;
const sources = [join(ROOT, 'README.md')];
for (const dir of SOURCE_DIRS) {
  if (!(await exists(join(ROOT, dir)))) continue;
  sources.push(...(await listFiles(join(ROOT, dir))).filter((f) => TEXT.test(f) && !f.includes(`${sep}local${sep}`) && !f.includes('node_modules')));
}
const EMOJI = /[\p{Emoji_Presentation}\u{FE0F}]/u;
const US = /\b(colors?|colored|favorites?|organiz(e|ed|es|ing|ation)|realiz(e|ed)|recogniz(e|ed)|customiz(e|ed)|personaliz(e|ed)|prioritiz(e|ed)|optimiz(e|ed)|finaliz(e|ed)|minimiz(e|ed)|maximiz(e|ed)|apologiz(e|ed)|specializ(e|ed)|summariz(e|ed)|categoriz(e|ed)|behavior|honor|labor|neighbor|humor|flavor|center(ed)?|theater|gray|catalog|jewelry|cozy|traveling|traveled|canceled|canceling|labeled|fulfill(ment)?|enrollment)\b/i;
const visibleText = (html) => html
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\{\{\{?\w+\}?\}\}/g, ' ');
for (const file of sources) {
  if (!(await exists(file))) continue;
  const text = await readFile(file, 'utf8');
  const name = relative(ROOT, file).split(sep).join('/');
  check(!text.includes(EM_DASH), `${name}: no em dashes`);
  check(!EMOJI.test(text), `${name}: no emojis (use an icon instead)`);
  if (name.startsWith('templates/')) {
    const match = US.exec(visibleText(text));
    check(!match, `${name}: UK spelling (found "${match?.[0]}")`);
  }
}
const configStrings = JSON.stringify(CATEGORIES) + JSON.stringify(SITE);
const usInConfig = US.exec(configStrings);
check(!usInConfig, `config/site.mjs: UK spelling (found "${usInConfig?.[0]}")`);

for (const path of placeholders()) warnings.push(`config/site.mjs: ${path} is still a placeholder`);

for (const w of warnings) console.warn(`WARN ${w}`);
console.log(`${checks - failures}/${checks} checks passed${warnings.length ? `, ${warnings.length} warnings` : ''}`);
if (failures) process.exit(1);
