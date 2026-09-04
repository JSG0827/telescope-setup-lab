'use client';
import {useRef,useState} from 'react';
import {Button} from './ui/button';
import {TripodRig} from './tripod-rig';
import {CounterweightArt} from './counterweight-art';
import {AccessoryArt,ObservingTube,CONNECTIONS,PART_POINTS} from './observing-art';
import {tubeRig} from '@/lib/tube-rig';
import {counterweightRig} from '@/lib/counterweight-rig';
import {PARTS,PART_LABELS,accessoriesReady,setupReady, type SetupState,type SetupAction,type Axis} from '@/lib/observing-setup';
import {type TripodState} from '@/lib/tripod';
import common from './tripod-lesson.module.css';
import styles from './observing-lesson.module.css';

export function ObservingLesson({state:s,tripod,prerequisite,readOnly=false,onAction,onBack,onAdvance}:{state:SetupState;tripod:TripodState;prerequisite:boolean;readOnly?:boolean;onAction:(a:SetupAction)=>void;onBack:()=>void;onAdvance:()=>void}) {
  const target=useRef<SVGCircleElement>(null), marker=useRef<SVGCircleElement>(null);
  const origin=useRef<{x:number;y:number;mx:number;my:number}|null>(null);
  const [drag,setDrag]=useState<{x:number;y:number}|null>(null);
  const p=s.selected,status=s.parts[p],name=PART_LABELS[p],point=PART_POINTS[p],connection=CONNECTIONS[p];
  const axis:Axis|null=s.view==='ra'||s.view==='dec'?s.view:null;
  const rig=tubeRig(tripod,true),cw=counterweightRig(tripod,s.weight);
  const angle=s.observed?.axis===axis?Math.max(-13,Math.min(13,s.observed.moment*(axis==='ra'?50:160))):0;
  const inside=(x:number,y:number)=>{const r=target.current?.getBoundingClientRect();return !!r&&Math.hypot((x-r.left-r.width/2)/(r.width/2),(y-r.top-r.height/2)/(r.height/2))<=1;};
  const cancel=()=>{origin.current=null;setDrag(null);};
  return <div className={common.lesson}>
    <section className={common.scene} aria-label="부속품과 균형 작업 화면">
      <div className={common.sceneBar}><span>STEP 05 · 부속품과 균형</span><div><Button variant="outline" onClick={()=>onAction({type:'view',view:'assembly'})}>전체</Button><Button variant="outline" onClick={()=>onAction({type:'view',view:'detail'})}>결합부</Button></div></div>
      {!axis ? <>
        {s.view==='assembly'?<TripodRig state={tripod} mounted className={styles.rig} viewBox="-220 -1200 1750 2700">
          <g transform={cw.transform}><g transform={`translate(${cw.end.x} ${cw.end.y}) rotate(7.5) scale(1.3)`}><CounterweightArt stopper/></g><g transform={`translate(${cw.weight.x} ${cw.weight.y}) rotate(7.5) scale(.8)`}><CounterweightArt/></g></g>
          <g transform={rig.mountTransform}><g transform={rig.tubeTransform}><g transform={`translate(${-s.offset*3.6} ${-s.offset*1.7})`}><ObservingTube state={s}/></g></g></g>
        </TripodRig>:<svg className={`${styles.detail} ${status!=='rack'?styles.noRack:''}`} viewBox="-60 -200 2080 1400" role="img" aria-label="경통과 부속품 결합부 확대"><g transform={`translate(${-s.offset*3.6} ${-s.offset*1.7})`}><ObservingTube state={s}/>
          {status==='rack'&&<g><circle ref={target} data-accessory-target cx={connection.x} cy={connection.y} r="95"/><text x={connection.x} y={connection.y+170} textAnchor="middle">{p==='finder'?'파인더 슈':p==='diagonal'?'포커서 소켓':'천정미러 소켓'}</text></g>}
        </g></svg>}
        {status==='rack'&&<div className={styles.rack}><b>준비물대 · {name}</b><button aria-label={`${name} 드래그 또는 Enter로 장착`} className={styles.dragPart} style={drag?{transform:`translate(${drag.x}px,${drag.y}px)`}:undefined}
          onPointerDown={e=>{if(e.button!==0)return;const r=marker.current?.getBoundingClientRect();if(!r)return;origin.current={x:e.clientX,y:e.clientY,mx:r.left+r.width/2,my:r.top+r.height/2};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{const o=origin.current;if(o)setDrag({x:e.clientX-o.x,y:e.clientY-o.y});}}
          onPointerUp={e=>{const o=origin.current;if(!o)return;onAction({type:inside(o.mx+e.clientX-o.x,o.my+e.clientY-o.y)?'place':'miss'});e.currentTarget.releasePointerCapture(e.pointerId);cancel();}} onPointerCancel={cancel}
          onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onAction({type:'place'});}}}>
          <svg viewBox={p==='eyepiece'?'0 0 1024 1536':'0 0 1536 1024'} aria-hidden="true"><AccessoryArt part={p}/><circle ref={marker} cx={point.x} cy={point.y} r="40"/></svg>
        </button><small>{s.view==='assembly'?'결합부 보기를 열어 장착하세요.':'작은 기준점을 소켓으로 옮기세요.'}</small></div>}
      </>:<div className={styles.axisView}>
        <p>{axis==='ra'?'적경축 · 무게추 봉 수평':'적위축 · 경통 수평'}<small>축별 시험 자세를 펼쳐 본 2D 모형 · 다른 축은 잠금</small></p>
        <svg viewBox="0 0 1000 610" role="img" aria-label={`${axis==='ra'?'적경':'적위'}축 회전 경향 ${s.observed?s.tested[axis]?'거의 움직이지 않음':angle>0?'오른쪽 내려감':'왼쪽 내려감':'시험 전'}`}>
          <path d="M50 400H950" className={styles.reference}/><path d="M500 400V560" className={styles.axis}/>
          <g data-balance-angle={angle} transform={`rotate(${angle} 500 400)`} className={styles.moving}>
            {axis==='ra'?<>
              <path d="M100 400H760" className={styles.rod}/>
              <g transform={`translate(${500-(.10+.006*s.weight)*650} 400) scale(.6)`}><CounterweightArt/></g>
              <g transform="translate(662 350) scale(.28) rotate(-25) translate(-780 -766)"><ObservingTube state={s}/></g>
              <text x="210" y="495" textAnchor="middle">무게추</text><text x="750" y="495" textAnchor="middle">관측 구성 전체</text>
            </>:<g transform={`translate(${500-s.offset*3} 365) scale(.5) rotate(-25) translate(-780 -766)`}><ObservingTube state={s}/></g>}
          </g><circle cx="500" cy="400" r="14" className={styles.pivot}/><text x="500" y="585" textAnchor="middle">{axis==='ra'?'적경축':'적위축'} 회전 중심</text>
        </svg>
        <div className={styles.axisStatus}>{s.free===axis?'현재 축 풀림':'현재 축 잠김'} · {s.supported?'받침 유지':s.checked?'확인 후 손 뗌':'장비 받침 필요'}<br/>{readOnly?'완료한 균형 기록과 장비 구성을 관찰하는 모드입니다.':s.observed?.axis===axis?s.tested[axis]?'회전 경향이 허용 범위 안입니다.':'한쪽으로 돌아가려 합니다. 방향을 보고 조절하세요.':'고정나사를 잠근 채 회전 경향을 시험하세요.'}</div>
      </div>}
      <div className={common.feedback} role="status" aria-live="polite">{s.feedback}</div>
    </section>
    <aside className={common.controls} aria-label="부속품과 균형 조작">
      <span className={common.kicker}>관측 구성 → 적경 → 적위 → 재확인</span><h2>{axis?axis==='ra'?'적경축 균형':'적위축 균형':'관측할 부속품 먼저 장착'}</h2>
      {!prerequisite&&<p>경통 고정 확인을 먼저 마쳐 주세요.</p>}
      {readOnly&&<p>정렬을 시작한 구성입니다. 여기서는 장착 상태와 두 축의 모형을 관찰합니다. 다시 조작하려면 처음부터 연습하세요.</p>}
      {!axis?<>
        <div className={styles.tabs}>{PARTS.map(part=><Button key={part} variant="outline" aria-pressed={part===p} onClick={()=>onAction({type:'select',part})}>{PART_LABELS[part]} {s.parts[part]==='checked'?'✓':''}</Button>)}</div>
        <p>{name} · {{rack:'준비물대',placed:'입구에 놓임',seated:'안착됨',fixed:'고정됨 · 시험 필요',checked:'고정 확인 완료'}[status]}</p>
        <Button variant="outline" onClick={()=>onAction({type:'inspect'})}>결합 방향과 고정나사 관찰</Button>
        <Button variant="outline" aria-pressed={s.holding} onClick={()=>onAction({type:'hold'})}>{s.holding?'부품에서 손 떼기':`${name} 몸체 받치기`}</Button>
        <Button variant="outline" onClick={()=>onAction({type:'open'})}>부속품 고정나사 조금 풀기</Button>
        {status!=='rack'&&<><Button variant="outline" onClick={()=>onAction({type:'seat'})}>받친 채 끝까지 안착</Button><Button variant="outline" onClick={()=>onAction({type:'fix'})}>부속품 고정나사 조이기</Button><Button variant="outline" onClick={()=>onAction({type:'part-test'})}>받친 채 부속품 고정 확인</Button><Button variant="ghost" onClick={()=>onAction({type:'remove'})}>부품을 준비물대로 되돌리기</Button></>}
        <Button variant="ghost" onClick={()=>onAction({type:'lens'})}>렌즈면을 잡으면?</Button>
      </>:<>
        <p>{axis==='ra'?'경통 쪽과 무게추 쪽 중 어디가 내려가나요?':'대물렌즈 쪽과 접안부 쪽 중 어디가 내려가나요?'}</p>
        <Button variant="outline" onClick={()=>onAction({type:'clutch',axis})}>{axis==='ra'?'적경':'적위'} 클러치 {s.free===axis?'잠그기':'풀기'}</Button>
        <Button variant="outline" onClick={()=>onAction({type:axis==='ra'?'weight-clamp':'tube-clamp'})}>{axis==='ra'?'무게추':'경통 안장'} 위치 고정 {(axis==='ra'?s.weightOpen:s.tubeOpen)?'잠그기':'조금 풀기'}</Button>
        <label className={styles.range}>{axis==='ra'?'봉 위 무게추 위치':'경통 앞뒤 위치'}<input type="range" aria-label={axis==='ra'?'봉 위 무게추 위치':'경통 앞뒤 위치'} min={axis==='ra'?15:-60} max={axis==='ra'?75:60} value={axis==='ra'?s.weight:s.offset} onChange={e=>onAction({type:'move',axis,value:+e.target.value})}/><span>{axis==='ra'?'← 축 쪽 · 봉 끝 쪽 →':'← 접안부 방향 · 대물렌즈 방향 →'}</span></label>
        <Button variant="outline" onClick={()=>onAction({type:'test'})}>받친 채 지지력을 줄여 회전 시험</Button>
        <p className={common.small}>시험은 손을 완전히 떼는 행동이 아닙니다. 이동 범위와 회전각은 교육용이며 실제 장비의 설명서를 따르세요.</p>
      </>}
      <Button variant="outline" aria-pressed={s.supported} onClick={()=>onAction({type:'support'})}>{s.supported?'장비에서 손 떼기':'장비와 이동할 부품 받치기'}</Button>
      <div className={styles.tabs}><Button variant="outline" onClick={()=>onAction({type:'view',view:'ra'})}>적경 시험 자세</Button><Button variant="outline" onClick={()=>onAction({type:'view',view:'dec'})}>적위 시험 자세</Button></div>
      <div className={common.checks}><span>{accessoriesReady(s)?'✓':'○'} 부속품 고정</span><span>{s.tested.ra?'✓':'○'} 적경 시험</span><span>{s.tested.dec?'✓':'○'} 적위 시험</span><span>{!s.free?'✓':'○'} 두 축 잠금</span></div>
      <p className={styles.mobileFeedback}>{s.feedback}</p>
      <Button variant="outline" onClick={()=>onAction({type:'check'})}>관측 구성·두 축 균형 최종 확인</Button>
      <Button variant="ghost" onClick={()=>onAction({type:'hint'})}>힌트 보기 · {s.hints}회</Button>
      <Button className={common.advance} aria-disabled={!setupReady(s)} onClick={()=>setupReady(s)?onAdvance():onAction({type:'check'})}>파인더 정렬로 이동 →</Button>
      <Button variant="ghost" onClick={onBack}>경통 설치 다시 보기</Button>
    </aside>
  </div>;
}
