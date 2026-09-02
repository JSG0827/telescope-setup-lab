'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, CircleGauge, Compass, Eye, Grip, Move, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stages = ['삼각대', '가대', '균형', '경통', '축 정렬', '파인더', '초점'];
const info = [
  { title:'삼각대 설치와 수평', desc:'준비물대에서 삼각대를 가져와 설치하고, 위에서 수준기를 보며 수평을 맞추세요.', tip:'삼각대의 한쪽 다리가 북쪽을 향하면 이후 극축 정렬이 더 안정적이에요.' },
  { title:'적도의식 가대 설치', desc:'방위 표시 N이 북쪽을 향하는지 확인한 후 가대를 삼각대 위에 결합하세요.', tip:'가대는 지구 자전축과 같은 방향으로 움직여 별을 부드럽게 추적하게 해요.' },
  { title:'무게추 균형 맞추기', desc:'안전 나사를 확인하고 무게추를 봉 위에서 움직여 양쪽 균형을 맞추세요.', tip:'경통을 달기 전에 무게추를 먼저 설치해야 갑작스러운 회전과 낙하를 막을 수 있어요.' },
  { title:'경통 고정하기', desc:'도브테일 레일을 안장 홈에 끝까지 넣고 잠금 손잡이를 조이세요.', tip:'경통을 한 손으로 계속 받친 채 잠금 손잡이가 단단한지 확인하세요.' },
  { title:'적경·적위 수평 맞추기', desc:'각 축의 클러치를 풀어 수평 위치를 찾은 뒤 다시 잠그세요.', tip:'두 축에서 어느 방향으로도 저절로 돌아가지 않아야 정확한 균형 상태예요.' },
  { title:'파인더 정렬하기', desc:'파인더의 십자선을 주경 화면의 밝은 별과 정확히 겹치게 하세요.', tip:'먼 지상의 물체로 낮에 미리 맞추면 밤에 별을 찾는 시간이 훨씬 짧아져요.' },
  { title:'목성에 초점 맞추기', desc:'초점 손잡이를 천천히 돌려 목성의 가장자리가 가장 또렷해지는 지점을 찾으세요.', tip:'초점 지점을 지나쳤다면 반대 방향으로 아주 조금씩 되돌리세요.' },
];

type TripodPhase = 'shelf' | 'placed' | 'spread' | 'level';
const initial = [28,0,78,0,27,72,22,76,18,72];

export default function Home() {
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState(0);
  const [values, setValues] = useState(initial);
  const [tripodPhase, setTripodPhase] = useState<TripodPhase>('shelf');
  const [tripodPos, setTripodPos] = useState({x:28,y:170});
  const [dragging, setDragging] = useState(false);
  const [dropHint, setDropHint] = useState(false);
  const [complete, setComplete] = useState(false);
  const setValue = (index:number, value:number) => setValues(v => v.map((n,i)=>i===index?value:n));

  useEffect(() => {
    const saved = localStorage.getItem('telescope-lab-progress');
    if (saved) try {
      const data=JSON.parse(saved);
      setStage(Math.min(data.stage ?? 0,6));
      setValues(initial.map((n,i)=>typeof data.values?.[i]==='number'?data.values[i]:n));
      setTripodPhase(data.tripodPhase ?? ((data.stage ?? 0)>0?'level':'shelf'));
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem('telescope-lab-progress',JSON.stringify({stage,values,tripodPhase})); }, [stage,values,tripodPhase]);

  const levelPassed = Math.abs(values[0]-50)<4 && Math.abs(values[9]-50)<4;
  const passed = useMemo(() => [
    tripodPhase==='level' && levelPassed, values[1]===1, Math.abs(values[2]-50)<6, values[3]===1,
    Math.abs(values[4]-50)<6 && Math.abs(values[5]-50)<6,
    Math.abs(values[6]-50)<7 && Math.abs(values[7]-50)<7,
    Math.abs(values[8]-50)<6,
  ][stage], [stage,values,tripodPhase,levelPassed]);

  const reset = () => { setStage(0); setValues(initial); setTripodPhase('shelf'); setTripodPos({x:28,y:170}); setComplete(false); localStorage.removeItem('telescope-lab-progress'); };
  const next = () => stage===6 ? setComplete(true) : setStage(s=>s+1);
  const phaseCopy = tripodPhase==='shelf'
    ? {title:'삼각대 가져오기',desc:'준비물대의 접힌 삼각대를 잡아 빛나는 설치 원 안으로 드래그하세요.'}
    : tripodPhase==='placed'
      ? {title:'삼각대 다리 펼치기',desc:'설치 위치가 맞습니다. 이제 세 개의 다리를 끝까지 펼쳐 지면에 안정적으로 세우세요.'}
      : tripodPhase==='spread'
        ? {title:'수준기 확인하기',desc:'삼각대가 안정적으로 섰습니다. 삼각대 위에서 원형 기포 수준기를 들여다보세요.'}
        : {title:'위에서 보며 수평 맞추기',desc:'상부 수준기의 기포가 중앙 원 안으로 들어오도록 동쪽·남쪽 다리 높이를 조절하세요.'};

  const dragMove = (e:React.PointerEvent<HTMLDivElement>) => {
    if(!dragging)return;
    const bench=e.currentTarget.parentElement?.getBoundingClientRect();
    if(!bench)return;
    const x=e.clientX-bench.left-58, y=e.clientY-bench.top-95;
    setTripodPos({x,y});
    setDropHint(Math.abs(e.clientX-(bench.left+bench.width*.57))<145 && e.clientY>bench.top+bench.height*.38);
  };
  const dragEnd = (e:React.PointerEvent<HTMLDivElement>) => {
    if(!dragging)return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    if(dropHint){setTripodPhase('placed');setTripodPos({x:0,y:0});}
    else setTripodPos({x:28,y:170});
    setDropHint(false);
  };

  if (!started) return (
    <main className="sim-shell intro">
      <section className="intro-card glass"><div className="eyebrow"><Sparkles size={14}/> ASTRONOMY FIELD LAB · MISSION 01</div><h1>오늘 밤, 직접<br/><em>망원경을 세워보세요.</em></h1><p>준비물대에서 장비를 꺼내고 수평과 균형을 맞춰, 첫 천체 관측까지 완성하는 실전 시뮬레이션입니다.</p><div className="mission-meta"><span>예상 12분</span><span>중학교 영재 수업</span><span>직접 조작</span></div><Button className="launch" onClick={()=>setStarted(true)}>관측 임무 시작 <ChevronRight/></Button></section>
      <div className="intro-mark">TELESCOPE<br/>SETUP LAB</div>
    </main>
  );

  return (
    <main className="sim-shell">
      <header className="topbar glass"><div className="brand"><span className="brand-icon">✦</span><div><b>TELESCOPE LAB</b><small>FIELD TRAINING 01</small></div></div><div className="progress-wrap"><span>설치 진행도</span><b>{complete?100:Math.round((stage/7)*100)}%</b><div className="progress"><i style={{width:`${complete?100:(stage/7)*100}%`}}/></div></div><Button variant="ghost" size="icon" aria-label="처음부터" onClick={reset}><RotateCcw/></Button></header>

      <aside className="steps glass" aria-label="설치 단계"><p className="panel-label">ASSEMBLY SEQUENCE</p>{stages.map((name,i)=><button key={name} className={`${i===stage?'active':''} ${i<stage||complete?'done':''}`} disabled={i>stage} onClick={()=>i<stage&&setStage(i)}><span>{i<stage||complete?<Check/>:i+1}</span><div><small>STEP {String(i+1).padStart(2,'0')}</small><b>{name}</b></div></button>)}</aside>

      <section className={`workbench ${stage===0&&tripodPhase==='level'?'level-camera':''}`}>
        <div className="scene-status"><span><Compass/> 방위 000° N</span><span><CircleGauge/> 단계 {stage+1}/7</span>{stage===0&&<span className="camera-chip">{tripodPhase==='level'?<><Eye/> TOP VIEW</>:<><Move/> FIELD VIEW</>}</span>}</div>
        {stage===0&&<EquipmentRack empty={tripodPhase!=='shelf'}/>} 
        {stage===0&&tripodPhase==='shelf'&&<div role="button" tabIndex={0} aria-label="접힌 삼각대. 설치 위치로 드래그하세요" className={`draggable-tripod ${dragging?'dragging':''}`} style={{left:tripodPos.x,top:tripodPos.y}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDragging(true)}} onPointerMove={dragMove} onPointerUp={dragEnd}><Grip/><FoldedTripod/><span>잡아서 드래그</span></div>}
        {stage===0&&tripodPhase!=='shelf'&&tripodPhase!=='level'&&<TripodModel folded={tripodPhase==='placed'} tiltX={0} tiltY={0}/>} 
        {stage>0&&<TelescopeModel stage={stage} counter={values[2]}/>} 
        {stage===0&&tripodPhase==='shelf'&&<div className={`drop-zone ${dropHint?'ready':''}`}><div className="drop-rings"/><b>{dropHint?'여기에 놓으세요':'삼각대 설치 위치'}</b><small>NORTH LEG</small></div>}
        {stage===0&&tripodPhase!=='shelf'&&tripodPhase!=='level'&&<div className="ground-ring installed"/>}
        {stage===0&&tripodPhase==='level'&&<div className="top-level-inspection"><div className="tripod-top-plate"><span className="north-mark">N</span><div className={`round-level ${levelPassed?'ok':''}`}><div className="level-target"/><i style={{left:`${values[0]}%`,top:`${values[9]}%`}}/></div><div className="bolt b1"/><div className="bolt b2"/><div className="bolt b3"/></div><div className="camera-caption"><span>상부 카메라 · 90°</span><b>{levelPassed?'수평 기준 확보':'기포를 중앙 원 안으로 이동'}</b></div></div>}
        {stage===5&&<div className="finder-view"><div className="target-star"/><div className="crosshair" style={{left:`${values[6]}%`,top:`${values[7]}%`}}/></div>}
        {stage===6&&<div className="eyepiece-view"><div className="jupiter" style={{filter:`blur(${Math.abs(values[8]-50)/7}px)`}}><i/></div><small>{passed?'초점이 정확합니다':'초점 손잡이를 조절하세요'}</small></div>}
      </section>

      <aside className="task-panel glass"><div className="task-no">STEP {String(stage+1).padStart(2,'0')} / 07</div><h2>{stage===0?phaseCopy.title:info[stage].title}</h2><p>{stage===0?phaseCopy.desc:info[stage].desc}</p><div className="tip"><b>관측 노트</b><span>{info[stage].tip}</span></div><Controls stage={stage} values={values} setValue={setValue} tripodPhase={tripodPhase} setTripodPhase={setTripodPhase}/>{stage===0&&tripodPhase!=='level'?<div className="mini-sequence"><span className={tripodPhase!=='shelf'?'done':''}>1 위치</span><span className={tripodPhase==='spread'?'done':''}>2 펼치기</span><span>3 수평</span></div>:<div className={`check-state ${passed?'pass':''}`}>{passed?<><Check/> 조건을 만족했습니다</>:<>● 완료 조건을 찾아보세요</>}</div>}<Button className="next" disabled={!passed} onClick={next}>{stage===6?'관측 결과 확인':'다음 단계로'} <ChevronRight/></Button></aside>

      {complete&&<div className="complete-overlay"><section className="complete-card glass"><Trophy/><div className="eyebrow">MISSION COMPLETE</div><h2>첫 관측에 성공했어요!</h2><p>7단계 설치를 모두 마치고 목성에 정확히 초점을 맞췄습니다.</p><div className="score"><b>7 / 7</b><span>완료 단계</span></div><Button className="launch" onClick={reset}>한 번 더 연습하기 <RotateCcw/></Button></section></div>}
      <footer><span>관측지 · 해발 640m</span><span>맑음 · 시상 4/5</span><span>진행 상황 자동 저장</span></footer>
    </main>
  );
}

function EquipmentRack({empty}:{empty:boolean}) { return <div className="equipment-rack glass"><div className="rack-title"><span>준비물대</span><small>EQUIPMENT 01</small></div><div className={`rack-slot ${empty?'empty':''}`}><span>삼각대</span><small>{empty?'사용 중':'ALUMINUM TRIPOD'}</small></div><div className="rack-parts"><i/><i/><i/></div></div>; }
function FoldedTripod(){return <div className="folded-stand"><div className="folded-head"/><i/><i/><i/><b/></div>}
function TripodModel({folded,tiltX,tiltY}:{folded:boolean,tiltX:number,tiltY:number}){return <div className={`tripod-model ${folded?'folded':''}`} style={{rotate:`${tiltX+tiltY}deg`}}><div className="tripod-platform"><i/><b/></div><div className="column"><i/></div><div className="brace-ring"/><div className="tripod-leg tl1"><i/></div><div className="tripod-leg tl2"><i/></div><div className="tripod-leg tl3"><i/></div><div className="spread-brace sb1"/><div className="spread-brace sb2"/><div className="spread-brace sb3"/></div>}
function TelescopeModel({stage,counter}:{stage:number,counter:number}){return <div className="telescope-pro"><TripodModel folded={false} tiltX={0} tiltY={0}/>{stage>=1&&<div className="eq-mount"><div className="latitude-scale">37°</div><div className="ra-body"/><div className="dec-body"/><div className="slow-knob"/><div className="dovetail-saddle"/></div>}{stage>=2&&<><div className="pro-weight-rod"/><div className="pro-counterweight" style={{top:`${158+(counter-50)*.3}px`}}/></>}{stage>=3&&<div className="optical-tube"><div className="dew-shield"/><div className="tube-body"><i className="tube-highlight"/><span className="tube-label">D 80 · F 600</span></div><div className="focuser"><b/><i/></div><div className="eyepiece"/><div className="tube-ring tr1"/><div className="tube-ring tr2"/>{stage>=5&&<div className="pro-finder"><i/></div>}</div>}{stage>=4&&<><div className="axis-glow ra"/><div className="axis-glow dec"/></>}</div>}
function Range({label,value,index,setValue}:{label:string,value:number,index:number,setValue:(i:number,v:number)=>void}){return <label>{label}<output>{value}</output><input aria-label={label} type="range" min="0" max="100" value={value} onChange={e=>setValue(index,+e.target.value)}/></label>}
function Controls({stage,values,setValue,tripodPhase,setTripodPhase}:{stage:number,values:number[],setValue:(i:number,v:number)=>void,tripodPhase:TripodPhase,setTripodPhase:(p:TripodPhase)=>void}){
  if(stage===0){if(tripodPhase==='shelf')return <div className="drag-guide"><Move/><span>삼각대를 누른 채 설치 원까지 이동하세요.</span></div>;if(tripodPhase==='placed')return <Button className="action-button" variant="outline" onClick={()=>setTripodPhase('spread')}>세 다리 끝까지 펼치기</Button>;if(tripodPhase==='spread')return <Button className="action-button" variant="outline" onClick={()=>setTripodPhase('level')}><Eye/> 상부 수준기 들여다보기</Button>;return <><Range label="동쪽 다리 높이" value={values[0]} index={0} setValue={setValue}/><Range label="남쪽 다리 높이" value={values[9]} index={9} setValue={setValue}/></>}
  if(stage===1)return <Button className={`action-button ${values[1]?'installed':''}`} variant="outline" onClick={()=>setValue(1,1)}>{values[1]?<><Check/> 가대가 고정되었습니다</>:'가대를 삼각대에 올려놓기'}</Button>;
  if(stage===2)return <Range label="무게추 위치" value={values[2]} index={2} setValue={setValue}/>;
  if(stage===3)return <Button className={`action-button ${values[3]?'installed':''}`} variant="outline" onClick={()=>setValue(3,1)}>{values[3]?<><Check/> 경통 잠금 완료</>:'경통을 안장 홈에 결합하기'}</Button>;
  if(stage===4)return <><Range label="적경축 각도" value={values[4]} index={4} setValue={setValue}/><Range label="적위축 각도" value={values[5]} index={5} setValue={setValue}/></>;
  if(stage===5)return <><Range label="파인더 좌우" value={values[6]} index={6} setValue={setValue}/><Range label="파인더 상하" value={values[7]} index={7} setValue={setValue}/></>;
  return <Range label="초점 손잡이" value={values[8]} index={8} setValue={setValue}/>;
}
