import assert from 'node:assert/strict';
import test from 'node:test';
import { createTripod, tripodReducer as act, tripodGeometry as geometry, tripodReadiness as readiness, restoreTripod, LEG_IDS, SCENARIOS } from '../lib/tripod.ts';

function prepared(scenario = 'terrace') {
  let s = act(createTripod(), { type: 'scenario', scenario });
  s = act(s, { type: 'place' });
  for (const leg of LEG_IDS) s = act(s, { type: 'spread', leg });
  s = act(s, { type: 'ground' });
  return act(s, { type: 'view', view: 'top' });
}
function adjust(s, leg, value) {
  if (!s.supported) s = act(s, { type: 'support' });
  s = act(s, { type: 'lock', leg });
  s = act(s, { type: 'extend', leg, value });
  return act(s, { type: 'lock', leg });
}
function leveled(scenario = 'terrace', height = 35) {
  let s = prepared(scenario);
  for (const [i, leg] of LEG_IDS.entries()) s = adjust(s, leg, Math.round((height - SCENARIOS[scenario].ground[i]) / Math.cos(Math.PI / 9)));
  return s;
}

test('initially no mounting permission, and all midpoint values are not a solution', () => {
  const s = createTripod();
  assert(!readiness(s).ready);
  for (const leg of LEG_IDS) s.legs[leg].extension = 50;
  assert(!geometry(s).level);
});
test('north extension raises north support and moves bubble north', () => {
  const s = prepared(); const t = adjust(s, 'north', 30);
  assert(geometry(t).northSlope > geometry(s).northSlope);
  assert(geometry(t).bubbleY < geometry(s).bubbleY);
});
test('southeast extension moves bubble east; southwest extension west', () => {
  const s = prepared();
  assert(geometry(adjust(s, 'southeast', 30)).bubbleX > geometry(s).bubbleX);
  assert(geometry(adjust(s, 'southwest', 30)).bubbleX < geometry(s).bubbleX);
});
test('equal changes in all legs change height, not tilt', () => {
  const s = prepared(); const t = structuredClone(s);
  for (const leg of LEG_IDS) t.legs[leg].extension += 10;
  assert(Math.abs(geometry(t).tiltDeg - geometry(s).tiltDeg) < 1e-10);
});
test('tripod is stable only after placement, all legs spread, ground checked and locks closed', () => {
  let s = act(createTripod(), { type: 'ground' }); assert(!s.groundChecked);
  s = act(s, { type: 'place' }); s = act(s, { type: 'spread', leg: 'north' });
  assert(!readiness(s).stable);
  s = act(s, { type: 'check' }); assert(s.events.at(-1).blocked);
  assert(readiness(prepared()).stable);
});
test('locked leg does not move and produces explanatory feedback', () => {
  const s = prepared(); const t = act(s, { type: 'extend', leg: 'north', value: 40 });
  assert.equal(t.legs.north.extension, s.legs.north.extension);
  assert(t.events.at(-1).blocked); assert(t.feedback.includes('잠겨'));
});
test('support is required; cannot unlock a second leg or release support too early', () => {
  let s = prepared(); s = act(s, { type: 'lock', leg: 'north' }); assert(s.legs.north.locked);
  s = act(s, { type: 'support' }); s = act(s, { type: 'lock', leg: 'north' }); assert(!s.legs.north.locked);
  s = act(s, { type: 'lock', leg: 'southeast' }); assert(s.legs.southeast.locked);
  s = act(s, { type: 'support' }); assert(s.supported); assert(s.events.at(-1).blocked);
});
test('two different terrains and multiple overall heights can be leveled', () => {
  for (const scenario of Object.keys(SCENARIOS)) for (const height of [25, 35, 40]) {
    const s = leveled(scenario, height); assert(geometry(s).level, `${scenario}:${height}`);
    assert(!readiness(s).ready, 'must explicitly recheck, not auto-pass');
    assert(readiness(act(s, { type: 'check' })).ready);
  }
});
test('equal extensions are not a solution on either terrain', () => {
  for (const scenario of Object.keys(SCENARIOS)) assert(!geometry(prepared(scenario)).level);
});
test('final check rejects unlocked legs even with centered bubble', () => {
  let s = leveled(); s = act(s, { type: 'lock', leg: 'north' });
  s = act(s, { type: 'check' }); assert(!readiness(s).ready); assert(s.events.at(-1).blocked);
});
test('changing a setting invalidates previous final check', () => {
  let s = act(leveled(), { type: 'check' }); assert(readiness(s).ready);
  s = act(s, { type: 'support' }); s = act(s, { type: 'lock', leg: 'north' });
  assert(!s.checked); assert(!readiness(s).ready);
});
test('physical movement is bounded and non-finite inputs ignored', () => {
  let s = act(prepared(), { type: 'support' }); s = act(s, { type: 'lock', leg: 'north' });
  assert.equal(act(s, { type: 'extend', leg: 'north', value: 999 }).legs.north.extension, 60);
  assert.equal(act(s, { type: 'extend', leg: 'north', value: -10 }).legs.north.extension, 0);
  assert.deepEqual(act(s, { type: 'extend', leg: 'north', value: NaN }), s);
  const g = geometry(adjust(prepared(), 'north', 60)); assert(Math.hypot(g.bubbleX, g.bubbleY) <= 64.00001);
});
test('hint use and safety events are retained with bounded event history', () => {
  let s = prepared(); for (let i = 0; i < 170; i++) s = act(s, { type: 'hint' });
  assert.equal(s.hintCount, 170); assert.equal(s.events.length, 160);
  assert(s.feedback.includes('다리')); assert.equal(s.events.at(-1).sequence, s.sequence);
});
test('new version restores safely, old or corrupt data never earns credit', () => {
  const s = act(leveled(), { type: 'check' }); assert(readiness(restoreTripod(JSON.parse(JSON.stringify(s)))).ready);
  for (const data of [null, {}, { version: 1, checked: true }, { ...s, scenario: '__proto__' }, { ...s, legs: null }]) assert(!readiness(restoreTripod(data)).ready);
  const bad = structuredClone(s); bad.legs.north.extension = Infinity;
  assert(!readiness(restoreTripod(bad)).ready);
});
test('mounted equipment guard leaves all legs unchanged', () => {
  const s = prepared(); const t = act(s, { type: 'mounted-guard' });
  assert.deepEqual(t.legs, s.legs); assert(t.events.at(-1).blocked);
});
test('changing terrain after placement is rejected', () => {
  const t = act(prepared(), { type: 'scenario', scenario: 'hillside' });
  assert.equal(t.scenario, 'terrace'); assert(t.events.at(-1).blocked);
});
