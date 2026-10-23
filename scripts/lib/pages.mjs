import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CATEGORIES, SITE, isSet } from '../../config/site.mjs';
import { endsText, formatPrice, isLive, longDate } from '../../public/js/core/format.js';
import { SOURCES, counts, homeShelves, isSold, sortItems } from '../../public/js/core/shop.js';
import { promotionKey } from '../../public/js/core/validate.js';
import { escapeHtml as esc, fill, jsonScript, prefixUrls } from './html.mjs';
import * as seo from './seo.mjs';
import { TEMPLATES } from './util.mjs';

const templates = new Map();
async function template(name) {
  if (!templates.has(name)) templates.set(name, await readFile(join(TEMPLATES, name), 'utf8'));
  return templates.get(name);
}
export const clearTemplates = () => templates.clear();

export const CATEGORY = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const categoryName = (id) => CATEGORY[id]?.name ?? CATEGORY['other-tcg'].name;

const NOUNS = { pokemon: 'Pokémon card', 'one-piece': 'One Piece card', lorcana: 'Disney Lorcana card', 'yu-gi-oh': 'Yu-Gi-Oh! card', 'other-tcg': 'trading card', 'custom-binders': 'custom binder' };
const PROTECTION = { ebay: 'Price includes eBay’s Buyer Protection, with secure checkout on eBay' };
const EXT = 'target="_blank" rel="noopener noreferrer" aria-describedby="new-tab"';
const icon = (id, cls) => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#${id}"/></svg>`;

const SOCIALS = [['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['facebook', 'Facebook']];
const MARKETS = [['ebay', 'eBay']];
export const socialLinks = () => SOCIALS.filter(([id]) => isSet(SITE.socials[id])).map(([id, name]) => ({ id, name, url: SITE.socials[id] }));
export const marketLinks = () => MARKETS.filter(([id]) => isSet(SITE.marketplaces[id])).map(([id, name]) => ({ id, name, url: SITE.marketplaces[id] }));

export const analyticsOn = (siteUrl) => isSet(SITE.analyticsToken) && siteUrl.startsWith('https:');

export function csp({ siteUrl, apiUrl }) {
  const api = new URL(apiUrl).origin;
  const analytics = analyticsOn(siteUrl);
  const parts = [
    "default-src 'self'",
    `script-src 'self' 'inline-speculation-rules'${analytics ? ' https://static.cloudflareinsights.com' : ''}`,
    "style-src 'self'",
    `img-src 'self' data: ${api} https://i.ebayimg.com`,
    "font-src 'self'",
    `connect-src 'self' ${api}${analytics ? ' https://cloudflareinsights.com' : ''}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "require-trusted-types-for 'script'",
  ];
  if (siteUrl.startsWith('https:')) parts.push('upgrade-insecure-requests');
  return `${parts.join('; ')};`;
}

const NAV = [
  { id: 'home', label: 'Home', href: './', icon: 'i-home' },
  { id: 'shop', label: 'Shop', href: 'shop/', icon: 'i-bag' },
  { id: 'promotions', label: 'Promotions', href: 'promotions/', icon: 'i-tag' },
  { id: 'about', label: 'About', href: 'about/', icon: 'i-info' },
  { id: 'contact', label: 'Contact', href: 'contact/', icon: 'i-mail' },
];

const current = (on) => (on ? ' aria-current="page"' : '');

function topnav(active) {
  return NAV.filter((n) => n.id !== 'home')
    .map((n) => `      <a class="topnav__link" href="${n.href}"${current(active === n.id)}>${n.label}</a>`).join('\n');
}

function tabs(active, livePromotions) {
  return NAV.filter((n) => n.id !== 'contact').map((n) => {
    const dot = n.id === 'promotions' ? `<span class="tabbar__dot" data-promo-dot${livePromotions ? '' : ' hidden'}></span>` : '';
    return `  <a class="tabbar__item" href="${n.href}"${current(active === n.id)}>${icon(n.icon)}<span>${n.label}</span>${dot}</a>`;
  }).join('\n');
}

const marketButtons = () => marketLinks()
  .map((m) => `      <a class="btn btn--sm btn--outline desktop-only" href="${esc(m.url)}" ${EXT}>${icon(`i-${m.id}`)}<span class="sr-only">BR Trading Post on </span>${m.name}</a>`).join('\n');

function menuGroups() {
  const item = (href, iconId, label, external = false) => `        <a class="menu__item" href="${esc(href)}"${external ? ` ${EXT}` : ''}>${icon(iconId)}<span>${label}</span>${icon(external ? 'i-external' : 'i-chevron', 'menu__end')}</a>`;
  const group = (title, id, rows) => (rows.length ? `      <section class="menu__group" aria-labelledby="more-${id}">\n        <h3 class="menu__label" id="more-${id}">${title}</h3>\n${rows.join('\n')}\n      </section>` : '');
  return [
    group('Help', 'help', [item('contact/', 'i-mail', 'Contact us'), item('delivery-returns/', 'i-truck', 'Delivery &amp; returns')]),
    group('Shop on', 'shop', marketLinks().map((m) => item(m.url, `i-${m.id}`, m.name, true))),
    group('Follow us', 'follow', socialLinks().map((s) => item(s.url, `i-${s.id}`, s.name, true))),
    group('Legal', 'legal', [item('privacy/', 'i-shield', 'Privacy &amp; cookies'), item('terms/', 'i-doc', 'Terms of use'), item('accessibility/', 'i-access', 'Accessibility')]),
  ].filter(Boolean).join('\n');
}

function socialRow() {
  const links = socialLinks();
  if (!links.length) return '';
  return `      <ul class="social-icons">\n${links.map((s) => `        <li><a class="icon-btn icon-btn--soft" href="${esc(s.url)}" ${EXT} aria-label="BR Trading Post on ${s.name}">${icon(`i-${s.id}`)}</a></li>`).join('\n')}\n      </ul>`;
}

export function followHtml() {
  const links = socialLinks();
  const list = links.length ? links : marketLinks();
  if (!list.length) return '';
  return `<ul class="pill-links">\n${list.map((s) => `  <li><a class="btn btn--outline" href="${esc(s.url)}" ${EXT}>${icon(`i-${s.id}`)}${s.name}</a></li>`).join('\n')}\n</ul>`;
}

function addressLine() {
  const { street, locality, region, postcode } = SITE.address;
  if (![street, locality, postcode].every(isSet)) return '';
  return [street, locality, region, postcode].filter(isSet).join(', ');
}

function areaLine() {
  const { locality, region } = SITE.address;
  return isSet(locality) ? [locality, region].filter(isSet).join(', ') : '';
}

function basedIn() {
  const address = addressLine();
  if (address) return `based at ${address}`;
  const area = areaLine();
  return area ? `based near ${area}` : 'based in the UK';
}

export function controllerText() {
  if (isSet(SITE.owner)) return `BR Trading Post is a trading name of ${SITE.owner}, a sole trader ${basedIn()}.`;
  return `BR Trading Post is a sole trader business ${basedIn()}.`;
}

function footerBusiness() {
  return `    <p>${esc(controllerText())} Email <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>.</p>`;
}

function contactBusiness() {
  const address = addressLine();
  const area = areaLine();
  const rows = [
    ['Trading name', 'BR Trading Post'],
    isSet(SITE.owner) ? ['Owner', `${SITE.owner} (sole trader)`] : ['Business type', 'Sole trader'],
    address ? ['Address', address] : area ? ['Location', `Near ${area}`] : null,
    ['Email', `<a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>`],
  ].filter(Boolean);
  return `<section class="panel panel--wide" aria-labelledby="business-title">
  <h2 class="panel__title" id="business-title">Business details</h2>
  <dl class="specs">
${rows.map(([k, v]) => `    <div><dt>${k}</dt><dd>${k === 'Email' ? v : esc(v)}</dd></div>`).join('\n')}
  </dl>
</section>`;
}

export function crumbsHtml(trail) {
  const all = [{ name: 'Home', href: './' }, ...trail];
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${all.map((c, i) => (i === all.length - 1
    ? `<li><span aria-current="page">${esc(c.name)}</span></li>`
    : `<li><a href="${c.href}">${esc(c.name)}</a>${icon('i-chevron', 'crumbs__sep')}</li>`)).join('')}</ol></nav>`;
}

const imgSet = (img) => (img.large && img.large !== img.small ? `${esc(img.small)} 500w, ${esc(img.large)} 1000w` : '');

export function cardHtml(item, { level = 3, eager = false } = {}) {
  const sold = isSold(item);
  const img = item.images?.[0];
  const set = img ? imgSet(img) : '';
  const media = img
    ? `<img src="${esc(img.small)}"${set ? ` srcset="${set}" sizes="(min-width: 1280px) 300px, (min-width: 900px) 23vw, 46vw"` : ''} width="500" height="500" alt="${esc(item.title)}"${eager ? '' : ' loading="lazy"'} decoding="async">`
    : `<span class="card__placeholder">${icon('i-cards')}</span>`;
  return `<li class="card${sold ? ' card--sold' : ''}" data-id="${esc(item.id)}" data-source="${esc(item.source)}" data-status="${sold ? 'sold' : 'available'}" data-category="${esc(item.category)}" data-price="${Number(item.price) || 0}" data-listed="${esc(item.listedAt || '')}" data-sold="${esc(item.soldAt || '')}">
  <a class="card__link" href="item/${esc(item.slug)}/">
    <div class="card__media">${media}<span class="sold-band" aria-hidden="true">Sold out</span></div>
    <div class="card__body">
      <p class="card__source">${icon(`i-${item.source}`)}<span>${SOURCES[item.source] || ''}</span></p>
      <h${level} class="card__title">${esc(item.title)}</h${level}>
      <p class="card__foot"><span class="card__price">${esc(formatPrice(item.price, item.currency))}</span><span class="card__status">${sold ? 'Sold out' : 'In stock'}</span></p>
    </div>
  </a>
</li>`;
}

export const gridHtml = (items, opts) => `<ul class="grid" data-grid>\n${items.map((item, i) => cardHtml(item, { ...opts, eager: opts?.eagerFirst && i < 4 })).join('\n')}\n</ul>`;

function emptyStockHtml(level = 3) {
  return `<div class="empty empty--stock">
  ${icon('i-cards', 'empty__icon')}
  <h${level} class="empty__title">New stock is on its way</h${level}>
  <p>We’re getting our first items ready to list. Follow us to see them first.</p>
  ${followHtml()}
</div>`;
}

const LINK_TYPES = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', ebay: 'eBay', website: 'Website' };

export function promoHtml(promo, { level = 2, eager = false } = {}) {
  const img = promo.image;
  const media = img
    ? `<img src="${esc(img.small)}"${imgSet(img) ? ` srcset="${imgSet(img)}" sizes="(min-width: 900px) 420px, 100vw"` : ''} width="800" height="600" alt="${esc(promo.imageAlt || promo.title)}"${eager ? '' : ' loading="lazy"'} decoding="async">`
    : `<span class="promo__placeholder">${icon('i-tag')}</span>`;
  const paragraphs = String(promo.description || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const button = promo.button ? `<a class="btn btn--primary" href="${esc(promo.button.url)}" ${EXT}>${esc(promo.button.text)}${icon('i-external')}</a>` : '';
  const links = (promo.links || []).map((l) => `<a class="icon-btn icon-btn--soft" href="${esc(l.url)}" ${EXT} aria-label="${esc(l.label || LINK_TYPES[l.type] || 'Link')}">${icon(`i-${l.type === 'website' ? 'link' : l.type}`)}</a>`).join('');
  return `<article class="promo" data-promo="${esc(promo.id)}" data-key="${promotionKey(promo)}" data-ends="${esc(promo.endsAt)}"${promo.startsAt ? ` data-starts="${esc(promo.startsAt)}"` : ''}>
  <div class="promo__media">${media}</div>
  <div class="promo__body">
    <p class="promo__timer" data-countdown hidden>${icon('i-clock')}<span></span></p>
    <h${level} class="promo__title">${esc(promo.title)}</h${level}>
    <p class="promo__ends"><time datetime="${esc(promo.endsAt)}">${esc(endsText(promo.endsAt, new Date(), { relative: false }))}</time></p>
    ${paragraphs ? `<div class="promo__desc">${paragraphs}</div>` : ''}
    ${button || links ? `<div class="promo__links">${button}${links ? `<span class="promo__icons">${links}</span>` : ''}</div>` : ''}
  </div>
</article>`;
}

const LOGO_SIZES = { pokemon: [235, 120], 'one-piece': [360, 71], 'yu-gi-oh': [343, 120], magic: [357, 120], digimon: [360, 87] };
const LOGO_NAMES = { pokemon: 'Pokémon Trading Card Game', 'one-piece': 'One Piece', 'yu-gi-oh': 'Yu-Gi-Oh!', magic: 'Magic: The Gathering', digimon: 'Digimon' };

export function logoPlate(category, { extra = '', lazy = true } = {}) {
  const loading = lazy ? ' loading="lazy"' : '';
  let inner;
  if (category.logos?.length) {
    inner = category.logos.map((id) => {
      const [w, h] = LOGO_SIZES[id];
      return `<img src="img/games/${id}.webp" width="${w}" height="${h}" alt="${category.logos.length > 1 ? esc(LOGO_NAMES[id]) : ''}"${loading} decoding="async">`;
    }).join('');
  } else if (category.id === 'custom-binders') {
    inner = `<img class="logo-plate__mark" src="img/brand/mark-192.webp" width="96" height="96" alt=""${loading} decoding="async">`;
  } else {
    inner = `<span class="logo-plate__word" aria-hidden="true"><small>Disney</small>Lorcana</span>`;
  }
  const classes = ['logo-plate', category.logos?.length > 1 ? 'logo-plate--multi' : '', extra].filter(Boolean).join(' ');
  return `<span class="${classes}">${inner}</span>`;
}

function marketsHtml() {
  const links = MARKETS.map(([id, name]) => {
    const url = SITE.marketplaces[id];
    return isSet(url)
      ? `      <a class="btn btn--outline market-btn" href="${esc(url)}" ${EXT}>${icon(`i-${id}`, 'market-btn__logo')}<span><span class="sr-only">Visit our </span>${name}<span class="sr-only"> shop</span></span>${icon('i-external')}</a>`
      : `      <span class="market-btn market-btn--soon">${icon(`i-${id}`, 'market-btn__logo')}${name} coming soon</span>`;
  });
  return `    <div class="markets-row">\n      <p class="markets-row__label">Our shop</p>\n${links.join('\n')}\n    </div>`;
}

function fabHtml() {
  const links = socialLinks();
  if (!links.length) return '';
  return `<div class="fab">
  <button class="fab__btn" type="button" popovertarget="pop-follow">${icon('i-at', 'fab__icon')}${icon('i-close', 'fab__close')}<span class="fab__label">Follow us</span></button>
  <div class="pop fab__menu" id="pop-follow" popover>
    <p class="pop__label">Follow us</p>
${links.map((l) => `    <a class="pop__item" href="${esc(l.url)}" ${EXT}>${icon(`i-${l.id}`)}<span>${l.name}</span>${icon('i-external', 'pop__end')}</a>`).join('\n')}
  </div>
</div>`;
}

function heroMarkets() {
  const links = marketLinks();
  if (!links.length) return '';
  return `      <p class="hero__markets">Buy securely on ${links.map((m) => `<a href="${esc(m.url)}" ${EXT}>${icon(`i-${m.id}`)}<span class="sr-only">${m.name}</span></a>`).join(' ')}</p>`;
}

function specificsHtml(item) {
  const rows = [];
  if (item.condition) rows.push(['Condition', item.condition]);
  rows.push(['Category', categoryName(item.category)]);
  for (const [k, v] of item.specifics || []) if (k && v && rows.length < 14 && !/^condition$/i.test(k)) rows.push([k, v]);
  if (item.listedAt) rows.push(['Listed', longDate(item.listedAt)]);
  if (isSold(item) && item.soldAt) rows.push(['Sold', longDate(item.soldAt)]);
  return `<section class="item__section" aria-labelledby="details-title">
  <h2 class="item__heading" id="details-title">Details</h2>
  <dl class="specs">
${rows.map(([k, v]) => `    <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n')}
  </dl>
</section>`;
}

function descriptionHtml(item) {
  const paras = String(item.description || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!paras.length) return '';
  return `<section class="item__section" aria-labelledby="desc-title">
  <h2 class="item__heading" id="desc-title">Description</h2>
  <div class="prose prose--small">${paras.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>
</section>`;
}

export function itemSummary(item) {
  const noun = NOUNS[item.category] || 'trading card';
  const where = SOURCES[item.source] || 'eBay';
  const price = formatPrice(item.price, item.currency);
  const condition = item.condition ? `${item.condition} condition. ` : '';
  return isSold(item)
    ? `${condition}This item sold for ${price} on ${where}. BR Trading Post is a UK ${noun} shop, and we list new stock regularly.`
    : `${condition}${price} from BR Trading Post, a UK ${noun} shop, on ${where}.`;
}

function galleryHtml(item) {
  const images = item.images || [];
  const main = images[0];
  const mainImg = main
    ? `      <img class="item__img" data-main src="${esc(main.large || main.small)}"${imgSet(main) ? ` srcset="${imgSet(main)}" sizes="(min-width: 900px) 600px, 100vw"` : ''} width="1000" height="1000" alt="${esc(item.title)}" fetchpriority="high" decoding="async">`
    : `      <span class="card__placeholder">${icon('i-cards')}</span>`;
  const thumbs = images.length > 1
    ? `    <ul class="item__thumbs">\n${images.slice(0, 8).map((img, i) => `      <li><button type="button" class="thumb" data-thumb data-small="${esc(img.small)}" data-large="${esc(img.large || img.small)}" aria-label="Photo ${i + 1} of ${Math.min(images.length, 8)}"${i === 0 ? ' aria-pressed="true"' : ' aria-pressed="false"'}><img src="${esc(img.small)}" width="120" height="120" alt="" loading="lazy" decoding="async"></button></li>`).join('\n')}\n    </ul>`
    : '';
  return { mainImg, thumbs };
}

export function sectionGrid({ id, title, link, items, level = 3 }) {
  if (!items.length) return '';
  return `<section class="section" aria-labelledby="${id}">
  <div class="wrap">
    <div class="section__head">
      <h2 class="section__title" id="${id}">${esc(title)}</h2>
      ${link ? `<a class="section__link" href="${link.href}">${esc(link.label)}${icon('i-arrow')}</a>` : ''}
    </div>
    ${gridHtml(items, { level })}
  </div>
</section>`;
}

function analyticsTag(siteUrl) {
  if (!analyticsOn(siteUrl)) return '';
  return `  <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="${esc(JSON.stringify({ token: SITE.analyticsToken }))}"></script>`;
}

export async function renderPage(ctx, page) {
  const { siteUrl, apiUrl } = ctx;
  const absolute = page.path === '404.html';
  const dir = page.path.endsWith('/') ? page.path : page.path.split('/').slice(0, -1).join('/');
  const prefix = absolute ? siteUrl : '../'.repeat(dir.split('/').filter(Boolean).length);
  const canonical = `${siteUrl}${page.path === 'index.html' ? '' : page.path}`;
  const livePromotions = ctx.promotions.length > 0;
  const [layout, header, tabbar, more, footer, icons] = await Promise.all(['partials/layout.html', 'partials/header.html', 'partials/tabbar.html', 'partials/more.html', 'partials/footer.html', 'partials/icons.html'].map(template));
  const title = page.titleTag || seo.pageTitle(page.title);
  const description = seo.metaDescription(page.description);
  const html = fill(layout, {
    root: prefix || './',
    csp: csp({ siteUrl, apiUrl }),
    title,
    description,
    robots: page.robots || 'index, follow, max-image-preview:large',
    canonical,
    ogType: page.ogType || 'website',
    ogTitle: page.ogTitle || title,
    ogImage: page.ogImage || `${siteUrl}img/og-image.jpg`,
    ogImageAlt: page.ogImageAlt || 'The BR Trading Post shopfront, with Pokémon, Lorcana and One Piece cards in the windows',
    ogExtra: page.ogExtra || '',
    apiOrigin: new URL(apiUrl).origin,
    apiUrl,
    built: ctx.now.toISOString(),
    categoryIds: CATEGORIES.map((c) => c.id).join(' '),
    preload: page.preload || '',
    script: page.script || 'page',
    analytics: analyticsTag(siteUrl),
    jsonLd: jsonScript(page.jsonLd),
    page: page.id,
    icons,
    header: fill(header, { topnav: topnav(page.active), marketButtons: marketButtons() }),
    body: page.body,
    footer: fill(footer, {
      socialRow: socialRow(),
      shopLinks: [`        <li><a href="shop/">All items</a></li>`, ...CATEGORIES.map((c) => `        <li><a href="shop/${c.id}/">${esc(c.name)}</a></li>`)].join('\n'),
      business: footerBusiness(),
      year: String(ctx.now.getUTCFullYear()),
    }),
    tabbar: fill(tabbar, { tabs: tabs(page.active, livePromotions) }),
    fab: fabHtml(),
    more: fill(more, { groups: menuGroups() }),
  });
  return prefixUrls(html, prefix);
}

const common = (ctx) => [seo.store(ctx.siteUrl), seo.website(ctx.siteUrl)];

export async function homePage(ctx) {
  const { items, promotions, siteUrl } = ctx;
  const { featured, newIn } = homeShelves(items);
  const body = fill(await template('index.html'), {
    heroMarkets: heroMarkets(),
    promotionsHidden: promotions.length ? '' : ' hidden',
    promotions: promotions.slice(0, 3).map((p) => promoHtml(p, { level: 3 })).join('\n'),
    featured: sectionGrid({ id: 'featured-title', title: 'Featured', items: featured }),
    newIn: newIn.length ? gridHtml(newIn, { level: 3 }) : emptyStockHtml(3),
    markets: marketsHtml(),
  });
  return {
    id: 'home',
    path: 'index.html',
    title: SITE.name,
    ogTitle: 'BR Trading Post | Pokémon, One Piece & Lorcana Cards UK',
    description: 'UK trading card shop selling Pokémon, One Piece, Disney Lorcana and Yu-Gi-Oh! cards, other card games and custom painted binders on eBay.',
    script: 'home',
    active: 'home',
    body,
    preload: '',
    titleTag: 'BR Trading Post | Pokémon, One Piece & Lorcana Cards UK',
    jsonLd: seo.graph(...common(ctx), seo.webPage(siteUrl, siteUrl, { name: 'BR Trading Post', description: SITE.description })),
  };
}

const resultsText = (items) => {
  const c = counts(items);
  if (!c.total) return 'No items yet';
  return `${c.total} ${c.total === 1 ? 'item' : 'items'}, ${c.available} in stock`;
};

function chipsHtml(items, active) {
  const all = [{ id: '', name: 'All', href: 'shop/' }, ...CATEGORIES.map((c) => ({ id: c.id, name: c.name, href: `shop/${c.id}/` }))];
  return all.map((c) => {
    const n = c.id ? items.filter((i) => i.category === c.id).length : items.length;
    return `    <a class="chip" href="${c.href}"${current(active === c.id)}>${esc(c.name)}<span class="chip__count">${n}</span></a>`;
  }).join('\n');
}

export async function shopPage(ctx, category = null) {
  const { siteUrl } = ctx;
  const items = category ? ctx.items.filter((i) => i.category === category.id) : ctx.items;
  const sorted = sortItems(items);
  const path = category ? `shop/${category.id}/` : 'shop/';
  const url = `${siteUrl}${path}`;
  const trail = category ? [{ name: 'Shop', href: 'shop/', url: `${siteUrl}shop/` }, { name: category.name, url }] : [{ name: 'Shop', url }];
  const after = category ? `<section class="section section--soft" aria-labelledby="more-about">
  <div class="wrap prose-wrap">
    <h2 class="section__title" id="more-about">About our ${esc(category.heading)}</h2>
    <div class="prose">
${category.intro.slice(1).map((p) => `      <p>${esc(p)}</p>`).join('\n')}
      <h2>${esc(category.name)} questions</h2>
${category.faq.map(([q, a]) => `      <h3>${esc(q)}</h3>\n      <p>${esc(a)}</p>`).join('\n')}
    </div>
  </div>
</section>` : '';
  const body = fill(await template('shop.html'), {
    crumbs: crumbsHtml(trail),
    heading: category ? category.heading : 'Shop all',
    logo: category ? `  ${logoPlate(category, { extra: 'logo-plate--head', lazy: false })}` : '',
    categoryId: category?.id || '',
    lead: category ? `  <p class="page-lead">${esc(category.intro[0])}</p>` : '',
    chips: chipsHtml(ctx.items, category?.id || ''),
    searchPlaceholder: category ? `Search ${category.heading}` : 'Search cards, sets and binders',
    resultsText: resultsText(items),
    grid: sorted.length ? gridHtml(sorted, { level: 2, eagerFirst: true }) : `<ul class="grid" data-grid></ul>\n${emptyStockHtml(2)}`,
    after,
  });
  const name = category ? category.title : 'Shop Trading Cards & Custom Binders';
  const description = category
    ? `${category.blurb} Shop ${category.heading} from BR Trading Post, a UK card shop, with live stock from our eBay shop.`
    : 'Shop Pokémon, One Piece, Disney Lorcana and Yu-Gi-Oh! cards, other card games and custom painted binders, live from our eBay shop.';
  return {
    id: category ? 'category' : 'shop',
    path,
    title: name,
    description,
    script: 'shop',
    active: 'shop',
    body,
    robots: category && !items.length ? 'noindex, follow' : undefined,
    indexable: !category || items.length > 0,
    lastmod: items.map((i) => i.updatedAt).filter(Boolean).sort().at(-1),
    jsonLd: seo.graph(...common(ctx), seo.webPage(siteUrl, url, { type: 'CollectionPage', name, description, trail }), seo.breadcrumbs(siteUrl, url, trail), sorted.length ? seo.itemList(siteUrl, url, sorted) : null),
  };
}

export async function itemPage(ctx, item) {
  const { siteUrl } = ctx;
  const path = `item/${item.slug}/`;
  const url = `${siteUrl}${path}`;
  const sold = isSold(item);
  const category = CATEGORY[item.category] || CATEGORY['other-tcg'];
  const trail = [{ name: 'Shop', href: 'shop/', url: `${siteUrl}shop/` }, { name: category.name, href: `shop/${category.id}/`, url: `${siteUrl}shop/${category.id}/` }, { name: item.title, url }];
  const summary = itemSummary(item);
  const { mainImg, thumbs } = galleryHtml(item);
  const sourceName = SOURCES[item.source] || 'eBay';
  const buy = sold
    ? `      <a class="btn btn--primary btn--lg" href="shop/${category.id}/">${icon('i-search')}See similar items</a>`
    : `      <a class="btn btn--primary btn--lg" href="${esc(item.url)}" ${EXT} data-busy-link data-no-prerender>${icon(`i-${item.source}`)}Buy on ${sourceName}</a>`;
  const related = sortItems(ctx.items.filter((i) => i.category === item.category && i.id !== item.id)).slice(0, 4);
  const body = fill(await template('item.html'), {
    crumbs: crumbsHtml(trail),
    soldClass: sold ? ' item--sold' : '',
    id: item.id,
    status: sold ? 'sold' : 'available',
    mainImage: mainImg,
    thumbs,
    source: item.source,
    sourceName,
    category: category.id,
    categoryName: category.name,
    title: item.title,
    price: formatPrice(item.price, item.currency),
    statusText: sold ? 'Sold out' : `In stock on ${sourceName}`,
    summary,
    buy,
    protection: PROTECTION[item.source] || PROTECTION.ebay,
    specifics: specificsHtml(item),
    description: descriptionHtml(item),
    related: sectionGrid({ id: 'related-title', title: `More ${category.name}`, link: { href: `shop/${category.id}/`, label: 'See all' }, items: related }),
  });
  const image = item.images?.[0];
  const priceValue = (Number(item.price) || 0).toFixed(2);
  return {
    id: 'item',
    path,
    title: item.title,
    ogTitle: `${item.title} | ${formatPrice(item.price, item.currency)}${sold ? ' (sold)' : ''}`,
    description: `${item.title}. ${summary}`,
    script: 'item',
    active: 'shop',
    body,
    ogType: 'product',
    ogImage: image ? image.large || image.small : undefined,
    ogImageAlt: item.title,
    ogExtra: [
      `  <meta property="product:price:amount" content="${priceValue}">`,
      `  <meta property="product:price:currency" content="${esc(item.currency || 'GBP')}">`,
      `  <meta property="product:availability" content="${sold ? 'out of stock' : 'in stock'}">`,
    ].join('\n'),
    indexable: true,
    lastmod: item.updatedAt,
    images: (item.images || []).slice(0, 1).map((img) => img.large || img.small),
    jsonLd: seo.graph(...common(ctx), seo.webPage(siteUrl, url, { type: 'ItemPage', name: item.title, description: summary, trail, image: image ? image.large || image.small : undefined, modified: item.updatedAt }), seo.breadcrumbs(siteUrl, url, trail), seo.product(siteUrl, url, { ...item, summary }, { categoryName: category.name })),
  };
}

export async function promotionsPage(ctx) {
  const { siteUrl, promotions } = ctx;
  const url = `${siteUrl}promotions/`;
  const trail = [{ name: 'Promotions', url }];
  const body = fill(await template('promotions.html'), {
    crumbs: crumbsHtml(trail),
    promotions: promotions.map((p, i) => promoHtml(p, { level: 2, eager: i === 0 })).join('\n'),
    emptyHidden: promotions.length ? ' hidden' : '',
    follow: followHtml(),
  });
  const description = 'Offers, giveaways and events from BR Trading Post, the UK trading card and custom binder shop. See what’s on and when each promotion ends.';
  return {
    id: 'promotions',
    path: 'promotions/',
    title: 'Promotions & Offers',
    description,
    script: 'promotions',
    active: 'promotions',
    body,
    indexable: true,
    lastmod: ctx.promotionsUpdated,
    jsonLd: seo.graph(...common(ctx), seo.webPage(siteUrl, url, { name: 'Promotions', description, trail }), seo.breadcrumbs(siteUrl, url, trail)),
  };
}

async function docPage(ctx, { id, path, file, title, description, active, type = 'WebPage', crumb, values = {} }) {
  const { siteUrl } = ctx;
  const url = `${siteUrl}${path}`;
  const trail = [{ name: crumb, url }];
  const body = fill(await template(file), { crumbs: crumbsHtml(trail), email: SITE.email, controller: controllerText(), follow: followHtml(), ...values });
  return {
    id,
    path,
    title,
    description,
    script: 'page',
    active,
    body,
    indexable: true,
    templateFile: file,
    jsonLd: seo.graph(...common(ctx), seo.webPage(siteUrl, url, { type, name: crumb, description, trail }), seo.breadcrumbs(siteUrl, url, trail)),
  };
}

export const aboutPage = (ctx) => docPage(ctx, { id: 'about', path: 'about/', file: 'about.html', title: 'About Us', crumb: 'About us', type: 'AboutPage', active: 'about', description: 'BR Trading Post is a small UK shop selling Pokémon, One Piece, Disney Lorcana and Yu-Gi-Oh! cards and custom binders painted by hand.' });

export const contactPage = (ctx) => docPage(ctx, {
  id: 'contact', path: 'contact/', file: 'contact.html', title: 'Contact Us', crumb: 'Contact us', type: 'ContactPage', active: 'contact',
  description: 'Contact BR Trading Post by email or social media about an item, an order or a custom painted binder.',
  values: {
    marketLinks: marketLinks().length ? `<ul class="pill-links">\n${marketLinks().map((m) => `  <li><a class="btn btn--outline" href="${esc(m.url)}" ${EXT}>${icon(`i-${m.id}`)}${m.name}</a></li>`).join('\n')}\n</ul>` : '',
    business: contactBusiness(),
  },
});

export const deliveryPage = (ctx) => docPage(ctx, { id: 'delivery', path: 'delivery-returns/', file: 'delivery-returns.html', title: 'Delivery & Returns', crumb: 'Delivery & returns', active: 'more', description: 'How delivery, cancellations and returns work when you buy from BR Trading Post on eBay, and your rights under UK consumer law.' });
export const privacyPage = (ctx) => docPage(ctx, { id: 'privacy', path: 'privacy/', file: 'privacy.html', title: 'Privacy & Cookies', crumb: 'Privacy & cookies', active: 'more', description: 'How BR Trading Post handles your information. No cookies, no tracking and cookieless visitor statistics. Your rights under UK data protection law.' });
export const termsPage = (ctx) => docPage(ctx, { id: 'terms', path: 'terms/', file: 'terms.html', title: 'Terms of Use', crumb: 'Terms of use', active: 'more', description: 'The terms for using the BR Trading Post website. Purchases are made on eBay, and your consumer rights are not affected.' });
export const accessibilityPage = (ctx) => docPage(ctx, { id: 'accessibility', path: 'accessibility/', file: 'accessibility.html', title: 'Accessibility', crumb: 'Accessibility', active: 'more', description: 'How the BR Trading Post website meets WCAG 2.2 AA, its known limitations, and how to tell us about a problem.' });

export async function notFoundPage(ctx) {
  return {
    id: 'notfound',
    path: '404.html',
    title: 'Page Not Found',
    description: 'This page has moved or doesn’t exist. Visit the BR Trading Post shop for trading cards and custom painted binders.',
    script: 'page',
    active: '',
    robots: 'noindex, follow',
    indexable: false,
    body: await template('404.html'),
    jsonLd: seo.graph(seo.website(ctx.siteUrl)),
  };
}

export function sitemapXml(siteUrl, entries) {
  const imageNs = entries.some((e) => e.images?.length);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ''}>
${entries.map((e) => `  <url>
    <loc>${esc(`${siteUrl}${e.path === 'index.html' ? '' : e.path}`)}</loc>
${e.lastmod ? `    <lastmod>${esc(e.lastmod.slice(0, 10))}</lastmod>\n` : ''}${(e.images || []).map((src) => `    <image:image><image:loc>${esc(src)}</image:loc></image:image>\n`).join('')}  </url>`).join('\n')}
</urlset>
`;
}

export const robotsTxt = (siteUrl) => `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`;

export const livePromotions = (promotions, now) => promotions.filter((p) => isLive(p, now));
