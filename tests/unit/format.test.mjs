import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clockTime, countdown, endsText, formatPrice, isLive, longDate, plural } from '../../public/js/core/format.js';

test('formatPrice uses pounds and pence', () => {
  assert.equal(formatPrice(12.5), '£12.50');
  assert.equal(formatPrice(1299), '£1,299.00');
  assert.equal(formatPrice(10, 'EUR'), '€10.00');
  assert.equal(formatPrice('nope'), '');
});

test('plural', () => {
  assert.equal(plural(1, 'day'), '1 day');
  assert.equal(plural(2, 'day'), '2 days');
});

test('clockTime reads naturally in UK time, including BST', () => {
  assert.equal(clockTime('2026-10-20T19:00:00Z'), '8pm');
  assert.equal(clockTime('2026-11-20T20:30:00Z'), '8:30pm');
  assert.equal(clockTime('2026-11-20T00:00:00Z'), 'midnight');
  assert.equal(clockTime('2026-11-20T12:00:00Z'), 'midday');
  assert.equal(clockTime('2026-11-20T09:05:00Z'), '9:05am');
});

test('endsText says today, tomorrow or the full date', () => {
  const now = new Date('2026-10-21T10:00:00Z');
  assert.equal(endsText('2026-10-21T19:00:00Z', now), 'Ends today at 8pm');
  assert.equal(endsText('2026-10-22T19:00:00Z', now), 'Ends tomorrow at 8pm');
  assert.equal(endsText('2026-11-01T20:00:00Z', now), 'Ends Sunday 1 November at 8pm');
  assert.equal(endsText('2026-10-21T19:00:00Z', now, { relative: false }), 'Ends Wednesday 21 October at 8pm');
});

test('longDate', () => {
  assert.equal(longDate('2026-10-21T10:00:00Z'), '21 October 2026');
});

test('countdown counts down and stops at zero', () => {
  const now = new Date('2026-10-21T10:00:00Z');
  assert.equal(countdown('2026-10-23T14:30:00Z', now).text, '2 days 4 hours');
  assert.equal(countdown('2026-10-21T13:05:00Z', now).text, '3 hours 5 minutes');
  assert.equal(countdown('2026-10-21T10:02:30Z', now).text, '2 minutes 30 seconds');
  assert.equal(countdown('2026-10-21T10:00:01Z', now).text, '1 second');
  assert.deepEqual(countdown('2026-10-21T09:59:59Z', now), { done: true, ms: 0, text: 'Ended' });
});

test('isLive respects start and end times', () => {
  const now = new Date('2026-10-21T10:00:00Z');
  assert.equal(isLive({ endsAt: '2026-10-22T00:00:00Z' }, now), true);
  assert.equal(isLive({ endsAt: '2026-10-20T00:00:00Z' }, now), false);
  assert.equal(isLive({ startsAt: '2026-10-22T00:00:00Z', endsAt: '2026-10-23T00:00:00Z' }, now), false);
  assert.equal(isLive({ endsAt: 'nonsense' }, now), false);
});
