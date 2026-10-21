import { rootUrl } from './dom.js';

let policy = null;

function scriptUrl(url) {
  if (!window.trustedTypes?.createPolicy) return url;
  policy ??= window.trustedTypes.createPolicy('brtp-sw', { createScriptURL: (value) => (value === url ? value : '') });
  return policy.createScriptURL(url);
}

export function initPwa() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const register = () => {
    const root = rootUrl();
    navigator.serviceWorker.register(scriptUrl(new URL('sw.js', root).href), { scope: root }).catch(() => {});
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
