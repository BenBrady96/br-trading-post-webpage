import { icon } from './dom.js';
import { initBusyLinks } from './busy.js';
import { initLoader } from './loader.js';
import { initPwa } from './pwa.js';
import { initReveal } from './reveal.js';
import { initShell } from './shell.js';
import { initTheme } from './theme.js';

export function boot() {
  initTheme();
  initShell();
  initLoader();
  initBusyLinks(icon);
  initReveal();
  initPwa();
}
