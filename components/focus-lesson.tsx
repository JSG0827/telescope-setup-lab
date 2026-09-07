'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- Dynamic inline optical SVG diagrams require an accessible image role. */
import {useEffect,useId,useRef,useState} from 'react';
import {Button} from './ui/button';
import {ObservingRig} from './observing-art';
import {focusOptics,focusReady,type FocusState,type FocusAction} from '@/lib/focus';
import {JUPITER,type AlignmentState} from '@/lib/alignment';
import {type SetupState} from '@/lib/observing-setup';
import {type TripodState} from '@/lib/tripod';
import styles from './focus-lesson.module.css';

function Field({state:s,alignment,zoom,phase=0,label}:{state:FocusState;alignment:AlignmentState;zoom:number;phase?:number;label:string}){
  const id=useId().replace(/:/g,''),o=focusOptics(s,phase);
  const dx=-(JUPITER.x-alignment.pointing.x)*360*zoom,dy=-(JUPITER.y-alignment.pointing.y)*360*zoom;
  const shake=!s.settled||s.touching?3*Math.sin(phase*7):s.seeing==='variable'?.6*Math.sin(phase*2):0;
  return <svg viewBox="-195 -195 390 390" role="img" aria-label={label} className={styles.field}>
    <defs><clipPath id={`${id}-field`}><circle r="180"/></clipPath><clipPath id={`${id}-disc`}><ellipse rx="2" ry="1.88"/></clipPath><filter id={`${id}-blur`} x="-100%" y="-150%" width="300%" height="400%"><feGaussianBlur stdDeviation={o.blur}/></filter></defs>
    <circle r="186" fill="#223549"/><circle r="180" fill="#030813"/>
    <g clipPath={`url(#${id}-field)`}><g transform={`translate(${dx+shake} ${dy+shake*.6}) scale(${zoom})`}><g filter={`url(#${id}-blur)`}>
      <ellipse rx="2" ry="1.88" fill="#ddd2b8"/>
      <g clipPath={`url(#${id}-disc)`} fill="#a89983"><rect x="-3" y="-.85" width="6" height=".45"/><rect x="-3" y=".35" width="6" height=".42"/></g>
      {[-34,-16,21,49].map((x,i)=><circle key={x} cx={x} cy={[.8,-.4,.3,-.8][i]} r=".48" fill="#ede9df"/>)}
    </g></g></g>
  </svg>;
}
export function FocusLesson({state:s,alignment,setup,tripod,onAction,onBack,onReset}:{state:FocusState;alignment:AlignmentState;setup:SetupState;tripod:TripodState;onAction:(a:FocusAction)=>void;onBack:()=>void;onReset:()=>void}){
  const [zoom,setZoom]=useState(5),[phase,setPhase]=useState(0);
  const [comparisonStamp,setComparisonStamp]=useState<{motion:number;sample:FocusState['samples'][number];seeing:FocusState['seeing']}|null>(null);
  const drag=useRef<number|null>(null);
  useEffect(()=>{if(!s.opened||s.settled||s.touching)return;const timer=setTimeout(()=>onAction({type:'settle',motion:s.motion}),1400);return()=>clearTimeout(timer);},[s.opened,s.settled,s.touching,s.motion,onAction]);
  useEffect(()=>{if(!s.opened)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)');const timer=setInterval(()=>{if(!document.hidden&&!reduced.matches)setPhase(p=>p+.55);},180);return()=>clearInterval(timer);},[s.opened]);
  const sample=s.samples.at(-1);
  const comparison=!!sample&&comparisonStamp?.motion===s.motion&&comparisonStamp.sample===sample&&comparisonStamp.seeing===s.seeing;
  const recorded=sample?{...s,position:sample.position,seeing:sample.seeing,settled:true,touching:false}:s;
  const release=()=>{if(drag.current===null)return;drag.current=null;onAction({type:'release'});};
  return <div className={styles.lesson}>
    <section className={styles.scene} aria-label="목성 초점 관측 화면">
      <header><span>STEP 07 · FOCUS & OBSERVE</span><h2>작은 빛점이 모이는 순간</h2><p>돌리고, 손을 떼고, 이전 상과 비교하세요.</p></header>
      {s.opened?<>
        <div className={styles.viewbar}><span>{comparison?'기록 위치의 상 재현':'현재 접안 시야'} · 광학 모형</span><Button variant="outline" onClick={()=>setZoom(z=>z===5?1:5)}>{zoom===5?'전체 시야 보기':'중앙 5× 확대 보기'}</Button>{sample&&<Button variant="outline" aria-pressed={comparison} onClick={()=>setComparisonStamp(comparison?null:{motion:s.motion,sample,seeing:s.seeing})}>{comparison?'현재 시야로':'마지막 기록 크게'}</Button>}</div>
        <div className={styles.optics}><Field state={comparison?recorded:s} alignment={alignment} zoom={zoom} phase={comparison?0:phase} label={comparison?'기록 위치의 상을 현재와 같은 크기로 재현':'현재 목성 원반과 위성 빛점의 초점 시야'}/>
          {sample&&<figure className={styles.sample}><Field state={{...s,position:sample.position,seeing:sample.seeing,settled:true,touching:false}} alignment={alignment} zoom={zoom} label="마지막으로 기록한 상"/><figcaption>마지막 관찰 기록</figcaption></figure>}
        </div>
        <p className={styles.caption}>{zoom===5?'화면 중앙을 5배 확대한 학습 보기입니다. 접안렌즈 배율을 바꾼 것이 아닙니다.':'실습 시야 전체입니다. 목성은 작은 원반이고 위성은 빛점입니다.'}<br/>실제 날짜의 위성 배치·사진이 아닌 모형 · 시간을 멈춰 초점에 집중합니다.</p>
        <div className={styles.status}>{s.touching?'손잡이에 손을 댄 상태':!s.settled?'손을 뗀 뒤 진동이 가라앉는 중':'손을 뗀 관찰 상태'} · {s.seeing==='steady'?'비교적 안정된 대기':'일렁이는 대기'}</div>
      </>:<div className={styles.ready}><ObservingRig state={setup} tripod={tripod}/><p>조립과 균형은 그대로 유지합니다.<br/>목성은 6단계에서 찾은 방향에 있습니다.</p></div>}
      <output className={styles.feedback} aria-live="polite"><b>{focusReady(s)?'관측 확인 완료':'관찰 노트'}</b><p>{s.feedback}</p></output>
    </section>
    <aside className={styles.controls} aria-label="초점 조작 패널">
      {!s.opened?<section><h3>저배율로 먼저 보기</h3><p>접안렌즈 고정은 유지합니다. 눈을 유리에 누르지 말고 원형 시야를 볼 수 있는 간격에 둡니다.</p><div className={styles.row}><Button variant="outline" aria-pressed={s.practice==='a'} onClick={()=>onAction({type:'practice',practice:'a'})}>연습 A</Button><Button variant="outline" aria-pressed={s.practice==='b'} onClick={()=>onAction({type:'practice',practice:'b'})}>연습 B</Button></div><small>눈의 초점 조건이 다른 두 교육용 설정입니다.</small><Button onClick={()=>onAction({type:'open'})}>접안 시야 열기</Button></section>:<>
        <section><h3>① 초점 손잡이</h3><p>위성 빛점이 작아지는지 살펴보세요. 손잡이를 좌우로 드래그하거나 아래 버튼을 누릅니다.</p>
          <button className={styles.knob} aria-label="초점 손잡이: 드래그 또는 좌우 방향키" onPointerDown={e=>{if(e.button!==0)return;drag.current=e.clientX;e.currentTarget.setPointerCapture(e.pointerId);onAction({type:'touch'});}} onPointerMove={e=>{if(drag.current===null)return;const delta=e.clientX-drag.current;const steps=Math.floor(Math.abs(delta)/12);if(steps){drag.current=e.clientX;onAction({type:'turn',direction:delta>0?1:-1,steps});}}} onPointerUp={e=>{release();e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={release} onLostPointerCapture={release} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();onAction({type:'turn',direction:e.key==='ArrowRight'?1:-1});}}}>
            <svg viewBox="0 0 180 84" aria-hidden="true"><rect x="5" y="18" width="170" height="48" rx="20" fill="#1f3346" stroke="#6a889a"/>{Array.from({length:13},(_,i)=><path key={i} d={`M${14+i*12} 27v30`} stroke="#8099a7" strokeWidth="2"/>)}<path d={`M${15+((s.position-12)%3)*50} 20v44`} stroke="#85ddd0" strokeWidth="3"/></svg>
          </button>
          <div className={styles.row}><Button variant="outline" onClick={()=>onAction({type:'turn',direction:-1})}>안쪽으로 조금</Button><Button variant="outline" onClick={()=>onAction({type:'turn',direction:1})}>바깥쪽으로 조금</Button></div><Button variant="outline" aria-pressed={s.fine} onClick={()=>onAction({type:'fine'})}>{s.fine?'작은 조절 사용 중':'더 작은 조절로 전환'}</Button>
          <small>방향은 접안부의 이동 방향입니다. 실제 손잡이 회전 방향·감속비는 모델마다 다릅니다.</small>
        </section>
        <section><h3>② 손을 떼고 비교하기</h3><Button variant="outline" onClick={()=>onAction({type:'observe'})}>현재 상 관찰·기록</Button><p>{sample?sample.description:'초기 상을 기록한 뒤 조절하면, 마지막 기록과 현재 상을 나란히 비교할 수 있습니다.'}</p><small>관찰 {s.samples.length}건 보관 · 최근 12건</small>
          <details><summary>초점이 맞아도 흔들릴 수 있나요?</summary><p>손을 댄 뒤의 진동은 잠시 기다립니다. 대기 일렁임은 초점을 돌린다고 없어지지 않습니다. 두 대기 조건을 비교해 보세요.</p><div className={styles.row}><Button variant="outline" aria-pressed={s.seeing==='steady'} onClick={()=>onAction({type:'seeing',seeing:'steady'})}>안정된 대기</Button><Button variant="outline" aria-pressed={s.seeing==='variable'} onClick={()=>onAction({type:'seeing',seeing:'variable'})}>일렁이는 대기</Button></div></details>
        </section>
        <section><h3>③ 실제로 보인 특징</h3><p>현재 상을 기록한 뒤 선택하세요. 순간적으로 또렷해지는 모습을 살펴봐도 됩니다.</p>
          <label><input type="checkbox" checked={s.features.edge} onChange={()=>onAction({type:'feature',feature:'edge'})}/> 목성 원반의 경계가 비교적 또렷하다</label>
          <label><input type="checkbox" checked={s.features.points} onChange={()=>onAction({type:'feature',feature:'points'})}/> 주변 위성 빛점이 작게 모였다</label>
          <Button onClick={()=>onAction({type:'check'})}>이 초점에서 관측 확인</Button>
        </section>
      </>}
      {focusReady(s)&&<section className={styles.report}><h3>첫 관측을 확인했어요</h3><p>숫자가 아니라 목성의 경계와 위성의 빛점을 보고 초점을 확인했습니다.</p><dl><div><dt>방향을 바꾼 횟수</dt><dd>{s.reversals}회</dd></div><div><dt>관찰 힌트</dt><dd>{s.hints}회</dd></div></dl><small>위 값은 점수가 아닙니다. 초점을 지나쳤다는 사실이나 독립 수행을 추정하지 않습니다. 전체 설치 리포트는 추후 제공 예정입니다.</small></section>}
      <details><summary>장비 취급 주의</summary><Button variant="ghost" onClick={()=>onAction({type:'clamp'})}>접안렌즈 고정나사를 풀면?</Button><Button variant="ghost" onClick={()=>onAction({type:'lens'})}>렌즈에 손을 대면?</Button><p>태양·태양 근처를 보지 않습니다. 사진처럼 크고 선명한 목성을 항상 볼 수 있는 것은 아닙니다. 정밀 극축 정렬·자동 추적·접안렌즈 교환은 이 실습 범위 밖입니다.</p></details>
      <Button variant="ghost" onClick={()=>onAction({type:'hint'})}>관찰 힌트 · {s.hints}회</Button><div className={styles.row}><Button variant="outline" onClick={onBack}>6단계 돌아보기</Button>{focusReady(s)&&<Button variant="outline" onClick={onReset}>처음부터 다시 연습</Button>}</div>
    </aside>
  </div>;
}
