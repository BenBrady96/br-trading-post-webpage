const KEY = 'brtp:theme';
const ICONS = { auto: 'i-monitor', light: 'i-sun', dark: 'i-moon' };
const COLOURS = { light: '#FFFFFF', dark: '#15100B' };
const html = document.documentElement;

export function getTheme() {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'auto';
  } catch {
    return 'auto';
  }
}

function paintMeta(theme) {
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach((meta, i) => {
    const media = meta.getAttribute('media') || '';
    const scheme = theme === 'auto' ? (media.includes('dark') ? 'dark' : 'light') : theme;
    meta.setAttribute('content', COLOURS[scheme] || COLOURS[i ? 'dark' : 'light']);
  });
}

export function applyTheme(theme = getTheme()) {
  if (theme === 'light' || theme === 'dark') html.dataset.theme = theme;
  else delete html.dataset.theme;
  paintMeta(theme);
  for (const button of document.querySelectorAll('[data-theme-choice]')) button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
  for (const use of document.querySelectorAll('[data-theme-icon] use')) use.setAttribute('href', `#${ICONS[theme]}`);
}

export function setTheme(theme) {
  try {
    if (theme === 'light' || theme === 'dark') localStorage.setItem(KEY, theme);
    else localStorage.removeItem(KEY);
  } catch {}
  applyTheme(theme);
}

export function initTheme() {
  applyTheme();
  document.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-theme-choice]');
    if (!choice) return;
    setTheme(choice.dataset.themeChoice);
    const pop = choice.closest('[popover]');
    if (pop?.matches(':popover-open')) pop.hidePopover();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === KEY) applyTheme();
  });
}
