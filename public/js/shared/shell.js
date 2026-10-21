import { reducedMotion } from './dom.js';

let historyArmed = false;
let skipNextPop = false;

function armHistory() {
  if (historyArmed) return;
  history.pushState({ sheet: true }, '');
  historyArmed = true;
}

function disarmHistory() {
  if (!historyArmed) return;
  historyArmed = false;
  skipNextPop = true;
  history.back();
}

const openDialogs = () => [...document.querySelectorAll('dialog[open]')];

function finishClose(dialog) {
  clearTimeout(dialog.closeTimer);
  dialog.classList.remove('is-closing');
  if (dialog.open) dialog.close();
}

export function closeDialog(dialog, { instant = false } = {}) {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  if (instant || reducedMotion()) {
    finishClose(dialog);
    return;
  }
  dialog.classList.add('is-closing');
  dialog.addEventListener('animationend', () => finishClose(dialog), { once: true });
  dialog.closeTimer = setTimeout(() => finishClose(dialog), 320);
}

export function openDialog(dialog) {
  if (dialog.open && !dialog.classList.contains('is-closing')) return;
  if (dialog.open) finishClose(dialog);
  dialog.showModal();
  armHistory();
}

function initDialogs() {
  window.addEventListener('popstate', () => {
    if (skipNextPop) {
      skipNextPop = false;
      return;
    }
    if (!historyArmed) return;
    historyArmed = false;
    const top = openDialogs().pop();
    if (top) {
      top.dataset.viaHistory = '1';
      closeDialog(top);
    }
  });
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeDialog(dialog);
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.closest('[data-close]')) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      const viaHistory = dialog.dataset.viaHistory === '1';
      delete dialog.dataset.viaHistory;
      setTimeout(() => {
        if (!viaHistory && !openDialogs().length) disarmHistory();
      });
    });
  }
}

function initMore() {
  const sheet = document.getElementById('more-sheet');
  if (!sheet) return;
  for (const button of document.querySelectorAll('[data-open-more]')) {
    button.addEventListener('click', () => openDialog(sheet));
  }
  sheet.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || link.target || !historyArmed || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      location.href = link.href;
    };
    historyArmed = false;
    skipNextPop = true;
    window.addEventListener('popstate', go, { once: true });
    setTimeout(go, 400);
    history.back();
  });
}

function invokerOf(pop) {
  return [...document.querySelectorAll(`[popovertarget="${pop.id}"]`)].find((b) => b.getClientRects().length);
}

function placePopover(pop) {
  const invoker = invokerOf(pop);
  if (!invoker) return;
  const rect = invoker.getBoundingClientRect();
  const viewport = document.documentElement.clientWidth;
  pop.style.top = `${Math.round(rect.bottom + 8)}px`;
  pop.style.right = `${Math.max(8, Math.round(viewport - rect.right))}px`;
}

function initPopovers() {
  for (const pop of document.querySelectorAll('.pop[popover]:not(.fab__menu)')) {
    pop.addEventListener('beforetoggle', (event) => {
      if (event.newState === 'open') placePopover(pop);
    });
  }
  window.addEventListener('resize', () => {
    for (const pop of document.querySelectorAll('.pop:popover-open')) pop.hidePopover();
  });
}

export function setPromoDot(live) {
  for (const dot of document.querySelectorAll('[data-promo-dot]')) dot.hidden = !live;
}

export function initShell() {
  initDialogs();
  initMore();
  initPopovers();
}
