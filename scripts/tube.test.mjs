import assert from 'node:assert/strict';
import test from 'node:test';
import { createTripod, tripodReducer, LEG_IDS } from '../lib/tripod.ts';
import { createMount, mountReducer } from '../lib/mount.ts';
import { createCounterweight, counterweightReducer } from '../lib/counterweight.ts';
import { createTube, tubeReducer, tubeReadiness, restoreTube } from '../lib/tube.ts';
import { tubeRig, TUBE_RAIL, TUBE_SCALE } from '../lib/tube-rig.ts';
let t = tripodReducer(createTripod(), { type: 'place' });
for (const leg of LEG_IDS) t = tripodReducer(t, { type: 'spread', leg });
for (const a of [{ type: 'ground' }, { type: 'view', view: 'top' }, { type: 'support' }]) t = tripodReducer(t, a);
for (const [i, leg] of LEG_IDS.entries()) for (const a of [{ type: 'lock', leg }, { type: 'extend', leg, value: [37, 50, 29][i] }, { type: 'lock', leg }]) t = tripodReducer(t, a);
t = tripodReducer(t, { type: 'check' });
let m = createMount();
for (const a of [{ type: 'align-base' }, { type: 'place' }, { type: 'view', view: 'under' }, ...Array.from({ length: 4 }, () => ({ type: 'bolt' })), { type: 'test' }, { type: 'view', view: 'direction' }, { type: 'azimuth', value: 0 }, { type: 'altitude', value: 37 }, { type: 'az-seat' }, { type: 'alt-seat' }, { type: 'check' }]) m = mountReducer(m, a, t);
let c = createCounterweight();
for (const type of ['inspect', 'stopper', 'clamp', 'place', 'clamp', 'stopper', 'test', 'check']) c = counterweightReducer(c, { type }, m, t);
const act = (s, type, later = false) => tubeReducer(s, { type }, c, m, t, later);
const seq = (s, types) => types.reduce((s, type) => act(s, type), s);
const carried = () => seq(createTube(), ['inspect', 'support', 'open', 'align', 'place']);
const fixed = () => seq(carried(), ['seat', 'tighten', 'tighten', 'tighten']);
const finished = () => seq(fixed(), ['test', 'check']);
test('inspection, support, opening and alignment are independent prerequisites', () => {
  for (const missing of ['inspect', 'support', 'open', 'align']) {
    const s = seq(createTube(), ['inspect', 'support', 'open', 'align'].filter(a => a !== missing));
    assert(!act(s, 'place').placed, missing);
  }
  assert(!tubeReducer(createTube(), { type: 'inspect' }, createCounterweight(), m, t).inspected);
  assert(carried().placed); assert(!act(createTube(), 'miss').placed);
});
test('placement is not seating; partial seating cannot be clamped or passed', () => {
  const s = carried(); assert(!s.seated);
  assert.equal(act(s, 'tighten').clamp, 0); assert(!act(s, 'test').tested); assert(!act(s, 'check').checked);
  assert(act(s, 'tighten').events.at(-1).blocked);
});
test('support is retained until fully clamped and tested', () => {
  assert(act(carried(), 'support').supported);
  assert(act(fixed(), 'support').supported);
  assert(!act(act(fixed(), 'test'), 'support').supported);
  assert(tubeReadiness(finished(), c, m, t).ready);
});
test('three educational turns are bounded and do not substitute for play test', () => {
  let s = act(carried(), 'seat');
  for (let i = 1; i <= 3; i++) { s = act(s, 'tighten'); assert.equal(s.clamp, i); assert(!act(s, 'check').checked); }
  assert.equal(act(s, 'tighten').clamp, 3); assert(act(s, 'test').tested);
});
test('opening requires support and invalidates prior evidence', () => {
  const s = finished(); assert(!act(s, 'open').saddleOpen);
  const n = seq(s, ['support', 'open']); assert(n.saddleOpen); assert(!n.tested); assert(!n.checked);
  assert(!tubeReadiness(n, c, m, t).ready);
});
test('return requires support and released saddle; rack can be installed again', () => {
  assert(act(finished(), 'return').placed);
  const s = seq(finished(), ['support', 'open', 'return']);
  assert(!s.placed); assert(!s.seated); assert(!s.supported); assert(!s.checked);
  assert(seq(s, ['support', 'place']).placed);
});
test('lens and clutch mistakes explain hazards without changing attachments', () => {
  for (const type of ['lens', 'clutch']) { const n = act(carried(), type); assert(n.placed); assert(n.events.at(-1).blocked); assert(n.feedback.length > 30); }
});
test('later axis/accessory work prevents disassembly but allows observation', () => {
  for (const type of ['open', 'support', 'return', 'tighten']) assert(act(finished(), type, true).events.at(-1).blocked);
  assert.equal(tubeReducer(finished(), { type: 'view', view: 'detail' }, c, m, t, true).view, 'detail');
});
test('restore preserves valid partial/complete work but rejects impossible and legacy records', () => {
  for (const s of [carried(), act(carried(), 'seat'), fixed(), finished()]) assert.deepEqual(restoreTube(s, c, m, t), s);
  for (const bad of [{ placed: false }, { seated: false }, { aligned: false }, { saddleOpen: true }, { clamp: NaN }, { clamp: 4 }]) assert(!restoreTube({ ...finished(), ...bad }, c, m, t).placed);
  assert(!restoreTube({ tubePhase: 'locked' }, c, m, t).checked);
  assert(!restoreTube(finished(), createCounterweight(), m, t).placed);
  assert(!restoreTube({ ...carried(), supported: false }, c, m, t).placed);
});
test('history is bounded and hints are not safety failures', () => {
  let s = createTube(); for (let i = 0; i < 180; i++) s = act(s, 'hint');
  assert.equal(s.events.length, 160); assert.equal(s.hints, 180); assert(!s.events.at(-1).blocked);
});
test('rendered rail, saddle and tripod use a single shared coordinate frame', () => {
  for (const seated of [true, false]) {
    const r = tubeRig(t, seated);
    const xy = v => v.match(/translate\(([^)]+)\)/)[1].split(' ').map(Number);
    const [mx, my] = xy(r.mountTransform), [tx, ty] = xy(r.tubeTransform);
    assert(Math.abs(mx + (tx + TUBE_RAIL.x * TUBE_SCALE) * .53 - r.rail.x) < 1e-8);
    assert(Math.abs(my + (ty + TUBE_RAIL.y * TUBE_SCALE) * .53 - r.rail.y) < 1e-8);
    if (seated) assert.deepEqual(r.rail, r.saddle);
    else assert(Math.hypot(r.rail.x-r.saddle.x, r.rail.y-r.saddle.y) > 50);
  }
});
