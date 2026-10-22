import { SITE, isSet } from '../../config/site.mjs';

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;
const SUFFIX = ' | BR Trading Post';

export function clamp(text, max) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:!?-]+$/, '')}…`;
}

export const pageTitle = (base) => (base === SITE.name ? SITE.name : `${clamp(base, TITLE_MAX - SUFFIX.length)}${SUFFIX}`);

export const metaDescription = (text) => clamp(text, DESCRIPTION_MAX);

const orgId = (siteUrl) => `${siteUrl}#store`;
const siteId = (siteUrl) => `${siteUrl}#website`;

export function sameAs() {
  return [SITE.marketplaces.ebay, SITE.socials.tiktok, SITE.socials.instagram, SITE.socials.facebook].filter(isSet);
}

export function postalAddress() {
  const { street, locality, postcode, country } = SITE.address;
  if (![street, locality, postcode].every(isSet)) return undefined;
  return { '@type': 'PostalAddress', streetAddress: street, addressLocality: locality, postalCode: postcode, addressCountry: country };
}

export function store(siteUrl) {
  const node = {
    '@type': 'OnlineStore',
    '@id': orgId(siteUrl),
    name: SITE.name,
    alternateName: 'BR Trading Post UK',
    url: siteUrl,
    logo: { '@type': 'ImageObject', url: `${siteUrl}img/icons/icon-512.png`, width: 512, height: 512 },
    image: `${siteUrl}img/og-image.jpg`,
    description: SITE.description,
    email: SITE.email,
    foundingDate: SITE.founded,
    areaServed: { '@type': 'Country', name: 'United Kingdom' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', email: SITE.email, availableLanguage: 'en-GB' },
  };
  const links = sameAs();
  if (links.length) node.sameAs = links;
  const address = postalAddress();
  if (address) node.address = address;
  if (isSet(SITE.owner)) node.founder = { '@type': 'Person', name: SITE.owner };
  return node;
}

export function website(siteUrl) {
  return {
    '@type': 'WebSite',
    '@id': siteId(siteUrl),
    url: siteUrl,
    name: SITE.name,
    alternateName: 'BR Trading Post UK',
    description: SITE.description,
    inLanguage: 'en-GB',
    publisher: { '@id': orgId(siteUrl) },
  };
}

export function breadcrumbs(siteUrl, url, trail) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [{ name: 'Home', url: siteUrl }, ...trail].map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function webPage(siteUrl, url, { type = 'WebPage', name, description, trail, image, modified } = {}) {
  const node = {
    '@type': type,
    '@id': `${url}#page`,
    url,
    name,
    description,
    inLanguage: 'en-GB',
    isPartOf: { '@id': siteId(siteUrl) },
    about: { '@id': orgId(siteUrl) },
  };
  if (trail?.length) node.breadcrumb = { '@id': `${url}#breadcrumb` };
  if (image) node.primaryImageOfPage = { '@type': 'ImageObject', url: image };
  if (modified) node.dateModified = modified;
  return node;
}

export function itemList(siteUrl, url, items) {
  return {
    '@type': 'ItemList',
    '@id': `${url}#items`,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl}item/${item.slug}/`,
      name: item.title,
    })),
  };
}

const CONDITIONS = { new: 'https://schema.org/NewCondition', used: 'https://schema.org/UsedCondition', refurbished: 'https://schema.org/RefurbishedCondition' };

export function product(siteUrl, url, item, { categoryName } = {}) {
  const images = (item.images || []).map((img) => img.large || img.small).filter(Boolean);
  const offer = {
    '@type': 'Offer',
    url: item.url,
    price: Number(item.price).toFixed(2),
    priceCurrency: item.currency || 'GBP',
    availability: item.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    seller: { '@id': orgId(siteUrl) },
  };
  if (CONDITIONS[item.conditionId]) offer.itemCondition = CONDITIONS[item.conditionId];
  const node = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: item.title,
    url,
    sku: item.id,
    description: item.summary || item.title,
    category: categoryName,
    offers: offer,
  };
  if (images.length) node.image = images;
  if (CONDITIONS[item.conditionId]) node.itemCondition = CONDITIONS[item.conditionId];
  return node;
}

export const graph = (...nodes) => ({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });
