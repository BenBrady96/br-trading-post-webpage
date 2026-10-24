import { fetchShop } from '../core/api.js';
import { boot } from '../shared/app.js';
import { initItem, showLive } from '../shared/item.js';

boot();

const article = document.querySelector('[data-item]');

if (article) {
  initItem(article);
  const items = await fetchShop();
  const item = items?.find((candidate) => candidate.id === article.dataset.item);
  if (item) showLive(article, item);
}
