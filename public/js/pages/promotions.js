import { fetchPromotions } from '../core/api.js';
import { boot } from '../shared/app.js';
import { startCountdowns, syncPromotions } from '../shared/live.js';
import { showChecking } from '../shared/loader.js';
import { setPromoDot } from '../shared/shell.js';

boot();

const list = document.querySelector('[data-promo-list]');
const empty = document.querySelector('[data-promo-empty]');

const refresh = () => {
  const live = list.querySelectorAll('[data-promo]:not(.is-ended)').length;
  empty.hidden = live > 0;
  setPromoDot(live > 0);
};

startCountdowns(list, { onEnd: refresh });

const done = showChecking(document.querySelector('[data-live-status]'), 'Checking for new promotions');
const promotions = await fetchPromotions();
done();

if (promotions) {
  syncPromotions(list, promotions, { level: 2 });
  refresh();
}
