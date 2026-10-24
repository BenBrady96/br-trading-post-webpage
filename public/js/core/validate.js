const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^ebay-[A-Za-z0-9]{1,40}$/;
const LINK_TYPES = new Set(['tiktok', 'instagram', 'facebook', 'ebay', 'website']);
const MARKET_HOSTS = { ebay: /(^|\.)ebay\.(co\.uk|com)$/ };

export const text = (value, max) => (typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '');

export const iso = (value) => (typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null);

export function safeUrl(value, { allowHttp = false, host } = {}) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) return null;
    if (url.username || url.password) return null;
    if (host && !host.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function cleanImage(raw, opts) {
  if (!raw || typeof raw !== 'object') return null;
  const small = safeUrl(raw.small, opts);
  const large = safeUrl(raw.large, opts) || small;
  return small ? { small, large } : null;
}

export function cleanItem(raw, { allowHttp = false, categories = null, fallback = 'other-tcg' } = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id, 48);
  const source = raw.source === 'ebay' ? raw.source : null;
  const slug = text(raw.slug, 120);
  const title = text(raw.title, 200);
  const price = Number(raw.price);
  const url = source ? safeUrl(raw.url, { host: MARKET_HOSTS[source] }) : null;
  if (!ID.test(id) || !source || !id.startsWith(`${source}-`) || !SLUG.test(slug) || !title || !Number.isFinite(price) || price < 0 || !url) return null;
  const opts = { allowHttp };
  const category = typeof raw.category === 'string' && SLUG.test(raw.category) && (!categories || categories.has(raw.category)) ? raw.category : fallback;
  return {
    id,
    source,
    slug,
    title,
    price: Math.round(price * 100) / 100,
    currency: /^[A-Z]{3}$/.test(raw.currency) ? raw.currency : 'GBP',
    status: raw.status === 'sold' ? 'sold' : 'available',
    category,
    condition: text(raw.condition, 60),
    conditionId: ['new', 'used', 'refurbished'].includes(raw.conditionId) ? raw.conditionId : '',
    url,
    images: (Array.isArray(raw.images) ? raw.images : []).map((img) => cleanImage(img, opts)).filter(Boolean).slice(0, 12),
    description: text(raw.description, 5000),
    specifics: (Array.isArray(raw.specifics) ? raw.specifics : [])
      .filter((pair) => Array.isArray(pair) && pair.length === 2)
      .map(([k, v]) => [text(k, 60), text(v, 160)])
      .filter(([k, v]) => k && v)
      .slice(0, 20),
    featured: raw.featured === true,
    listedAt: iso(raw.listedAt),
    addedAt: iso(raw.addedAt) || iso(raw.listedAt),
    soldAt: iso(raw.soldAt),
    updatedAt: iso(raw.updatedAt) || iso(raw.listedAt),
  };
}

export function cleanPromotion(raw, { allowHttp = false } = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id, 64);
  const title = text(raw.title, 120);
  const endsAt = iso(raw.endsAt);
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !title || !endsAt) return null;
  const buttonUrl = raw.button ? safeUrl(raw.button.url) : null;
  const buttonText = raw.button ? text(raw.button.text, 40) : '';
  return {
    id,
    title,
    description: text(raw.description, 1200),
    image: cleanImage(raw.image, { allowHttp }),
    imageAlt: text(raw.imageAlt, 160),
    startsAt: iso(raw.startsAt),
    endsAt,
    button: buttonUrl && buttonText ? { text: buttonText, url: buttonUrl } : null,
    links: (Array.isArray(raw.links) ? raw.links : [])
      .map((l) => {
        const url = l && LINK_TYPES.has(l.type) ? safeUrl(l.url) : null;
        return url ? { type: l.type, url, label: text(l.label, 40) } : null;
      })
      .filter(Boolean)
      .slice(0, 8),
  };
}

export function cleanShop(shop, opts) {
  const seen = new Set();
  const slugs = new Set();
  const items = [];
  let dropped = 0;
  for (const raw of Array.isArray(shop?.items) ? shop.items : []) {
    const item = cleanItem(raw, opts);
    if (!item || seen.has(item.id)) {
      dropped++;
      continue;
    }
    seen.add(item.id);
    if (slugs.has(item.slug)) item.slug = `${item.slug}-${item.id.split('-')[1].toLowerCase()}`;
    slugs.add(item.slug);
    items.push(item);
  }
  return { items, dropped, updated: iso(shop?.updated) };
}

export function cleanPromotions(data, opts) {
  const list = Array.isArray(data?.promotions) ? data.promotions : [];
  return { promotions: list.map((p) => cleanPromotion(p, opts)).filter(Boolean), updated: iso(data?.updated) };
}

export function promotionKey(p) {
  const source = [p.id, p.endsAt, p.startsAt || '', p.title, p.description, p.image?.small || '', p.imageAlt, JSON.stringify(p.button), JSON.stringify(p.links)].join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
