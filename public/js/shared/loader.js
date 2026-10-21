import { el, icon } from './dom.js';

const html = document.documentElement;

function isInternalNavigation(event, link) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target || link.hasAttribute('download') || link.origin !== location.origin) return false;
  const url = new URL(link.href);
  return !(url.pathname === location.pathname && url.search === location.search && url.hash);
}

export function initLoader() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (link && isInternalNavigation(event, link)) html.classList.add('is-leaving');
  });
  window.addEventListener('pagehide', () => html.classList.remove('is-leaving'));
}

export function showChecking(target, text = 'Checking for new stock') {
  if (!target) return () => {};
  target.replaceChildren(icon('i-cog', 'cog'), el('span', { text }));
  return () => target.replaceChildren();
}
