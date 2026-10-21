const SELECTOR = [
  '.section__head',
  '.grid > .card',
  '.promo',
  '.steps > li',
  '.section__foot',
  '.markets-row',
  '.story',
  '.panel',
  '.empty',
  '.prose > h2',
  '.prose > p',
  '.prose > ul',
  '.item__section',
  '.split__aside',
].join(', ');

const STAGGER_MS = 80;
const STAGGER_MAX = 6;

let observer = null;

function returningVisit() {
  if (location.hash) return true;
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  return nav?.type === 'back_forward';
}

function onIntersect(entries) {
  const shown = entries.filter((entry) => entry.isIntersecting);
  shown.forEach((entry, i) => {
    entry.target.style.setProperty('--reveal-delay', `${Math.min(i, STAGGER_MAX - 1) * STAGGER_MS}ms`);
    entry.target.classList.add('is-in');
    observer.unobserve(entry.target);
  });
}

export function reveal(nodes) {
  if (!observer) return;
  const fold = window.innerHeight * 0.92;
  for (const node of nodes) {
    if (node.classList.contains('reveal') || node.getBoundingClientRect().top < fold) continue;
    node.classList.add('reveal');
    observer.observe(node);
  }
}

export function initReveal() {
  if (returningVisit() || !('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(onIntersect, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  reveal(document.querySelectorAll(SELECTOR));
}
