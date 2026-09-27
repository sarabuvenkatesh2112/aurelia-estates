import assert from 'node:assert/strict';
import test from 'node:test';
import { ScrollIntent } from '../lib/motion/scroll-intent';

void test('small trackpad deltas accumulate; a strong wheel still produces one step', () => {
  const intent = new ScrollIntent();
  assert.equal(intent.feed(12, 0, false), 0);
  assert.equal(intent.feed(12, 16, false), 0);
  assert.equal(intent.feed(16, 32, false), 1);
  assert.equal(intent.feed(1600, 48, false), 0);
});

void test('continuous momentum cannot skip after the 781ms transition settles', () => {
  const intent = new ScrollIntent();
  let steps = intent.feed(120, 0, false);
  for (let time = 16; time < 2400; time += 16)
    steps += intent.feed(60 * Math.exp(-time / 1000), time, time < 782);
  assert.equal(steps, 1);
  assert.equal(intent.feed(80, 2700, false), 1);
});

void test('a separate gesture during a transition is consumed rather than queued', () => {
  const intent = new ScrollIntent();
  assert.equal(intent.feed(80, 0, false), 1);
  assert.equal(intent.feed(100, 300, true), 0);
  for (let time = 316; time < 1100; time += 16)
    assert.equal(intent.feed(50, time, time < 782), 0);
  assert.equal(intent.feed(-80, 1400, false), -1);
});

void test('touch advances only once per contact, even after a pause or reversal', () => {
  const intent = new ScrollIntent();
  intent.reset();
  assert.equal(intent.feed(50, 0, false, true), 1);
  assert.equal(intent.feed(-200, 1500, false, true), 0);
  intent.reset();
  assert.equal(intent.feed(-50, 1600, false, true), -1);
});

void test('direction changes reset tentative intent and invalid deltas do not advance', () => {
  const intent = new ScrollIntent();
  assert.equal(intent.feed(30, 0, false), 0);
  assert.equal(intent.feed(NaN, 10, false), 0);
  assert.equal(intent.feed(-25, 20, false), 0);
  assert.equal(intent.feed(-15, 36, false), -1);
});
