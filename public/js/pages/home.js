import { fetchPromotions, fetchShop } from '../core/api.js';
import { isLive } from '../core/format.js';
import { homeShelves, sortItems } from '../core/shop.js';
import { boot } from '../shared/app.js';
import { el } from '../shared/dom.js';
import { startCountdowns, syncGrid, syncPromotions } from '../shared/live.js';
import { showChecking } from '../shared/loader.js';
import { setPromoDot } from '../shared/shell.js';

boot();

const newSection = document.getElementById('new-title')?.closest('section');
const featuredSection = document.getElementById('featured-title')?.closest('section');
const promoSection = document.querySelector('[data-home-promotions]');
const promoList = promoSection?.querySelector('[data-promo-list]');

const refreshPromoSection = () => {
  const live = promoList.querySelectorAll('[data-promo]:not(.is-ended)').length;
  promoSection.hidden = live === 0;
  setPromoDot(live > 0);
};

if (promoList) startCountdowns(promoList, { onEnd: refreshPromoSection });

const done = showChecking(newSection?.querySelector('[data-live-status]'));
const [items, promotions] = await Promise.all([fetchShop(), fetchPromotions()]);
done();

if (items?.length && newSection) {
  const { featured, newIn } = homeShelves(items);
  if (featuredSection) {
    syncGrid(featuredSection.querySelector('[data-grid]'), featured, { level: 3 });
    featuredSection.hidden = !featured.length;
  }
  let grid = newSection.querySelector('[data-grid]');
  if (!grid) {
    grid = el('ul', { class: 'grid', 'data-grid': true });
    newSection.querySelector('.empty--stock')?.replaceWith(grid);
  }
  syncGrid(grid, featuredSection ? newIn : sortItems(items).slice(0, 8), { level: 3 });
}

if (promotions && promoList) {
  syncPromotions(promoList, promotions.filter((p) => isLive(p)).slice(0, 3), { level: 3 });
  refreshPromoSection();
}
