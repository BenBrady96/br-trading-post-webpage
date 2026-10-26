import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SITE, isSet } from '../../config/site.mjs';
import * as seo from '../../scripts/lib/seo.mjs';

const siteUrl = 'https://brtradingpost.co.uk/';

test('titles stay within 60 characters and end with the brand', () => {
  const title = seo.pageTitle('Charizard ex 199/165 Special Illustration Rare Pokémon 151 Near Mint Condition');
  assert.ok(title.length <= seo.TITLE_MAX, title);
  assert.ok(title.endsWith(' | BR Trading Post'));
  assert.equal(seo.pageTitle(SITE.name), 'BR Trading Post');
});

test('descriptions are clamped at a word boundary', () => {
  const text = seo.metaDescription('word '.repeat(80));
  assert.ok(text.length <= seo.DESCRIPTION_MAX);
  assert.ok(text.endsWith('…'));
});

test('the store only links to real profiles', () => {
  const store = seo.store(siteUrl);
  assert.equal(store['@type'], 'OnlineStore');
  for (const link of store.sameAs || []) assert.ok(isSet(link) && link.startsWith('https://'), link);
  assert.ok(!JSON.stringify(store).includes('TODO'));
});

test('product structured data has the fields Google needs', () => {
  const url = `${siteUrl}item/charizard/`;
  const product = seo.product(siteUrl, url, { id: 'ebay-1', title: 'Charizard', price: 12.5, currency: 'GBP', status: 'sold', conditionId: 'used', url: 'https://www.ebay.co.uk/itm/1', images: [{ small: 's', large: 'l' }], summary: 'x' }, { categoryName: 'Pokémon' });
  assert.equal(product.offers.price, '12.50');
  assert.equal(product.offers.priceCurrency, 'GBP');
  assert.equal(product.offers.availability, 'https://schema.org/SoldOut');
  assert.equal(product.offers.itemCondition, 'https://schema.org/UsedCondition');
  assert.deepEqual(product.image, ['l']);
  assert.equal(product.offers.priceSpecification, undefined);
});

test('a reduced item gives Google its old price as a strikethrough price, until it sells', () => {
  const url = `${siteUrl}item/charizard/`;
  const item = { id: 'ebay-1', title: 'Charizard', price: 15, wasPrice: 20, currency: 'GBP', status: 'available', url: 'https://www.ebay.co.uk/itm/1', images: [], summary: 'x' };
  assert.deepEqual(seo.product(siteUrl, url, item).offers.priceSpecification, { '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/StrikethroughPrice', price: '20.00', priceCurrency: 'GBP' });
  assert.equal(seo.product(siteUrl, url, { ...item, status: 'sold' }).offers.priceSpecification, undefined);
  assert.equal(seo.product(siteUrl, url, { ...item, wasPrice: null }).offers.priceSpecification, undefined);
});

test('breadcrumbs are numbered from Home', () => {
  const crumbs = seo.breadcrumbs(siteUrl, `${siteUrl}shop/`, [{ name: 'Shop', url: `${siteUrl}shop/` }]);
  assert.deepEqual(crumbs.itemListElement.map((c) => [c.position, c.name]), [[1, 'Home'], [2, 'Shop']]);
});
