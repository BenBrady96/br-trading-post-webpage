import { formatPrice } from '../core/format.js';
import { itemSummary } from '../core/item.js';
import { SOURCES, categoryPath, isSold } from '../core/shop.js';
import { busy } from './busy.js';
import { el, icon, rootUrl } from './dom.js';
import { toast } from './toast.js';

const EXT = { target: '_blank', rel: 'noopener noreferrer', 'aria-describedby': 'new-tab' };

export function buyNode(item) {
  if (isSold(item)) return el('a', { class: 'btn btn--primary btn--lg', href: new URL(categoryPath(item.category), rootUrl()).href }, icon('i-search'), 'See similar items');
  return el('a', { class: 'btn btn--primary btn--lg', href: item.url, ...EXT, 'data-busy-link': true, 'data-no-prerender': true }, icon(`i-${item.source}`), `Buy on ${SOURCES[item.source] || 'eBay'}`);
}

export function initItem(article) {
  const main = article.querySelector('[data-main]');
  article.querySelector('[data-gallery]')?.addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-thumb]');
    if (!thumb || !main) return;
    main.removeAttribute('srcset');
    main.src = thumb.dataset.large;
    for (const other of article.querySelectorAll('[data-thumb]')) other.setAttribute('aria-pressed', String(other === thumb));
  });

  const share = article.querySelector('[data-share]');
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
}

export function showLive(article, item) {
  const sold = isSold(item);
  article.classList.toggle('item--sold', sold);
  article.dataset.status = sold ? 'sold' : 'available';
  const price = article.querySelector('[data-price]');
  if (price) {
    price.textContent = sold ? '' : formatPrice(item.price, item.currency);
    price.hidden = sold;
  }
  const status = article.querySelector('[data-status-text] span:last-child');
  if (status) status.textContent = sold ? 'Sold out' : `In stock on ${SOURCES[item.source] || 'eBay'}`;
  const summary = article.querySelector('.item__summary');
  if (summary) summary.textContent = itemSummary(item);
  const buy = article.querySelector('.item__buy > a');
  const next = buyNode(item);
  if (buy && buy.href !== next.href) buy.replaceWith(next);
}
