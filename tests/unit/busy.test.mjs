import assert from 'node:assert/strict';
import { test } from 'node:test';
import { busy, isBusy } from '../../public/js/shared/busy.js';

function fakeButton(tagName = 'BUTTON') {
  const attrs = new Map();
  const use = { href: '#i-share', getAttribute: () => use.href, setAttribute: (_, v) => { use.href = v; } };
  return {
    tagName,
    disabled: false,
    style: { minWidth: '' },
    use,
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    querySelector: () => use,
    getBoundingClientRect: () => ({ width: 120 }),
  };
}

test('a busy button is disabled, spins a cog and ignores more presses', async () => {
  const button = fakeButton();
  let runs = 0;
  let release;
  const first = busy(button, () => new Promise((resolve) => {
    runs++;
    release = resolve;
  }), { minimum: 0 });
  assert.equal(isBusy(button), true);
  assert.equal(button.disabled, true);
  assert.equal(button.use.href, '#i-cog');
  assert.equal(button.style.minWidth, '120px');
  const second = await busy(button, () => {
    runs++;
  }, { minimum: 0 });
  assert.equal(second, undefined);
  release('done');
  assert.equal(await first, 'done');
  assert.equal(runs, 1);
  assert.equal(isBusy(button), false);
  assert.equal(button.disabled, false);
  assert.equal(button.use.href, '#i-share');
  assert.equal(button.style.minWidth, '');
});

test('the button comes back after a failure', async () => {
  const button = fakeButton();
  await assert.rejects(busy(button, async () => {
    throw new Error('network');
  }, { minimum: 0 }), /network/);
  assert.equal(isBusy(button), false);
  assert.equal(button.disabled, false);
  assert.equal(button.use.href, '#i-share');
});

test('links use aria-disabled instead of disabled', async () => {
  const link = fakeButton('A');
  let seen;
  await busy(link, () => {
    seen = link.getAttribute('aria-disabled');
  }, { minimum: 0 });
  assert.equal(seen, 'true');
  assert.equal(link.getAttribute('aria-disabled'), null);
});
