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

export async function postJson(path, body, { timeout = 25000 } = {}) {
  const apiBase = base();
  if (!apiBase) return { ok: false, error: 'offline' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(new URL(path, apiBase), {
      method: 'POST',
      signal: controller.signal,
      credentials: 'omit',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok === true) return { ok: true, error: null };
    return { ok: false, error: typeof data?.error === 'string' ? data.error : 'unavailable' };
  } catch {
    return { ok: false, error: 'offline' };
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
