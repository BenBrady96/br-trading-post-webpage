import { fetchShop } from '../core/api.js';
import { PROTECTION, itemDetails, itemSummary, paragraphs } from '../core/item.js';
import { SOURCES, categoryPath, isSold, itemPath, sortItems } from '../core/shop.js';
import { boot } from '../shared/app.js';
import { el, icon, rootUrl } from '../shared/dom.js';
import { buyNode, initItem } from '../shared/item.js';
import { cardNode, priceNodes } from '../shared/render.js';
import { reveal } from '../shared/reveal.js';

boot();

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const link = (path) => new URL(path, rootUrl()).href;
const notFound = document.querySelector('[data-notfound]');
const itemsPath = new URL('item/', rootUrl()).pathname;
const slug = location.pathname.startsWith(itemsPath) ? location.pathname.slice(itemsPath.length).replace(/\/$/, '') : '';

function crumbs(trail) {
  const all = [{ name: 'Home', href: link('./') }, ...trail];
  return el('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, el('ol', {}, ...all.map((c, i) => (i === all.length - 1
    ? el('li', {}, el('span', { 'aria-current': 'page', text: c.name }))
    : el('li', {}, el('a', { href: c.href, text: c.name }), icon('i-chevron', 'crumbs__sep'))))));
}

function gallery(item) {
  const images = item.images.slice(0, 8);
  const [main] = images;
  const sizes = main?.large && main.large !== main.small ? { srcset: `${main.small} 500w, ${main.large} 1000w`, sizes: '(min-width: 900px) 600px, 100vw' } : {};
  return el('div', { class: 'item__gallery', 'data-gallery': true },
    el('figure', { class: 'item__main' },
      main
        ? el('img', { class: 'item__img', 'data-main': true, src: main.large || main.small, ...sizes, width: '1000', height: '1000', alt: item.title, fetchpriority: 'high', decoding: 'async' })
        : el('span', { class: 'card__placeholder' }, icon('i-cards')),
      el('span', { class: 'sold-band', 'aria-hidden': 'true', text: 'Sold out' })),
    images.length > 1 ? el('ul', { class: 'item__thumbs' }, ...images.map((img, i) => el('li', {},
      el('button', { type: 'button', class: 'thumb', 'data-thumb': true, 'data-small': img.small, 'data-large': img.large || img.small, 'aria-label': `Photo ${i + 1} of ${images.length}`, 'aria-pressed': String(i === 0) },
        el('img', { src: img.small, width: '120', height: '120', alt: '', loading: 'lazy', decoding: 'async' }))))) : null);
}

function paragraph(text) {
  const p = el('p');
  text.split('\n').forEach((line, i) => {
    if (i) p.append(el('br'));
    p.append(line);
  });
  return p;
}

function itemView(item, items) {
  const names = JSON.parse(notFound.dataset.categoryNames || '{}');
  const category = names[item.category] ? item.category : 'other-tcg';
  const categoryName = names[category] || '';
  const sold = isSold(item);
  const source = SOURCES[item.source] || 'eBay';
  const description = paragraphs(item.description);
  const related = sortItems(items.filter((i) => i.category === item.category && i.id !== item.id)).slice(0, 4);
  const head = el('div', { class: 'wrap page-head page-head--tight' },
    crumbs([{ name: 'Shop', href: link('shop/') }, { name: categoryName, href: link(categoryPath(category)) }, { name: item.title }]));
  const article = el('article', { class: `wrap item${sold ? ' item--sold' : ''}`, 'data-item': item.id, 'data-status': sold ? 'sold' : 'available' },
    gallery(item),
    el('div', { class: 'item__info' },
      el('p', { class: 'item__meta' },
        el('span', { class: `badge badge--${item.source}` }, icon(`i-${item.source}`), source),
        el('a', { class: 'badge badge--plain', href: link(categoryPath(category)), text: categoryName })),
      el('h1', { class: 'item__title', text: item.title }),
      el('p', { class: 'item__price', 'data-price': true, hidden: sold }, ...(sold ? [] : priceNodes(item))),
      el('p', { class: 'item__status', 'data-status-text': true }, el('span', { class: 'dot', 'aria-hidden': 'true' }), el('span', { text: sold ? 'Sold out' : `In stock on ${source}` })),
      el('p', { class: 'item__summary', text: itemSummary(item) }),
      el('div', { class: 'item__buy' }, buyNode(item), el('button', { type: 'button', class: 'btn btn--ghost', 'data-share': true, 'data-share-title': item.title }, icon('i-share'), 'Share')),
      el('ul', { class: 'assurances' },
        el('li', {}, icon('i-shield'), el('span', { text: PROTECTION[item.source] || PROTECTION.ebay })),
        el('li', {}, icon('i-truck'), el('span', { text: `Delivery options and costs are shown on the ${source} listing` }))),
      el('section', { class: 'item__section', 'aria-labelledby': 'details-title' },
        el('h2', { class: 'item__heading', id: 'details-title', text: 'Details' }),
        el('dl', { class: 'specs' }, ...itemDetails(item, categoryName).map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: v }))))),
      description.length ? el('section', { class: 'item__section', 'aria-labelledby': 'desc-title' },
        el('h2', { class: 'item__heading', id: 'desc-title', text: 'Description' }),
        el('div', { class: 'prose prose--small' }, ...description.map(paragraph))) : null));
  const more = related.length ? el('section', { class: 'section', 'aria-labelledby': 'related-title' },
    el('div', { class: 'wrap' },
      el('div', { class: 'section__head' },
        el('h2', { class: 'section__title', id: 'related-title', text: `More ${categoryName}` }),
        el('a', { class: 'section__link', href: link(categoryPath(category)) }, 'See all', icon('i-arrow'))),
      el('ul', { class: 'grid', 'data-grid': true }, ...related.map((i) => cardNode(i))))) : null;
  return [head, article, more].filter(Boolean);
}

// A new item has no page until the next rebuild, so GitHub Pages serves this 404 page for its address. Show the item from the live shop instead.
async function showItem() {
  const html = document.documentElement;
  notFound.hidden = true;
  html.classList.add('is-leaving');
  const items = await fetchShop();
  html.classList.remove('is-leaving');
  const item = items?.find((candidate) => candidate.slug === slug);
  if (!item) {
    notFound.hidden = false;
    return;
  }
  const nodes = itemView(item, items);
  document.getElementById('main').replaceChildren(...nodes);
  document.title = `${item.title} | BR Trading Post`;
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', link(itemPath(item)));
  for (const nav of document.querySelectorAll('.topnav__link, .tabbar__item')) if (nav.href === link('shop/')) nav.setAttribute('aria-current', 'page');
  initItem(nodes[1]);
  reveal(document.querySelectorAll('#main .item__section, #main .section__head, #main .grid > .card'));
}

if (notFound && SLUG.test(slug)) await showItem();
