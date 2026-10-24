export const SORTS = {
  newest: 'Newest',
  'price-asc': 'Price, low to high',
  'price-desc': 'Price, high to low',
};

export const SOURCES = { ebay: 'eBay' };

export const itemPath = (item) => `item/${item.slug}/`;
export const categoryPath = (id) => `shop/${id}/`;

const time = (value) => {
  const t = Date.parse(value ?? '');
  return Number.isFinite(t) ? t : 0;
};

export const isSold = (item) => item.status === 'sold';

export function sortItems(items, sort = 'newest') {
  const list = [...items];
  const byNewest = (a, b) => time(b.listedAt) - time(a.listedAt) || String(a.id).localeCompare(String(b.id));
  const bySold = (a, b) => time(b.soldAt) - time(a.soldAt) || byNewest(a, b);
  const byPrice = (dir) => (a, b) => dir * ((Number(a.price) || 0) - (Number(b.price) || 0)) || byNewest(a, b);
  const within = sort === 'price-asc' ? byPrice(1) : sort === 'price-desc' ? byPrice(-1) : byNewest;
  return list.sort((a, b) => {
    const sa = isSold(a);
    const sb = isSold(b);
    if (sa !== sb) return sa ? 1 : -1;
    return sa ? bySold(a, b) : within(a, b);
  });
}

const words = (text) => String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);

export function matchesQuery(item, query, categoryName = '') {
  const wanted = words(query);
  if (!wanted.length) return true;
  const have = words(`${item.title} ${categoryName} ${(item.specifics || []).flat().join(' ')}`);
  return wanted.every((w) => have.some((h) => h.startsWith(w)));
}

export function filterItems(items, { q = '', status = 'all', category = 'all', categoryNames = {} } = {}) {
  return items.filter((item) => (category === 'all' || item.category === category)
    && (status === 'all' || (status === 'sold' ? isSold(item) : !isSold(item)))
    && matchesQuery(item, q, categoryNames[item.category]));
}

export const counts = (items) => ({
  total: items.length,
  available: items.filter((i) => !isSold(i)).length,
  sold: items.filter(isSold).length,
});

export function homeShelves(items) {
  const sorted = sortItems(items);
  const featured = sorted.filter((i) => i.featured && !isSold(i)).slice(0, 4);
  const picked = new Set(featured.map((i) => i.id));
  return { featured, newIn: sorted.filter((i) => !picked.has(i.id)).slice(0, 8) };
}
