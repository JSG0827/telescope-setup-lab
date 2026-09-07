import assert from 'node:assert/strict';
import test from 'node:test';
import {createFocus,focusReducer,focusOptics,focusReady,restoreFocus,FOCUS_CASES} from '../lib/focus.ts';
const act=(s,a)=>focusReducer(s,typeof a==='string'?{type:a}:a);
const settled=s=>act(s,{type:'settle',motion:s.motion});
function focused(practice='a'){
  let s=act(act(createFocus(practice),'open'),'fine');
  const direction=s.position<FOCUS_CASES[practice].plane?1:-1;
  while(Math.abs(s.position-FOCUS_CASES[practice].plane)>.01)s=act(s,{type:'turn',direction});
  return settled(s);
}
function confirmed(s=focused()){
  s=act(s,'observe');s=act(s,{type:'feature',feature:'edge'});s=act(s,{type:'feature',feature:'points'});return act(s,'check');
}
test('alignment and opening precede focus manipulation',()=>{
  assert(!focusReducer(createFocus(),{type:'open'},false).opened);
  assert.equal(act(createFocus(),{type:'turn',direction:1}).position,createFocus().position);
});
test('defocus broadens both sides of best plane symmetrically',()=>{
  const s=focused(),plane=FOCUS_CASES.a.plane;
  const before=focusOptics({...s,position:plane-2}),after=focusOptics({...s,position:plane+2});
  assert.equal(before.blur,after.blur);assert(before.blur>focusOptics(s).blur);assert(focusOptics(s).sharp);
});
test('two practice conditions have different best positions, not midpoint 50',()=>{
  const a=focused('a'),b=focused('b');assert.notEqual(a.position,b.position);assert(focusOptics(a).sharp&&focusOptics(b).sharp);
  assert(!focusOptics({...a,position:24}).sharp);assert(!focusOptics({...b,position:24}).sharp);
});
test('focus turn changes position, starts vibration and invalidates evidence',()=>{
  const n=act(confirmed(),{type:'turn',direction:1});assert(!n.settled);assert(!n.observed);assert(!n.checked);assert(!n.features.edge);assert(!focusReady(n));
});
test('stale settle callbacks cannot settle a later movement',()=>{
  let s=act(focused(),{type:'turn',direction:1});const old=s.motion;
  s=act(s,{type:'turn',direction:1});assert(!act(s,{type:'settle',motion:old}).settled);assert(settled(s).settled);
});
test('hand contact prevents observation and settling until release',()=>{
  let s=act(focused(),'touch');assert(!settled(s).settled);assert(!act(s,'observe').observed);
  s=act(s,'release');assert(!s.settled);assert(act(settled(s),'observe').observed);
});
test('vibration blocks observation and confirmation even at exact focus',()=>{
  const s={...confirmed(),settled:false};assert(act(s,'observe').events.at(-1).blocked);assert(act(s,'check').events.at(-1).blocked);assert(!focusReady(s));
});
test('no automatic completion: observation and both perceived features required',()=>{
  let s=focused();assert(!focusReady(s));assert(!act(s,'check').checked);
  s=act(s,'observe');assert(!act(s,'check').checked);
  s=act(s,{type:'feature',feature:'edge'});assert(!act(s,'check').checked);
  s=act(s,{type:'feature',feature:'points'});assert(focusReady(act(s,'check')));
});
test('selecting sharp features cannot pass a physically blurred image',()=>{
  assert(!focusReady(confirmed(act(createFocus(),'open'))));
});
test('overshoot and return work, but intentional overshoot is not mandatory',()=>{
  let s=focused();assert.equal(s.reversals,0);assert(focusReady(confirmed(s)));
  s=act(s,{type:'turn',direction:1,steps:7});assert(!focusOptics(s).sharp);
  s=act(s,{type:'turn',direction:-1,steps:7});assert.equal(s.reversals,1);assert(focusReady(confirmed(settled(s))));
});
test('seeing changes blur without changing focal position; it does not demand chasing turbulence',()=>{
  const s=focused(),n=act(s,{type:'seeing',seeing:'variable'});assert.equal(s.position,n.position);assert(focusOptics(n).blur>focusOptics(s).blur);assert(focusReady(confirmed(n)));
});
test('conditions change invalidates observation but not focus geometry',()=>{
  const s=act(confirmed(),{type:'seeing',seeing:'variable'});assert(!s.observed);assert(!s.checked);assert(!s.features.points);assert(focusOptics(s).sharp);
});
test('focuser bounds and nonfinite inputs are safe',()=>{
  let s=act(createFocus(),'open');for(let i=0;i<20;i++)s=act(s,{type:'turn',direction:1,steps:10});assert.equal(s.position,36);
  const n=act(s,{type:'turn',direction:1});assert(n.events.at(-1).blocked);
  for(const steps of [NaN,Infinity,-1,0])assert.deepEqual(act(s,{type:'turn',direction:-1,steps}),s);
});
test('unsafe fastener and lens attempts never alter position',()=>{
  const s=focused();for(const type of ['clamp','lens']){const n=act(s,type);assert(n.events.at(-1).blocked);assert.equal(n.position,s.position);}
});
test('progress restores valid partials and completion, never a held hand or pending timer',()=>{
  assert(focusReady(restoreFocus(confirmed(),true)));
  const held=act(confirmed(),'touch'),n=restoreFocus(held,true);assert(!n.touching);assert(n.settled);assert(!n.observed);assert(!focusReady(n));
  assert.equal(restoreFocus(focused('b'),true).position,FOCUS_CASES.b.plane);
});
test('legacy, corrupt and unsupported completion are not credited',()=>{
  for(const raw of [null,{version:0,checked:true},{...confirmed(),position:NaN},{...confirmed(),position:90},{...confirmed(),position:20},{...confirmed(),samples:[]},{...confirmed(),observed:false}])assert(!focusReady(restoreFocus(raw,true)));
  assert(!focusReady(restoreFocus(confirmed(),false)));
});
test('sample history and event history remain bounded',()=>{
  let s=focused();for(let i=0;i<190;i++)s=act(s,'observe');assert.equal(s.samples.length,12);assert.equal(s.events.length,160);
});
test('practice cannot change during an open observing session',()=>{
  const s=focused(),n=act(s,{type:'practice',practice:'b'});assert.equal(n.practice,'a');assert(n.events.at(-1).blocked);
});
