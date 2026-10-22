import assert from 'node:assert/strict';
import { test } from 'node:test';
import { counts, filterItems, homeShelves, matchesQuery, sortItems } from '../../public/js/core/shop.js';

const items = [
  { id: 'ebay-1', source: 'ebay', status: 'available', category: 'pokemon', price: 50, listedAt: '2026-10-01T00:00:00Z', title: 'Charizard ex 199/165' },
  { id: 'ebay-2', source: 'ebay', status: 'sold', category: 'pokemon', price: 500, listedAt: '2026-10-10T00:00:00Z', soldAt: '2026-10-15T00:00:00Z', title: 'Umbreon VMAX' },
  { id: 'ebay-3', source: 'ebay', status: 'available', category: 'custom-binders', price: 65, listedAt: '2026-10-05T00:00:00Z', title: 'Custom painted Pokémon binder' },
  { id: 'ebay-4', source: 'ebay', status: 'sold', category: 'one-piece', price: 20, listedAt: '2026-09-01T00:00:00Z', soldAt: '2026-10-18T00:00:00Z', title: 'Luffy OP05-119' },
];

test('sold items always come after available ones', () => {
  assert.deepEqual(sortItems(items).map((i) => i.id), ['ebay-3', 'ebay-1', 'ebay-4', 'ebay-2']);
});

test('price sorts keep sold items last', () => {
  assert.deepEqual(sortItems(items, 'price-asc').map((i) => i.id), ['ebay-1', 'ebay-3', 'ebay-4', 'ebay-2']);
  assert.deepEqual(sortItems(items, 'price-desc').map((i) => i.id), ['ebay-3', 'ebay-1', 'ebay-2', 'ebay-4']);
});

test('sortItems does not change the original list', () => {
  const copy = [...items];
  sortItems(items, 'price-desc');
  assert.deepEqual(items, copy);
});

test('filterItems by status and category', () => {
  assert.deepEqual(filterItems(items, { status: 'sold' }).map((i) => i.id), ['ebay-2', 'ebay-4']);
  assert.deepEqual(filterItems(items, { status: 'available', category: 'pokemon' }).map((i) => i.id), ['ebay-1']);
});

test('search ignores accents and matches word starts', () => {
  assert.equal(matchesQuery(items[2], 'pokemon bind'), true);
  assert.equal(matchesQuery(items[0], 'char 199'), true);
  assert.equal(matchesQuery(items[0], 'umbreon'), false);
  assert.equal(matchesQuery(items[0], ''), true);
  assert.deepEqual(filterItems(items, { q: 'op05' }).map((i) => i.id), ['ebay-4']);
});

test('counts', () => {
  assert.deepEqual(counts(items), { total: 4, available: 2, sold: 2 });
});

test('homeShelves features up to four available items and leaves them out of New in', () => {
  const list = [...items, { ...items[0], id: 'ebay-5', featured: true, listedAt: '2026-10-20T00:00:00Z' }, { ...items[1], id: 'ebay-6', featured: true }];
  const { featured, newIn } = homeShelves(list);
  assert.deepEqual(featured.map((i) => i.id), ['ebay-5']);
  assert.deepEqual(newIn.map((i) => i.id), ['ebay-3', 'ebay-1', 'ebay-4', 'ebay-2', 'ebay-6']);
});
