import assert from 'node:assert/strict';
import { test } from 'node:test';
import { itemDetails, itemSummary } from '../../public/js/core/item.js';
import { SITE, isSet } from '../../config/site.mjs';
import { TURNSTILE_TEST_KEY, analyticsOn, cardHtml, crumbsHtml, csp, homePage, itemPage, newsletterConfirmPage, newsletterPage, newsletterUnsubscribePage, promoHtml, sitemapXml, turnstileKey } from '../../scripts/lib/pages.mjs';

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

const REDUCED = '<s class="price__was"><span class="sr-only">Was </span>£120.00</s><span class="sr-only">, now</span> £89.99 <span class="price__save">Save £30.01</span>';

test('a reduced item shows the old price struck through, the saving, and reads well aloud', async () => {
  const reduced = { ...item, status: 'available', soldAt: null, wasPrice: 120 };
  const card = cardHtml(reduced);
  assert.ok(card.includes(`<span class="card__price">${REDUCED}</span>`));
  assert.match(card, /data-price="89\.99" data-was="120"/);
  assert.match(cardHtml({ ...reduced, status: 'sold' }), /data-was="" .*<span class="card__price" hidden><\/span>/s);
  assert.match(cardHtml({ ...reduced, wasPrice: null }), /data-was="" .*<span class="card__price">£89\.99<\/span>/s);
  const ctx = { siteUrl: 'https://brtradingpost.co.uk/', apiUrl: 'https://api.example/', now: new Date('2026-10-24T00:00:00Z'), items: [reduced], promotions: [] };
  const page = await itemPage(ctx, reduced);
  assert.ok(page.body.includes(`<p class="item__price" data-price>${REDUCED}</p>`));
  const offers = page.jsonLd['@graph'].find((node) => node['@type'] === 'Product').offers;
  assert.equal(offers.price, '89.99');
  assert.equal(offers.priceSpecification.price, '120.00');
  assert.equal(page.ogTitle, 'Charizard <script>alert(1)</script> | £89.99');
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
  assert.match(csp({ siteUrl: 'https://brtradingpost.co.uk/', apiUrl: 'https://api.brtradingpost.co.uk/' }), /script-src 'self' 'inline-speculation-rules' https:\/\/challenges\.cloudflare\.com https:\/\/static\.cloudflareinsights\.com;.*connect-src 'self' https:\/\/api\.brtradingpost\.co\.uk https:\/\/cloudflareinsights\.com;/);
  assert.ok(!csp({ siteUrl: 'http://localhost:8080/', apiUrl: 'http://localhost:8080/__api/' }).includes('cloudflareinsights'));
});

test('Turnstile is allowed as a script and a frame, and nothing else from Cloudflare’s challenge site', () => {
  const policy = csp({ siteUrl: 'http://localhost:8080/', apiUrl: 'http://localhost:8080/__api/' });
  assert.match(policy, /script-src 'self' 'inline-speculation-rules' https:\/\/challenges\.cloudflare\.com;/);
  assert.match(policy, /frame-src https:\/\/challenges\.cloudflare\.com;/);
  assert.match(policy, /form-action 'none'/);
  assert.equal(policy.match(/challenges\.cloudflare\.com/g).length, 2);
});

test('local builds use Turnstile’s test key, and the live site only uses a real one', () => {
  assert.equal(turnstileKey('http://localhost:8080/'), TURNSTILE_TEST_KEY);
  assert.equal(turnstileKey('https://brtradingpost.co.uk/'), isSet(SITE.turnstileSiteKey) ? SITE.turnstileSiteKey : TURNSTILE_TEST_KEY);
});

const ctx = { siteUrl: 'https://brtradingpost.co.uk/', apiUrl: 'https://api.brtradingpost.co.uk/', now: new Date('2026-10-24T00:00:00Z'), items: [], promotions: [] };

test('the newsletter page has a labelled sign-up form with a hidden honeypot', async () => {
  const page = await newsletterPage(ctx);
  assert.equal(page.indexable, true);
  assert.equal(page.script, 'newsletter');
  assert.match(page.body, /<form class="signup" data-newsletter data-sitekey="[^"]+" novalidate>/);
  assert.match(page.body, /<label class="signup__label" for="signup-email">Email address<\/label>/);
  assert.match(page.body, /<input class="signup__input" id="signup-email" name="email" type="email" autocomplete="email"/);
  assert.match(page.body, /<div hidden>\s*<label for="signup-website">/);
  assert.match(page.body, /href="privacy\/#newsletter"/);
  assert.doesNotMatch(page.body, /action=/);
});

test('the confirm and unsubscribe pages are kept out of search engines', async () => {
  for (const page of [await newsletterConfirmPage(ctx), await newsletterUnsubscribePage(ctx)]) {
    assert.equal(page.indexable, false);
    assert.equal(page.robots, 'noindex, follow');
    assert.equal(page.script, 'newsletter');
    assert.match(page.body, /data-token-action="(confirm|unsubscribe)"/);
    assert.match(page.body, /<button class="btn btn--primary btn--lg" type="button" data-go>/);
  }
});

test('the home page has its own sign-up form', async () => {
  const page = await homePage(ctx);
  assert.match(page.body, /id="home-signup-email"/);
  assert.match(page.body, /Never miss an offer/);
  assert.doesNotMatch(page.body, /Monday/);
});

test('sitemaps list pages, dates and images', () => {
  const xml = sitemapXml('https://brtradingpost.co.uk/', [{ path: 'index.html', lastmod: '2026-10-21T10:00:00Z' }, { path: 'item/x/', lastmod: '2026-10-20', images: ['https://api.example/v1/img/a-l'] }]);
  assert.match(xml, /<loc>https:\/\/brtradingpost\.co\.uk\/<\/loc>/);
  assert.match(xml, /<lastmod>2026-10-21<\/lastmod>/);
  assert.match(xml, /<image:loc>https:\/\/api\.example\/v1\/img\/a-l<\/image:loc>/);
});
