import assert from 'node:assert/strict';
import test from 'node:test';
import { createTripod, tripodReducer, LEG_IDS, SCENARIOS } from '../lib/tripod.ts';
import { tripodRig, RIG_LEGS } from '../lib/tripod-rig.ts';
import { createMount, mountReducer, mountReadiness, restoreMount } from '../lib/mount.ts';

function tripod() {
  let t = tripodReducer(createTripod(), { type: 'place' });
  for (const leg of LEG_IDS) t = tripodReducer(t, { type: 'spread', leg });
  t = tripodReducer(t, { type: 'ground' }); t = tripodReducer(t, { type: 'view', view: 'top' }); t = tripodReducer(t, { type: 'support' });
  for (const [i, leg] of LEG_IDS.entries()) {
    t = tripodReducer(t, { type: 'lock', leg });
    t = tripodReducer(t, { type: 'extend', leg, value: [37, 50, 29][i] });
    t = tripodReducer(t, { type: 'lock', leg });
  }
  return tripodReducer(t, { type: 'check' });
}
const t = tripod();
const act = (s, a, loaded = false) => mountReducer(s, a, t, loaded);
function placed() { return act(act(createMount(), { type: 'align-base' }), { type: 'place' }); }
function fixed() {
  let s = act(placed(), { type: 'view', view: 'under' });
  for (let i = 0; i < 4; i++) s = act(s, { type: 'bolt' });
  return act(s, { type: 'test' });
}
function finished() {
  let s = act(fixed(), { type: 'view', view: 'direction' });
  s = act(s, { type: 'azimuth', value: 0 }); s = act(s, { type: 'altitude', value: 37 });
  s = act(s, { type: 'az-seat' }); s = act(s, { type: 'alt-seat' });
  return act(s, { type: 'check' });
}
test('mounting requires tripod completion, not merely an aligned mount', () => {
  const s = mountReducer(act(createMount(), { type: 'align-base' }), { type: 'place' }, createTripod());
  assert(!s.placed); assert(s.events.at(-1).blocked);
});
test('wrong key orientation and missed drop do not attach mount', () => {
  assert(!act(createMount(), { type: 'place' }).placed);
  assert(!act(createMount(), { type: 'miss' }).placed);
  assert(placed().placed); assert(placed().supported);
});
test('placing is not securing; support cannot be released', () => {
  const s = act(placed(), { type: 'support' }); assert(s.supported); assert(s.events.at(-1).blocked);
  assert(!mountReadiness(s, t).fixed); assert(!act(s, { type: 'check' }).checked);
});
test('bottom fastener requires placement, support and underside inspection', () => {
  assert.equal(act(createMount(), { type: 'bolt' }).bolt, 0);
  assert.equal(act(placed(), { type: 'bolt' }).bolt, 0);
  const s = act(placed(), { type: 'view', view: 'under' });
  assert.equal(act({ ...s, supported: false }, { type: 'bolt' }).bolt, 0);
  assert.equal(act(s, { type: 'bolt' }).bolt, 1);
});
test('loose fastener fails play check; cannot overtighten', () => {
  assert(!act(placed(), { type: 'test' }).fixationChecked);
  const s = fixed(); assert(s.fixationChecked); assert.equal(act(s, { type: 'bolt' }).bolt, 4);
  assert(act(s, { type: 'bolt' }).events.at(-1).blocked);
});
test('side adjustments cannot substitute for central fixing', () => {
  assert.equal(act(placed(), { type: 'azimuth', value: 0 }).azimuth, 12);
  assert(!act(placed(), { type: 'az-seat' }).azSeated);
  assert.equal(act(fixed(), { type: 'altitude', value: 37 }).altitude, 25);
});
test('fixed mount releases support, but is not directionally ready', () => {
  assert(!act(fixed(), { type: 'support' }).supported);
  assert(!mountReadiness(fixed(), t).ready);
});
test('full course requires direction plus seating and explicit final check', () => {
  assert(mountReadiness(finished(), t).ready);
  assert(!mountReadiness({ ...finished(), checked: false }, t).ready);
  assert(!act({ ...finished(), azSeated: false, checked: false }, { type: 'check' }).checked);
  assert(!act({ ...finished(), azimuth: 10, checked: false }, { type: 'check' }).checked);
});
test('opposing screws must be eased before adjusting; change invalidates final check', () => {
  const s = finished(); const rejected = act(s, { type: 'azimuth', value: 8 });
  assert.equal(rejected.azimuth, 0); assert(rejected.events.at(-1).blocked);
  const open = act(s, { type: 'az-seat' }); assert(!open.checked);
  assert.equal(act(open, { type: 'azimuth', value: 8 }).azimuth, 8);
});
test('angles are bounded and non-finite values ignored', () => {
  const s = act(fixed(), { type: 'view', view: 'direction' });
  assert.equal(act(s, { type: 'azimuth', value: 100 }).azimuth, 25);
  assert.equal(act(s, { type: 'altitude', value: -100 }).altitude, 10);
  assert.deepEqual(act(s, { type: 'altitude', value: NaN }), s);
});
test('payload blocks mutation without blocking inspection', () => {
  const s = finished(); const n = act(s, { type: 'az-seat' }, true);
  assert(n.azSeated); assert(n.checked); assert(n.events.at(-1).blocked);
  assert.equal(act(s, { type: 'view', view: 'under' }, true).view, 'under');
});
test('state restoration rejects legacy and corrupted credit', () => {
  assert(!restoreMount({ mountPhase: 'secured' }, t).checked);
  assert(!restoreMount({ ...finished(), bolt: NaN }, t).checked);
  assert(!restoreMount({ ...finished(), placed: false }, t).checked);
  assert(!restoreMount(finished(), createTripod()).checked);
  assert(mountReadiness(restoreMount(JSON.parse(JSON.stringify(finished())), t), t).ready);
  assert(!restoreMount(placed(), t).checked);
});
test('hints and errors retain bounded history', () => {
  let s = createMount(); for (let i = 0; i < 180; i++) s = act(s, { type: 'hint' });
  assert.equal(s.hints, 180); assert.equal(s.events.length, 160);
});

function yAt(matrix, x, y) { const [a, b, c, d, e, f] = matrix.slice(7, -1).split(' ').map(Number); return b * x + d * y + f; }
test('rig sleeves stay connected to upper legs and shoes throughout the range', () => {
  for (const scenario of Object.keys(SCENARIOS)) for (const n of [0, 30, 60]) for (const sw of [0, 30, 60]) for (const se of [0, 30, 60]) {
    const s = structuredClone(t); s.scenario = scenario;
    [n, sw, se].forEach((value, i) => s.legs[LEG_IDS[i]].extension = value);
    const r = tripodRig(s);
    for (const leg of LEG_IDS) {
      const p = RIG_LEGS[leg], part = r.legs[leg]; assert(part.scale > 0);
      assert(Math.abs(yAt(part.upperShaft, p.x, p.cuff) - yAt(part.shaft, p.x, p.cuff)) < 1e-8);
      assert(Math.abs(yAt(part.shaft, p.x, p.ankle) - yAt(part.shoe, p.x, p.ankle)) < 1e-8);
      assert(Math.abs(yAt(part.upperShaft, p.x, 310) - yAt(r.upper, p.x, 310)) < 1e-8);
    }
  }
});
test('extending any leg raises the center while every foot landmark stays on its ground', () => {
  const base = tripodRig(t);
  for (const leg of LEG_IDS) {
    const s = structuredClone(t); s.legs[leg].extension += 5; const r = tripodRig(s);
    assert(r.socket.y < base.socket.y);
    for (const foot of LEG_IDS) {
      const p = RIG_LEGS[foot];
      assert(Math.abs(yAt(base.legs[foot].shoe, p.footX, p.foot) - yAt(r.legs[foot].shoe, p.footX, p.foot)) < 1e-8);
    }
  }
});
