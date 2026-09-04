import assert from 'node:assert/strict';
import test from 'node:test';
import {createSetup, setupReducer, setupReady, restoreSetup, accessoriesReady, moments, withinBalance, PARTS} from '../lib/observing-setup.ts';
const act=(s,a)=>setupReducer(s,typeof a==='string'?{type:a}:a);
const seq=(s,actions)=>actions.reduce(act,s);
function attach(s,p) {return seq(s,[{type:'select',part:p},'inspect','hold','open','place','seat','fix','part-test']);}
function equipped() {return PARTS.reduce(attach,createSetup(16));}
function axisStart(s,axis) {return seq(s,[...(s.supported?[]:['support']),{type:'view',view:axis},{type:'clutch',axis}]);}
function balanced(s,axis,value) {return seq(axisStart(s,axis),[axis==='ra'?'weight-clamp':'tube-clamp',{type:'move',axis,value},axis==='ra'?'weight-clamp':'tube-clamp','test',{type:'clutch',axis}]);}
function finished() {return act(balanced(balanced(equipped(),'ra',38),'dec',28),'check');}
test('all three accessories are needed before balance posture',()=>{
  assert(!accessoriesReady(createSetup()));assert(accessoriesReady(equipped()));
  assert.equal(act(act(createSetup(),'support'),{type:'view',view:'ra'}).view,'assembly');
  assert.equal(axisStart(equipped(),'ra').free,'ra');
});
test('inspection, support and open fastener precede placement',()=>{
  for(const missing of ['inspect','hold','open']) {
    const s=seq(createSetup(),['inspect','hold','open'].filter(a=>a!==missing));assert.equal(act(s,'place').parts.finder,'rack');
  }
  assert.equal(setupReducer(createSetup(),{type:'inspect'},false).inspected.finder,false);
});
test('eyepiece cannot be installed until diagonal is secured and checked',()=>{
  const s=seq(createSetup(),[{type:'select',part:'eyepiece'},'inspect','hold','open','place']);assert.equal(s.parts.eyepiece,'rack');
  assert.equal(attach(attach(createSetup(),'diagonal'),'eyepiece').parts.eyepiece,'checked');
});
test('partial placement is not seating, fixation or evidence',()=>{
  const s=seq(createSetup(),['inspect','hold','open','place']);
  assert.equal(act(s,'fix').parts.finder,'placed');assert.equal(act(s,'part-test').parts.finder,'placed');
  assert(act(s,'hold').holding);assert.equal(act(s,{type:'select',part:'diagonal'}).selected,'finder');
});
test('a diagonal with an eyepiece cannot be loosened first',()=>{
  const s=seq(equipped(),[{type:'select',part:'diagonal'},'hold','open']);assert(!s.open.diagonal);assert.equal(s.parts.diagonal,'checked');
});
test('part changes clear both balance results',()=>{
  const s=seq(finished(),[{type:'view',view:'detail'},{type:'select',part:'eyepiece'},'hold','open','remove']);
  assert.equal(s.parts.eyepiece,'rack');assert(!s.checked);assert(!s.tested.ra);assert(!s.tested.dec);
});
test('test prerequisites are enforced: support, one free axis, secured payload',()=>{
  const s=equipped();assert(!act(s,{type:'clutch',axis:'ra'}).free);
  const free=axisStart(s,'ra');assert.equal(act(free,{type:'clutch',axis:'dec'}).free,'ra');assert(act(free,'support').supported);
  assert.equal(act(act(free,'weight-clamp'),'test').observed,null);
});
test('view and selection cannot strand a free axis',()=>{
  const s=axisStart(equipped(),'ra');
  for(const a of ['inspect',{type:'select',part:'finder'},{type:'view',view:'detail'},{type:'view',view:'dec'}]) assert.equal(act(s,a).view,'ra');
});
test('position moves need the correct clamp and are bounded',()=>{
  const s=axisStart(equipped(),'ra');assert.equal(act(s,{type:'move',axis:'ra',value:70}).weight,16);
  const open=act(s,'weight-clamp');assert.equal(act(open,{type:'move',axis:'ra',value:1000}).weight,75);
  assert.equal(act(open,{type:'move',axis:'ra',value:-100}).weight,15);assert.deepEqual(act(open,{type:'move',axis:'ra',value:NaN}),open);
  assert.equal(act(open,{type:'move',axis:'dec',value:20}).offset,0);
});
test('masses and lever arms determine signs rather than hidden midpoint answers',()=>{
  const s=equipped();assert(moments(s).ra>0);assert(moments({...s,weight:75}).ra<0);
  assert(withinBalance({...s,weight:38},'ra'));assert(!withinBalance({...s,weight:50},'ra'));
  assert(moments(s).dec>0);assert(moments({...s,offset:60}).dec<0);assert(withinBalance({...s,offset:28},'dec'));
  assert(moments(s).mass>moments(createSetup()).mass);
});
test('incorrect trial is observable but earns no balance credit',()=>{
  const s=act(axisStart(equipped(),'ra'),'test');assert(s.observed.moment>0);assert(!s.tested.ra);assert.match(s.feedback,/경통 쪽/);
});
test('passing both axes requires trials, relocking and explicit final confirmation',()=>{
  const s=balanced(balanced(equipped(),'ra',38),'dec',28);assert(!setupReady(s));assert(setupReady(act(s,'check')));
  assert(!setupReady({...s,checked:true,free:'dec'}));assert(!setupReady({...s,checked:true,tested:{ra:false,dec:true}}));
});
test('changing or reopening a tested axis requires new evidence',()=>{
  const s=axisStart(finished(),'ra');assert(!s.tested.ra);assert(!s.checked);
  const moved=seq(s,['weight-clamp',{type:'move',axis:'ra',value:40}]);assert(!moved.tested.ra);
});
test('restore keeps valid incomplete assembly, free-axis state and completion',()=>{
  const samples=[createSetup(),seq(createSetup(),['inspect','hold','open','place']),equipped(),axisStart(equipped(),'ra'),finished()];
  for(const s of samples) {const r=restoreSetup(s,16,true);assert.deepEqual(r.parts,s.parts);assert.equal(r.free,s.free);assert.equal(r.checked,s.checked);}
  assert(setupReady(restoreSetup(finished(),16,true)));
});
test('restore rejects legacy, impossible and out of range records',()=>{
  assert(!setupReady(restoreSetup({axisPhase:'complete'},16,true)));
  for(const bad of [{weight:Infinity},{offset:999},{free:'ra',supported:false},{parts:{...finished().parts,diagonal:'rack'}},{open:{...finished().open,eyepiece:true}}]) assert(!setupReady(restoreSetup({...finished(),...bad},16,true)));
  assert(!accessoriesReady(restoreSetup(finished(),16,false)));
});
test('later work is read-only; hints have bounded records without safety penalty',()=>{
  assert(setupReducer(finished(),{type:'open'},true,true).events.at(-1).blocked);
  assert.equal(setupReducer(finished(),{type:'view',view:'ra'},true,true).view,'ra');
  let s=createSetup();for(let i=0;i<180;i++) s=act(s,'hint');assert.equal(s.events.length,160);assert.equal(s.hints,180);assert(!s.events.at(-1).blocked);
});
