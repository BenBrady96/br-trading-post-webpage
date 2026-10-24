import { cleanPromotions, cleanShop } from './validate.js';

const base = () => document.body.dataset.api;
const categories = () => new Set((document.body.dataset.categories || '').split(/\s+/).filter(Boolean));
const allowHttp = () => base()?.startsWith('http:') ?? false;

export async function getJson(path, { timeout = 6000 } = {}) {
  const apiBase = base();
  if (!apiBase) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(new URL(path, apiBase), { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchShop() {
  const data = await getJson('v1/shop');
  if (!data || !Array.isArray(data.items)) return null;
  return cleanShop(data, { allowHttp: allowHttp(), categories: categories() }).items;
}

export async function fetchPromotions() {
  const data = await getJson('v1/promotions');
  if (!data || !Array.isArray(data.promotions)) return null;
  return cleanPromotions(data, { allowHttp: allowHttp() }).promotions;
}
