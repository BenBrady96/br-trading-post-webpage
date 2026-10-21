import { countdown, endsText, isLive } from '../core/format.js';
import { promotionKey } from '../core/validate.js';
import { cardNode, promoNode, updateCard } from './render.js';
import { reveal } from './reveal.js';

export function syncGrid(grid, items, { level = 3 } = {}) {
  const existing = new Map([...grid.querySelectorAll(':scope > .card')].map((node) => [node.dataset.id, node]));
  const nodes = items.map((item) => {
    const node = existing.get(item.id);
    if (!node) return cardNode(item, { level });
    updateCard(node, item);
    existing.delete(item.id);
    return node;
  });
  const added = nodes.filter((node) => !node.isConnected);
  for (const stale of existing.values()) stale.remove();
  grid.append(...nodes);
  reveal(added);
  return added.length;
}

export function syncPromotions(list, promotions, { level = 2, now = new Date() } = {}) {
  const live = promotions.filter((p) => isLive(p, now));
  const existing = new Map([...list.querySelectorAll(':scope > [data-promo]')].map((node) => [node.dataset.promo, node]));
  const nodes = live.map((promo) => {
    const node = existing.get(promo.id);
    if (node && node.dataset.key === promotionKey(promo)) {
      existing.delete(promo.id);
      return node;
    }
    const fresh = promoNode(promo, { level });
    fresh.dataset.key = promotionKey(promo);
    return fresh;
  });
  const added = nodes.filter((node) => !node.isConnected);
  for (const stale of existing.values()) stale.remove();
  list.append(...nodes);
  reveal(added);
  return live.length;
}

export function startCountdowns(list, { onEnd } = {}) {
  const tick = () => {
    const now = new Date();
    for (const promo of list.querySelectorAll('[data-promo]')) {
      if (promo.classList.contains('is-ended')) continue;
      const left = countdown(promo.dataset.ends, now);
      if (left.done) {
        promo.classList.add('is-ended');
        setTimeout(() => {
          promo.remove();
          onEnd?.();
        }, 1200);
        continue;
      }
      const timer = promo.querySelector('[data-countdown]');
      if (timer) {
        timer.hidden = false;
        timer.querySelector('span').textContent = `${left.text} left`;
      }
      const time = promo.querySelector('time');
      if (time) {
        const label = endsText(promo.dataset.ends, now);
        if (time.textContent !== label) time.textContent = label;
      }
    }
  };
  tick();
  return setInterval(tick, 1000);
}
