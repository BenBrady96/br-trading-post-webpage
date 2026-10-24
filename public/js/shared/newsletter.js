import { postJson } from '../core/api.js';
import { busy } from './busy.js';
import { icon } from './dom.js';

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WAIT_MS = 60000;

export const MESSAGES = {
  ok: 'Nearly there. Check your inbox and press the button in our email to confirm. If it isn’t there in a few minutes, look in your spam folder.',
  'invalid-email': 'Please enter your full email address, like name@example.com.',
  'bot-check': 'We couldn’t check that you’re a person. Please try again.',
  'rate-limit': 'That’s a lot of tries. Please wait a minute and try again.',
  busy: 'We’ve had a lot of sign-ups today. Please try again tomorrow.',
  offline: 'We couldn’t reach our sign-up service. Check your connection and try again.',
  unavailable: 'Sign-ups aren’t working right now. Please try again later.',
};

let policy = null;
let loading = null;

function scriptUrl() {
  if (!window.trustedTypes?.createPolicy) return SCRIPT;
  policy ??= window.trustedTypes.createPolicy('brtp-turnstile', { createScriptURL: (value) => (value === SCRIPT ? value : '') });
  return policy.createScriptURL(SCRIPT);
}

function loadTurnstile() {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl();
    script.async = true;
    script.addEventListener('load', () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not start'))));
    script.addEventListener('error', () => reject(new Error('Turnstile did not load')));
    document.head.append(script);
  }).catch((err) => {
    loading = null;
    throw err;
  });
  return loading;
}

function humanCheck(form) {
  const box = form.querySelector('[data-turnstile]');
  let id = null;
  let token = '';
  const waiting = [];
  const settle = (value) => {
    token = value;
    waiting.splice(0).forEach((resolve) => resolve(value));
  };
  const start = async () => {
    const turnstile = await loadTurnstile();
    id ??= turnstile.render(box, {
      sitekey: form.dataset.sitekey,
      action: 'newsletter',
      appearance: 'interaction-only',
      theme: document.documentElement.dataset.theme || 'auto',
      size: 'flexible',
      callback: settle,
      'expired-callback': () => {
        token = '';
      },
      'error-callback': () => settle(''),
    });
  };
  return {
    warm: () => start().catch(() => {}),
    async token() {
      try {
        await start();
      } catch {
        return '';
      }
      if (token) return token;
      return new Promise((resolve) => {
        waiting.push(resolve);
        setTimeout(() => resolve(''), WAIT_MS);
      });
    },
    reset() {
      token = '';
      if (id !== null) window.turnstile?.reset(id);
    },
  };
}

export function showStatus(node, key, messages = MESSAGES) {
  node.textContent = key ? messages[key] || messages.unavailable : '';
  node.dataset.state = key === 'ok' ? 'ok' : key ? 'error' : '';
}

async function submit(form, check) {
  const input = form.elements.email;
  const status = form.querySelector('[data-status]');
  const email = input.value.trim();
  if (email.length > 254 || !EMAIL.test(email)) {
    input.setAttribute('aria-invalid', 'true');
    showStatus(status, 'invalid-email');
    input.focus();
    return;
  }
  input.removeAttribute('aria-invalid');
  showStatus(status, null);
  await busy(form.querySelector('button[type="submit"]'), async () => {
    const turnstile = await check.token();
    if (!turnstile) {
      showStatus(status, 'bot-check');
      return;
    }
    const result = await postJson('v1/newsletter/subscribe', { email, turnstile, website: form.elements.website?.value || '' });
    check.reset();
    if (result.ok) {
      form.elements.email.value = '';
      showStatus(status, 'ok');
      return;
    }
    if (result.error === 'invalid-email') input.setAttribute('aria-invalid', 'true');
    showStatus(status, result.error in MESSAGES ? result.error : 'unavailable');
  }, { createIcon: icon });
}

export function initNewsletter(root = document) {
  for (const form of root.querySelectorAll('form[data-newsletter]')) {
    const check = humanCheck(form);
    form.addEventListener('focusin', () => check.warm(), { once: true });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submit(form, check);
    });
  }
}
