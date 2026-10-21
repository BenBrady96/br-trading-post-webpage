import { el, icon } from './dom.js';

export function toast(message, { iconId = 'i-check', timeout = 3200 } = {}) {
  const region = document.getElementById('toasts');
  if (!region) return;
  region.replaceChildren();
  const node = el('div', { class: 'toast', role: 'status' }, icon(iconId), el('span', { text: message }));
  region.append(node);
  setTimeout(() => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 260);
  }, timeout);
}
