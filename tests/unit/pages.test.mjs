import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyticsOn, cardHtml, crumbsHtml, csp, itemSummary, promoHtml, sitemapXml } from '../../scripts/lib/pages.mjs';

const item = {
  id: 'ebay-205512340001',
  source: 'ebay',
  slug: 'charizard-ex',
  title: 'Charizard <script>alert(1)</script>',
  price: 89.99,
  currency: 'GBP',
  status: 'sold',
  category: 'pokemon',
  condition: 'Used',
  url: 'https://www.ebay.co.uk/itm/205512340001',
  images: [{ small: 'https://api.example/v1/img/a-s', large: 'https://api.example/v1/img/a-l' }],
  listedAt: '2026-10-01T00:00:00.000Z',
  soldAt: '2026-10-10T00:00:00.000Z',
};

test('cards escape titles and show the Sold out state', () => {
  const html = cardHtml(item);
  assert.ok(!html.includes('<script>'));
  assert.match(html, /card--sold/);
  assert.match(html, /Sold out/);
  assert.match(html, /£89\.99/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /width="500" height="500"/);
});

test('item summaries read naturally', () => {
  assert.equal(itemSummary(item), 'Used condition. This item sold for £89.99 on eBay. BR Trading Post is a UK Pokémon card shop, and we list new stock regularly.');
  assert.equal(itemSummary({ ...item, status: 'available', condition: '', category: 'custom-binders' }), '£89.99 from BR Trading Post, a UK custom binder shop, on eBay.');
});

test('promotions show a static end date and escape text', () => {
  const html = promoHtml({ id: 'sale', title: 'Sale <b>', description: 'One\n\nTwo', endsAt: '2026-10-31T20:00:00.000Z', links: [{ type: 'tiktok', url: 'https://www.tiktok.com/@x' }], button: null, image: null });
  assert.match(html, /Ends Saturday 31 October at 8pm/);
  assert.match(html, /Sale &lt;b&gt;/);
  assert.match(html, /<p>One<\/p><p>Two<\/p>/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('breadcrumbs mark the current page', () => {
  const html = crumbsHtml([{ name: 'Shop', href: 'shop/' }, { name: 'Pokémon' }]);
  assert.match(html, /aria-label="Breadcrumb"/);
  assert.match(html, /<span aria-current="page">Pokémon<\/span>/);
});

test('the CSP is strict and only adds https upgrades on https sites', () => {
  const policy = csp({ siteUrl: 'https://brtradingpost.co.uk/', apiUrl: 'https://api.brtradingpost.co.uk/' });
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /require-trusted-types-for 'script'/);
  assert.match(policy, /upgrade-insecure-requests;$/);
  assert.ok(!/unsafe-inline|unsafe-eval/.test(policy));
  assert.ok(!csp({ siteUrl: 'http://localhost:8080/', apiUrl: 'http://localhost:8080/__api/' }).includes('upgrade-insecure-requests'));
});

test('analytics only loads on the live https site, never in local previews', () => {
  assert.ok(analyticsOn('https://brtradingpost.co.uk/'));
  assert.ok(!analyticsOn('http://localhost:8080/'));
  assert.match(csp({ siteUrl: 'https://brtradingpost.co.uk/', apiUrl: 'https://api.brtradingpost.co.uk/' }), /script-src 'self' 'inline-speculation-rules' https:\/\/static\.cloudflareinsights\.com;.*connect-src 'self' https:\/\/api\.brtradingpost\.co\.uk https:\/\/cloudflareinsights\.com;/);
  assert.ok(!csp({ siteUrl: 'http://localhost:8080/', apiUrl: 'http://localhost:8080/__api/' }).includes('cloudflareinsights'));
});

test('sitemaps list pages, dates and images', () => {
  const xml = sitemapXml('https://brtradingpost.co.uk/', [{ path: 'index.html', lastmod: '2026-10-21T10:00:00Z' }, { path: 'item/x/', lastmod: '2026-10-20', images: ['https://api.example/v1/img/a-l'] }]);
  assert.match(xml, /<loc>https:\/\/brtradingpost\.co\.uk\/<\/loc>/);
  assert.match(xml, /<lastmod>2026-10-21<\/lastmod>/);
  assert.match(xml, /<image:loc>https:\/\/api\.example\/v1\/img\/a-l<\/image:loc>/);
});
