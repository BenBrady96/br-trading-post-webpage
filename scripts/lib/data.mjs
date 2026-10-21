import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CATEGORIES, FALLBACK_CATEGORY } from '../../config/site.mjs';
import { cleanPromotions, cleanShop } from '../../public/js/core/validate.js';
import { download, LOCAL } from './util.mjs';

export const FIXTURE_ORIGIN = 'https://api.example/';

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

function cleanAll(shop, promos, { allowHttp = false } = {}) {
  const opts = { allowHttp, categories: CATEGORY_IDS, fallback: FALLBACK_CATEGORY };
  const cleanedShop = cleanShop(shop, opts);
  const cleanedPromos = cleanPromotions(promos, opts);
  if (cleanedShop.dropped) console.warn(`Warning: ${cleanedShop.dropped} item(s) from the API were invalid and left out.`);
  return {
    items: cleanedShop.items,
    promotions: cleanedPromos.promotions,
    shopUpdated: cleanedShop.updated,
    promotionsUpdated: cleanedPromos.updated,
  };
}

export async function loadData({ apiUrl, fixtures = false } = {}) {
  if (fixtures) {
    const dir = join(LOCAL, 'fixtures');
    const read = async (name) => {
      const raw = await readFile(join(dir, name), 'utf8').catch(() => null);
      return raw ? JSON.parse(raw.replaceAll(FIXTURE_ORIGIN, apiUrl)) : null;
    };
    const [shop, promos] = await Promise.all([read('shop.json'), read('promotions.json')]);
    if (!shop || !promos) throw new Error('Fixtures not found in scripts/local/fixtures/ (run npm run dev once)');
    return cleanAll(shop, promos, { allowHttp: true });
  }
  if (!apiUrl) {
    console.warn('Warning: API_URL is not set, so the site is built with no listings or promotions.');
    return cleanAll({ items: [] }, { promotions: [] });
  }
  const [shop, promos] = await Promise.all([download(`${apiUrl}v1/shop`), download(`${apiUrl}v1/promotions`)]);
  if (!Array.isArray(shop?.items) || !Array.isArray(promos?.promotions)) throw new Error(`${apiUrl}: unexpected response shape`);
  return cleanAll(shop, promos, { allowHttp: apiUrl.startsWith('http:') });
}
