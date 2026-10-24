import assert from 'node:assert/strict';
import { test } from 'node:test';
import { itemDetails, itemSummary } from '../../public/js/core/item.js';
import { analyticsOn, cardHtml, crumbsHtml, csp, itemPage, promoHtml, sitemapXml } from '../../scripts/lib/pages.mjs';

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

test('cards escape titles and show the Sold out state without a price', () => {
  const html = cardHtml(item);
  assert.ok(!html.includes('<script>'));
  assert.match(html, /card--sold/);
  assert.match(html, /Sold out/);
  assert.match(html, /<span class="card__price" hidden><\/span>/);
  assert.doesNotMatch(html, /89\.99/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /width="500" height="500"/);
  assert.match(cardHtml({ ...item, status: 'available' }), /<span class="card__price">£89\.99<\/span>/);
});

test('item summaries read naturally, and leave out the price once sold', () => {
  assert.equal(itemSummary(item), 'Used condition. This item has sold. BR Trading Post is a UK Pokémon card shop, and we list new stock regularly.');
  assert.equal(itemSummary({ ...item, status: 'available', condition: '', category: 'custom-binders' }), '£89.99 from BR Trading Post, a UK custom binder shop, on eBay.');
});

test('item details say when it last sold, so a restocked item doesn\'t look sold', () => {
  assert.deepEqual(itemDetails(item, 'Pokémon').at(-1), ['Last sold', '10 October 2026']);
  assert.deepEqual(itemDetails({ ...item, status: 'available' }, 'Pokémon').at(-1), ['Last sold', '10 October 2026']);
  assert.ok(!itemDetails({ ...item, status: 'available', soldAt: null }, 'Pokémon').some(([k]) => /sold/i.test(k)));
});

test('a sold item page shows no price anywhere', async () => {
  const ctx = { siteUrl: 'https://brtradingpost.co.uk/', apiUrl: 'https://api.example/', now: new Date('2026-10-24T00:00:00Z'), items: [item], promotions: [] };
  const sold = await itemPage(ctx, item);
  assert.doesNotMatch(JSON.stringify(sold), /89\.99/);
  assert.match(sold.body, /<p class="item__price" data-price hidden><\/p>/);
  assert.equal(sold.ogTitle, 'Charizard <script>alert(1)</script> (sold)');
  assert.ok(!sold.jsonLd['@graph'].some((node) => node['@type'] === 'Product'));
  const available = await itemPage(ctx, { ...item, status: 'available', soldAt: null });
  assert.match(available.body, /<p class="item__price" data-price>£89\.99<\/p>/);
  assert.equal(available.jsonLd['@graph'].find((node) => node['@type'] === 'Product').offers.price, '89.99');
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
