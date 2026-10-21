import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanItem, cleanPromotion, cleanShop, promotionKey, safeUrl } from '../../public/js/core/validate.js';

const good = {
  id: 'ebay-205512340001',
  source: 'ebay',
  slug: 'charizard-ex',
  title: 'Charizard ex',
  price: 89.999,
  currency: 'GBP',
  status: 'available',
  category: 'pokemon',
  url: 'https://www.ebay.co.uk/itm/205512340001',
  images: [{ small: 'https://api.brtradingpost.co.uk/v1/img/a-s', large: 'https://api.brtradingpost.co.uk/v1/img/a-l' }],
  listedAt: '2026-10-01T00:00:00Z',
};
const categories = new Set(['pokemon', 'other-tcg']);

test('a good item is kept and tidied', () => {
  const item = cleanItem(good, { categories });
  assert.equal(item.price, 90);
  assert.equal(item.category, 'pokemon');
  assert.equal(item.listedAt, '2026-10-01T00:00:00.000Z');
  assert.equal(item.soldAt, null);
});

test('items with bad ids, slugs, prices or links are rejected', () => {
  for (const bad of [
    { id: 'ebay-1;drop' },
    { id: 'etsy-123' },
    { slug: '../../etc' },
    { slug: 'Has Spaces' },
    { price: -1 },
    { price: 'free' },
    { url: 'javascript:alert(1)' },
    { url: 'https://evil.example/itm/1' },
    { url: 'http://www.ebay.co.uk/itm/1' },
    { title: '' },
  ]) assert.equal(cleanItem({ ...good, ...bad }, { categories }), null, JSON.stringify(bad));
});

test('unknown categories fall back and unsafe image links are dropped', () => {
  const item = cleanItem({ ...good, category: '../admin', images: [{ small: 'javascript:alert(1)' }, { small: 'https://ok.example/a.jpg' }] }, { categories });
  assert.equal(item.category, 'other-tcg');
  assert.deepEqual(item.images, [{ small: 'https://ok.example/a.jpg', large: 'https://ok.example/a.jpg' }]);
});

test('text is stripped of control characters and capped', () => {
  const item = cleanItem({ ...good, title: `Card\u0000\u0007 ${'x'.repeat(300)}` }, { categories });
  assert.ok(!/[\u0000-\u0008]/.test(item.title));
  assert.equal(item.title.length, 200);
});

test('cleanShop drops duplicates and makes slugs unique', () => {
  const { items, dropped } = cleanShop({ items: [good, good, { ...good, id: 'ebay-205512340002', url: 'https://www.ebay.co.uk/itm/205512340002' }, { junk: true }] }, { categories });
  assert.equal(items.length, 2);
  assert.equal(dropped, 2);
  assert.notEqual(items[0].slug, items[1].slug);
});

test('promotions need an id, title and valid end date, and only keep safe links', () => {
  assert.equal(cleanPromotion({ id: 'x', title: 'Sale' }), null);
  const promo = cleanPromotion({
    id: 'sale-abc123',
    title: 'Sale',
    endsAt: '2026-10-31T20:00:00Z',
    button: { text: 'Go', url: 'javascript:alert(1)' },
    links: [{ type: 'tiktok', url: 'https://www.tiktok.com/@x' }, { type: 'evil', url: 'https://x.example' }, { type: 'website', url: 'data:text/html,hi' }],
  });
  assert.equal(promo.button, null);
  assert.deepEqual(promo.links, [{ type: 'tiktok', url: 'https://www.tiktok.com/@x', label: '' }]);
});

test('promotionKey changes when a promotion changes', () => {
  const a = cleanPromotion({ id: 'a', title: 'Sale', endsAt: '2026-10-31T20:00:00Z' });
  assert.equal(promotionKey(a), promotionKey({ ...a }));
  assert.notEqual(promotionKey(a), promotionKey({ ...a, title: 'Bigger sale' }));
});

test('safeUrl', () => {
  assert.equal(safeUrl('https://user:pw@example.com'), null);
  assert.equal(safeUrl('http://localhost:8080/x'), null);
  assert.equal(safeUrl('http://localhost:8080/x', { allowHttp: true }), 'http://localhost:8080/x');
});
