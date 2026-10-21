import { fetchShop } from '../core/api.js';
import { formatPrice } from '../core/format.js';
import { boot } from '../shared/app.js';
import { busy } from '../shared/busy.js';
import { el, icon, rootUrl } from '../shared/dom.js';
import { toast } from '../shared/toast.js';

boot();

const article = document.querySelector('[data-item]');
const main = article?.querySelector('[data-main]');

article?.querySelector('[data-gallery]')?.addEventListener('click', (event) => {
  const thumb = event.target.closest('[data-thumb]');
  if (!thumb || !main) return;
  main.removeAttribute('srcset');
  main.src = thumb.dataset.large;
  for (const other of article.querySelectorAll('[data-thumb]')) other.setAttribute('aria-pressed', String(other === thumb));
});

const share = article?.querySelector('[data-share]');
share?.addEventListener('click', () => busy(share, async () => {
  const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const title = share.dataset.shareTitle || document.title;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {}
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied');
  } catch {
    toast('Couldn’t copy the link', { iconId: 'i-close' });
  }
}, { createIcon: icon }));

function markSold(item) {
  article.classList.add('item--sold');
  article.dataset.status = 'sold';
  const status = article.querySelector('[data-status-text] span:last-child');
  if (status) status.textContent = 'Sold out';
  const buy = article.querySelector('a[data-busy-link]');
  if (buy) {
    const similar = el('a', { class: 'btn btn--primary btn--lg', href: new URL(`shop/${item.category}/`, rootUrl()).href }, icon('i-search'), 'See similar items');
    buy.replaceWith(similar);
  }
}

if (article) {
  const items = await fetchShop();
  const item = items?.find((candidate) => candidate.id === article.dataset.item);
  if (item) {
    const price = article.querySelector('[data-price]');
    if (price) price.textContent = formatPrice(item.price, item.currency);
    if (item.status === 'sold' && article.dataset.status !== 'sold') markSold(item);
  }
}
