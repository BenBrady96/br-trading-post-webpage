import { builtAt } from '../core/api.js';
import { endsText, formatPrice } from '../core/format.js';
import { SOURCES, isSold } from '../core/shop.js';
import { el, icon, rootUrl } from './dom.js';

const EXT = 'noopener noreferrer';
const LINK_LABELS = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', ebay: 'eBay', etsy: 'Etsy', website: 'Website' };

const isBuilt = (item) => (Date.parse(item.addedAt || '') || 0) <= builtAt();

export function itemHref(item) {
  return isBuilt(item) ? new URL(`item/${item.slug}/`, rootUrl()).href : item.url;
}

function imageNode(img, alt, sizes) {
  const attrs = { src: img.small, width: '500', height: '500', alt, loading: 'lazy', decoding: 'async' };
  if (img.large && img.large !== img.small) Object.assign(attrs, { srcset: `${img.small} 500w, ${img.large} 1000w`, sizes });
  return el('img', attrs);
}

export function cardNode(item, { level = 3 } = {}) {
  const sold = isSold(item);
  const img = item.images?.[0];
  const media = el('div', { class: 'card__media' },
    img ? imageNode(img, item.title, '(min-width: 1280px) 300px, (min-width: 900px) 23vw, 46vw') : el('span', { class: 'card__placeholder' }, icon('i-cards')),
    el('span', { class: 'sold-band', 'aria-hidden': 'true', text: 'Sold out' }));
  const external = !isBuilt(item);
  const link = el('a', { class: 'card__link', href: itemHref(item), rel: external ? EXT : null },
    media,
    el('div', { class: 'card__body' },
      el('p', { class: 'card__source' }, icon(`i-${item.source}`), el('span', { text: SOURCES[item.source] || '' })),
      el(`h${level}`, { class: 'card__title', text: item.title }),
      el('p', { class: 'card__foot' },
        el('span', { class: 'card__price', text: formatPrice(item.price, item.currency) }),
        el('span', { class: 'card__status', text: sold ? 'Sold out' : 'In stock' }))));
  return el('li', {
    class: `card${sold ? ' card--sold' : ''}`,
    'data-id': item.id,
    'data-source': item.source,
    'data-status': sold ? 'sold' : 'available',
    'data-category': item.category,
    'data-price': String(Number(item.price) || 0),
    'data-listed': item.listedAt || '',
    'data-sold': item.soldAt || '',
  }, link);
}

export function updateCard(node, item) {
  const sold = isSold(item);
  node.classList.toggle('card--sold', sold);
  node.dataset.status = sold ? 'sold' : 'available';
  node.dataset.price = String(Number(item.price) || 0);
  node.dataset.sold = item.soldAt || '';
  const price = node.querySelector('.card__price');
  const status = node.querySelector('.card__status');
  const title = node.querySelector('.card__title');
  if (price) price.textContent = formatPrice(item.price, item.currency);
  if (status) status.textContent = sold ? 'Sold out' : 'In stock';
  if (title && title.textContent !== item.title) title.textContent = item.title;
}

export function itemFromCard(node) {
  return {
    id: node.dataset.id,
    source: node.dataset.source,
    status: node.dataset.status,
    category: node.dataset.category,
    price: Number(node.dataset.price) || 0,
    listedAt: node.dataset.listed || null,
    soldAt: node.dataset.sold || null,
    title: node.querySelector('.card__title')?.textContent || '',
  };
}

export function promoNode(promo, { level = 2 } = {}) {
  const img = promo.image;
  const media = el('div', { class: 'promo__media' },
    img ? el('img', { src: img.small, width: '800', height: '600', alt: promo.imageAlt || promo.title, loading: 'lazy', decoding: 'async' }) : el('span', { class: 'promo__placeholder' }, icon('i-tag')));
  const paragraphs = String(promo.description || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const para = el('p');
    p.split('\n').forEach((line, i) => {
      if (i) para.append(el('br'));
      para.append(line);
    });
    return para;
  });
  const links = (promo.links || []).map((l) => el('a', { class: 'icon-btn icon-btn--soft', href: l.url, rel: EXT, 'aria-label': l.label || LINK_LABELS[l.type] || 'Link' }, icon(`i-${l.type === 'website' ? 'link' : l.type}`)));
  const button = promo.button ? el('a', { class: 'btn btn--primary', href: promo.button.url, rel: EXT }, promo.button.text, icon('i-external')) : null;
  const timer = el('p', { class: 'promo__timer', 'data-countdown': true, hidden: true }, icon('i-clock'), el('span'));
  return el('article', { class: 'promo', 'data-promo': promo.id, 'data-ends': promo.endsAt, 'data-starts': promo.startsAt || null },
    media,
    el('div', { class: 'promo__body' },
      timer,
      el(`h${level}`, { class: 'promo__title', text: promo.title }),
      el('p', { class: 'promo__ends' }, el('time', { datetime: promo.endsAt, text: endsText(promo.endsAt) })),
      paragraphs.length ? el('div', { class: 'promo__desc' }, ...paragraphs) : null,
      button || links.length ? el('div', { class: 'promo__links' }, button, links.length ? el('span', { class: 'promo__icons' }, ...links) : null) : null));
}
