const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isBusy = (control) => control?.getAttribute('aria-busy') === 'true';

function lock(control, createIcon) {
  const use = control.querySelector('svg use');
  const state = { use, href: use?.getAttribute('href') ?? null, added: null, minWidth: control.style.minWidth };
  const width = control.getBoundingClientRect?.().width;
  if (width) control.style.minWidth = `${Math.ceil(width)}px`;
  control.setAttribute('aria-busy', 'true');
  if (control.tagName === 'BUTTON') control.disabled = true;
  else control.setAttribute('aria-disabled', 'true');
  if (use) use.setAttribute('href', '#i-cog');
  else if (createIcon) {
    state.added = createIcon('i-cog');
    control.prepend(state.added);
  }
  return state;
}

function unlock(control, state) {
  control.removeAttribute('aria-busy');
  if (control.tagName === 'BUTTON') control.disabled = false;
  else control.removeAttribute('aria-disabled');
  if (state.use && state.href) state.use.setAttribute('href', state.href);
  state.added?.remove();
  control.style.minWidth = state.minWidth;
}

export async function busy(control, task, { minimum = 450, createIcon } = {}) {
  if (!control || isBusy(control)) return undefined;
  const state = lock(control, createIcon);
  const started = Date.now();
  try {
    return await task();
  } finally {
    const wait = minimum - (Date.now() - started);
    if (wait > 0) await sleep(wait);
    unlock(control, state);
  }
}

export function initBusyLinks(createIcon) {
  const locked = new Set();
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-busy-link]');
    if (!link) return;
    if (isBusy(link)) {
      event.preventDefault();
      return;
    }
    const state = lock(link, createIcon);
    locked.add([link, state]);
    const newTab = link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1;
    if (newTab) {
      setTimeout(() => {
        unlock(link, state);
        locked.forEach((entry) => entry[0] === link && locked.delete(entry));
      }, 1500);
    }
  });
  window.addEventListener('pageshow', () => {
    for (const [link, state] of locked) unlock(link, state);
    locked.clear();
  });
}
