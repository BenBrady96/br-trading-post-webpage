import { postJson } from '../core/api.js';
import { boot } from '../shared/app.js';
import { busy } from '../shared/busy.js';
import { icon } from '../shared/dom.js';
import { initNewsletter, showStatus } from '../shared/newsletter.js';

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9_-]{42}$/;

const MESSAGES = {
  confirm: {
    ok: 'You’re subscribed. We’ll let you know about our special promotions and offers.',
    expired: 'This link has expired or has been replaced by a newer one. Please sign up again.',
    'bad-token': 'This link isn’t complete. Please open it straight from our email.',
    'rate-limit': 'That’s a lot of tries. Please wait a minute and try again.',
    offline: 'We couldn’t reach our newsletter service. Check your connection and try again.',
    unavailable: 'That didn’t work just now. Please try again later.',
  },
  unsubscribe: {
    ok: 'You’ve been unsubscribed and your email address has been deleted. You won’t get any more emails from us.',
    'bad-token': 'This link isn’t complete. Please open it straight from our email.',
    'rate-limit': 'That’s a lot of tries. Please wait a minute and try again.',
    offline: 'We couldn’t reach our newsletter service. Check your connection and try again.',
    unavailable: 'That didn’t work just now. Please try again later.',
  },
};

boot();
initNewsletter();

function finish(panel, state) {
  for (const node of panel.querySelectorAll('[data-when]')) node.hidden = node.dataset.when !== state;
  if (state === 'ok') {
    panel.querySelector('[data-go]').hidden = true;
    panel.querySelector('[data-intro]').hidden = true;
    const status = panel.querySelector('[data-status]');
    status.tabIndex = -1;
    status.focus();
  }
}

const panel = document.querySelector('[data-token-action]');
if (panel) {
  const action = panel.dataset.tokenAction;
  const messages = MESSAGES[action];
  const status = panel.querySelector('[data-status]');
  const button = panel.querySelector('[data-go]');
  const token = location.hash.slice(1);
  if (location.hash) history.replaceState(history.state, '', `${location.pathname}${location.search}`);
  if (!TOKEN.test(token)) {
    button.hidden = true;
    showStatus(status, 'bad-token', messages);
    finish(panel, 'retry');
  } else {
    button.addEventListener('click', () => busy(button, async () => {
      const result = await postJson(`v1/newsletter/${action}`, { token });
      const key = result.ok ? 'ok' : result.error;
      showStatus(status, key, messages);
      if (result.ok) finish(panel, 'ok');
      else if (key === 'expired' || key === 'bad-token') finish(panel, 'retry');
    }, { createIcon: icon }));
  }
}
