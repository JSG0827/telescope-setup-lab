import assert from 'node:assert/strict';
import test from 'node:test';
import { createTripod, tripodReducer, LEG_IDS } from '../lib/tripod.ts';
import { createMount, mountReducer } from '../lib/mount.ts';
import { createCounterweight, counterweightReducer, counterweightReadiness, restoreCounterweight } from '../lib/counterweight.ts';
import { counterweightRig } from '../lib/counterweight-rig.ts';
let t = tripodReducer(createTripod(), { type: 'place' });
for (const leg of LEG_IDS) t = tripodReducer(t, { type: 'spread', leg });
for (const a of [{ type: 'ground' }, { type: 'view', view: 'top' }, { type: 'support' }]) t = tripodReducer(t, a);
for (const [i, leg] of LEG_IDS.entries()) for (const a of [{ type: 'lock', leg }, { type: 'extend', leg, value: [37, 50, 29][i] }, { type: 'lock', leg }]) t = tripodReducer(t, a);
t = tripodReducer(t, { type: 'check' });
let m = createMount();
for (const a of [{ type: 'align-base' }, { type: 'place' }, { type: 'view', view: 'under' }, ...Array.from({ length: 4 }, () => ({ type: 'bolt' })), { type: 'test' }, { type: 'view', view: 'direction' }, { type: 'azimuth', value: 0 }, { type: 'altitude', value: 37 }, { type: 'az-seat' }, { type: 'alt-seat' }, { type: 'check' }]) m = mountReducer(m, a, t);
const act = (s, a, loaded = false) => counterweightReducer(s, a, m, t, loaded);
function installed() { let s = createCounterweight(); for (const type of ['inspect', 'stopper', 'clamp', 'place']) s = act(s, { type }); return s; }
function finished(position = 35) { let s = act(installed(), { type: 'move', value: position }); for (const type of ['clamp', 'stopper', 'test', 'check']) s = act(s, { type }); return s; }
test('mount completion, inspection, open stopper and clear bore are all needed', () => {
  assert(!act(createCounterweight(), { type: 'place' }).placed);
  let s = act(createCounterweight(), { type: 'inspect' });
  assert(!act(s, { type: 'place' }).placed);
  s = act(s, { type: 'stopper' }); assert(!act(s, { type: 'place' }).placed);
  s = act(s, { type: 'clamp' }); assert(!counterweightReducer(s, { type: 'place' }, createMount(), t).placed);
  assert(act(s, { type: 'place' }).placed); assert(!act(s, { type: 'miss' }).placed);
});
test('carried weight remains supported until clamp, stopper and test are complete', () => {
  let s = installed(); assert(s.supported); assert(act(s, { type: 'support' }).supported);
  s = act(s, { type: 'clamp' }); assert(act(s, { type: 'support' }).supported);
  s = act(s, { type: 'stopper' }); assert(act(s, { type: 'support' }).supported);
  s = act(s, { type: 'test' }); assert(!act(s, { type: 'support' }).supported);
});
test('end stop does not secure the position; secured position does not replace end stop', () => {
  assert(!act(act(installed(), { type: 'stopper' }), { type: 'test' }).tested);
  assert(!act(act(installed(), { type: 'clamp' }), { type: 'test' }).tested);
  assert(!act(installed(), { type: 'check' }).checked);
});
test('sliding requires hand support and an open clamp, and invalidates check evidence', () => {
  let s = finished(); assert.equal(act(s, { type: 'move', value: 60 }).position, 35);
  assert(act(s, { type: 'clamp' }).clamped);
  s = act(s, { type: 'support' }); assert.equal(act(s, { type: 'move', value: 60 }).position, 35);
  s = act(s, { type: 'clamp' }); assert(!s.checked); assert(!s.tested);
  assert.equal(act(s, { type: 'move', value: 60 }).position, 60);
});
test('several provisional positions pass; no central answer is required', () => {
  for (const p of [15, 29, 50, 63, 75]) assert(counterweightReadiness(finished(p), m, t).ready);
});
test('bounds and non-finite inputs never move the weight off the rod', () => {
  const s = installed(); assert.equal(act(s, { type: 'move', value: -20 }).position, 15);
  assert.equal(act(s, { type: 'move', value: 1000 }).position, 75);
  assert.deepEqual(act(s, { type: 'move', value: NaN }), s);
});
test('removing stopper from installed weight requires support and a locked clamp', () => {
  const s = finished(); assert(act(s, { type: 'stopper' }).stopper);
  const held = act(s, { type: 'support' }); assert(!act(held, { type: 'stopper' }).stopper);
  assert(act(act(held, { type: 'clamp' }), { type: 'stopper' }).stopper);
});
test('tube attachment blocks changes but permits viewing; clutch is not a weight lock', () => {
  const s = finished(); for (const type of ['clamp', 'stopper', 'support', 'inspect']) { const n = act(s, { type }, true); assert(n.checked); assert(n.events.at(-1).blocked); }
  assert.equal(act(s, { type: 'view', view: 'detail' }, true).view, 'detail');
  assert(act(installed(), { type: 'clutch' }).events.at(-1).blocked);
});
test('restore rejects old completion and physically inconsistent states; keeps valid partial work', () => {
  assert(!restoreCounterweight({ counterPhase: 'secured' }, m, t).checked);
  for (const bad of [{ position: Infinity }, { inspected: false }, { placed: false }, { clamped: false }, { stopper: false }]) assert(!restoreCounterweight({ ...finished(), ...bad }, m, t).checked);
  assert.deepEqual(restoreCounterweight(installed(), m, t), installed());
  assert(counterweightReadiness(restoreCounterweight(finished(), m, t), m, t).ready);
  assert(!restoreCounterweight(finished(), createMount(), t).placed);
});
test('history is bounded and reports requested movement separately from outcome', () => {
  let s = installed(); for (let i = 0; i < 180; i++) s = act(s, { type: 'hint' });
  assert.equal(s.events.length, 160); assert.equal(s.hints, 180);
  assert.equal(act(s, { type: 'move', value: 40 }).events.at(-1).value, 40);
});
test('mount socket, rod end and sprite use a common transform; position follows rod axis', () => {
  for (const p of [15, 35, 75]) {
    const r = counterweightRig(t, p); const [x, y] = r.transform.match(/translate\(([^)]+)\)/)[1].split(' ').map(Number);
    assert.equal(r.entry.x, x + r.end.x * .53); assert.equal(r.entry.y, y + r.end.y * .53);
    assert(Math.abs((r.weight.x - 335) * 355 - (r.weight.y - 770) * -232) < 1e-7);
  }
});
