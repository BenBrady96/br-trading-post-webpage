import { formatPrice, longDate } from './format.js';
import { SOURCES, isSold } from './shop.js';

const NOUNS = { pokemon: 'Pokémon card', 'one-piece': 'One Piece card', lorcana: 'Disney Lorcana card', 'yu-gi-oh': 'Yu-Gi-Oh! card', 'other-tcg': 'trading card', 'custom-binders': 'custom binder' };

export const PROTECTION = { ebay: 'Price includes eBay’s Buyer Protection, with secure checkout on eBay' };

export function itemSummary(item) {
  const noun = NOUNS[item.category] || 'trading card';
  const where = SOURCES[item.source] || 'eBay';
  const condition = item.condition ? `${item.condition} condition. ` : '';
  return isSold(item)
    ? `${condition}This item has sold. BR Trading Post is a UK ${noun} shop, and we list new stock regularly.`
    : `${condition}${formatPrice(item.price, item.currency)} from BR Trading Post, a UK ${noun} shop, on ${where}.`;
}

export function itemDetails(item, categoryName) {
  const rows = [];
  if (item.condition) rows.push(['Condition', item.condition]);
  rows.push(['Category', categoryName]);
  for (const [k, v] of item.specifics || []) if (k && v && rows.length < 14 && !/^condition$/i.test(k)) rows.push([k, v]);
  if (item.listedAt) rows.push(['Listed', longDate(item.listedAt)]);
  if (item.soldAt) rows.push(['Last sold', longDate(item.soldAt)]);
  return rows;
}

export const paragraphs = (text) => String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
