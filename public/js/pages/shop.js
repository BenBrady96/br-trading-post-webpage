import { fetchShop } from '../core/api.js';
import { filterItems, sortItems } from '../core/shop.js';
import { boot } from '../shared/app.js';
import { syncGrid } from '../shared/live.js';
import { showChecking } from '../shared/loader.js';
import { itemFromCard } from '../shared/render.js';

boot();

const toolbar = document.querySelector('[data-toolbar]');
const grid = document.querySelector('[data-grid]');
const search = document.querySelector('[data-search]');
const sortSelect = document.querySelector('[data-sort]');
const results = document.querySelector('[data-results]');
const noResults = document.querySelector('[data-no-results]');
const emptyStock = document.querySelector('.empty--stock');
const category = toolbar?.dataset.category || '';

const params = new URLSearchParams(location.search);
const state = {
  q: params.get('q') || '',
  status: ['available', 'sold'].includes(params.get('status')) ? params.get('status') : 'all',
  source: ['ebay', 'etsy'].includes(params.get('source')) ? params.get('source') : 'all',
  sort: ['price-asc', 'price-desc'].includes(params.get('sort')) ? params.get('sort') : 'newest',
};

let items = [...grid.querySelectorAll(':scope > .card')].map(itemFromCard);

function saveState() {
  const next = new URLSearchParams();
  if (state.q) next.set('q', state.q);
  if (state.status !== 'all') next.set('status', state.status);
  if (state.source !== 'all') next.set('source', state.source);
  if (state.sort !== 'newest') next.set('sort', state.sort);
  const query = next.toString();
  history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
}

function paintControls({ withSearch = false } = {}) {
  if (withSearch) search.value = state.q;
  sortSelect.value = state.sort;
  for (const button of toolbar.querySelectorAll('[data-filter]')) {
    button.setAttribute('aria-pressed', String(state[button.dataset.filter] === button.dataset.value));
  }
}

function apply() {
  const shown = sortItems(filterItems(items, state), state.sort);
  const ids = new Set(shown.map((item) => item.id));
  const nodes = new Map([...grid.querySelectorAll(':scope > .card')].map((node) => [node.dataset.id, node]));
  for (const node of nodes.values()) node.hidden = !ids.has(node.dataset.id);
  grid.append(...shown.map((item) => nodes.get(item.id)).filter(Boolean));
  const available = shown.filter((item) => item.status !== 'sold').length;
  const filtered = state.q || state.status !== 'all' || state.source !== 'all';
  results.textContent = items.length
    ? `${shown.length} ${shown.length === 1 ? 'item' : 'items'}${filtered ? ` of ${items.length}` : ''}, ${available} in stock`
    : 'No items yet';
  noResults.hidden = !(items.length && !shown.length);
  if (emptyStock) emptyStock.hidden = items.length > 0;
}

let typing;
const readSearch = () => {
  clearTimeout(typing);
  state.q = search.value.trim();
};
search.addEventListener('input', () => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    readSearch();
    saveState();
    apply();
  }, 120);
});
search.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') search.blur();
});

sortSelect.addEventListener('change', () => {
  readSearch();
  state.sort = sortSelect.value;
  saveState();
  apply();
});

toolbar.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  readSearch();
  state[button.dataset.filter] = button.dataset.value;
  paintControls();
  saveState();
  apply();
});

document.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
  clearTimeout(typing);
  Object.assign(state, { q: '', status: 'all', source: 'all' });
  paintControls({ withSearch: true });
  saveState();
  apply();
  search.focus();
});

paintControls({ withSearch: true });
apply();
if (location.hash === '#search') search.focus({ preventScroll: true });

const done = showChecking(document.querySelector('[data-live-status]'));
const live = await fetchShop();
done();

if (live && (live.length || !items.length)) {
  const scoped = category ? live.filter((item) => item.category === category) : live;
  syncGrid(grid, sortItems(scoped), { level: 2 });
  items = scoped;
  apply();
}
