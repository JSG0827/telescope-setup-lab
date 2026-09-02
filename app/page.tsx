'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, CircleGauge, Compass, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stages = ['삼각대', '가대', '균형', '경통', '축 정렬', '파인더', '초점'];
const info = [
  { title:'삼각대 수평 맞추기', desc:'다리 길이를 조절해 기포가 원의 정중앙에 오도록 맞추세요.', tip:'수평이 틀어지면 별을 추적할 때 가대의 축이 조금씩 어긋나요.' },
  { title:'적도의식 가대 설치', desc:'방위 표시 N이 북쪽을 향하는지 확인한 후 가대를 삼각대 위에 결합하세요.', tip:'가대는 지구 자전축과 같은 방향으로 움직여 별을 부드럽게 추적하게 해요.' },
  { title:'무게추 균형 맞추기', desc:'안전 나사를 확인하고 무게추를 봉 위에서 움직여 양쪽 균형을 맞추세요.', tip:'경통을 달기 전에 무게추를 먼저 설치해야 갑작스러운 회전과 낙하를 막을 수 있어요.' },
  { title:'경통 고정하기', desc:'도브테일 레일을 안장 홈에 끝까지 넣고 잠금 손잡이를 조이세요.', tip:'경통을 한 손으로 계속 받친 채 잠금 손잡이가 단단한지 확인하세요.' },
  { title:'적경·적위 수평 맞추기', desc:'각 축의 클러치를 풀어 수평 위치를 찾은 뒤 다시 잠그세요.', tip:'두 축에서 어느 방향으로도 저절로 돌아가지 않아야 정확한 균형 상태예요.' },
  { title:'파인더 정렬하기', desc:'파인더의 십자선을 주경 화면의 밝은 별과 정확히 겹치게 하세요.', tip:'먼 지상의 물체로 낮에 미리 맞추면 밤에 별을 찾는 시간이 훨씬 짧아져요.' },
  { title:'목성에 초점 맞추기', desc:'초점 손잡이를 천천히 돌려 목성의 가장자리가 가장 또렷해지는 지점을 찾으세요.', tip:'초점 지점을 지나쳤다면 반대 방향으로 아주 조금씩 되돌리세요.' },
];

const initial = [28,0,78,0,27,72,22,76,18];

export default function Home() {
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState(0);
  const [values, setValues] = useState(initial);
  const [complete, setComplete] = useState(false);
  const setValue = (index:number, value:number) => setValues(v => v.map((n,i)=>i===index?value:n));

  useEffect(() => {
    const saved = localStorage.getItem('telescope-lab-progress');
    if (saved) try { const data=JSON.parse(saved); setStage(Math.min(data.stage ?? 0,6)); setValues(data.values ?? initial); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem('telescope-lab-progress',JSON.stringify({stage,values})); }, [stage,values]);

  const passed = useMemo(() => [
    Math.abs(values[0]-50)<4, values[1]===1, Math.abs(values[2]-50)<6, values[3]===1,
    Math.abs(values[4]-50)<6 && Math.abs(values[5]-50)<6,
    Math.abs(values[6]-50)<7 && Math.abs(values[7]-50)<7,
    Math.abs(values[8]-50)<6,
  ][stage], [stage,values]);
  const reset = () => { setStage(0); setValues(initial); setComplete(false); localStorage.removeItem('telescope-lab-progress'); };
  const next = () => stage===6 ? setComplete(true) : setStage(s=>s+1);

  if (!started) return (
    <main className="sim-shell intro">
      <section className="intro-card glass">
        <div className="eyebrow"><Sparkles size={14}/> ASTRONOMY FIELD LAB · MISSION 01</div>
        <h1>오늘 밤, 직접<br/><em>망원경을 세워보세요.</em></h1>
        <p>부품을 놓고, 수평과 균형을 맞추고, 별빛에 초점을 맞추는 7단계 실전 관측 시뮬레이션입니다.</p>
        <div className="mission-meta"><span>예상 12분</span><span>중학교 영재 수업</span><span>개인 실습</span></div>
        <Button className="launch" onClick={() => setStarted(true)}>관측 임무 시작 <ChevronRight/></Button>
      </section>
      <div className="intro-mark">TELESCOPE<br/>SETUP LAB</div>
    </main>
  );

  return (
    <main className="sim-shell">
      <header className="topbar glass">
        <div className="brand"><span className="brand-icon">✦</span><div><b>TELESCOPE LAB</b><small>FIELD TRAINING 01</small></div></div>
        <div className="progress-wrap"><span>설치 진행도</span><b>{complete ? 100 : Math.round((stage / 7) * 100)}%</b><div className="progress"><i style={{width:`${complete ? 100 : (stage / 7) * 100}%`}}/></div></div>
        <Button variant="ghost" size="icon" aria-label="처음부터" onClick={reset}><RotateCcw/></Button>
      </header>

      <aside className="steps glass" aria-label="설치 단계">
        <p className="panel-label">ASSEMBLY SEQUENCE</p>
        {stages.map((name,i)=><button key={name} className={`${i===stage?'active':''} ${i<stage||complete?'done':''}`} disabled={i>stage} onClick={()=>i<stage&&setStage(i)}><span>{i<stage||complete?<Check/>:i+1}</span><div><small>STEP {String(i+1).padStart(2,'0')}</small><b>{name}</b></div></button>)}
      </aside>

      <section className="workbench">
        <div className="scene-status"><span><Compass/> 방위 000° N</span><span><CircleGauge/> 단계 {stage+1}/7</span></div>
        <div className={`telescope stage-${stage}`} style={{transform:`translateX(-50%) rotate(${stage===0?(values[0]-50)/8:0}deg)`}} aria-label="조립 중인 적도의식 망원경">
          <div className="mount-head"/><div className="tripod-center"/><div className="leg leg-a"/><div className="leg leg-b"/><div className="leg leg-c"/>
          {stage>=1&&<><div className="axis-housing"/><div className="polar-axis"/></>}
          {stage>=2&&<><div className="weight-rod"/><div className="counterweight" style={{top:`${120+(values[2]-50)*.35}px`}}/></>}
          {stage>=3&&<><div className="tube"><i/><b/></div></>}
          {stage>=4&&<><div className="ra-ring"/><div className="dec-ring"/></>}
          {stage>=5&&<div className="finder"/>}
        </div>
        <div className="ground-ring"/>
        {stage===0&&<div className={`level-bubble ${passed?'ok':''}`}><i style={{left:`${values[0]}%`}}/><span>{passed?'수평 완료':'기포를 중앙으로'}</span></div>}
        {stage===5&&<div className="finder-view"><div className="target-star"/><div className="crosshair" style={{left:`${values[6]}%`,top:`${values[7]}%`}}/></div>}
        {stage===6&&<div className="eyepiece-view"><div className="jupiter" style={{filter:`blur(${Math.abs(values[8]-50)/7}px)`}}><i/><b/><span/><em/></div><small>{passed?'초점이 정확합니다':'초점 손잡이를 조절하세요'}</small></div>}
      </section>

      <aside className="task-panel glass">
        <div className="task-no">STEP {String(stage+1).padStart(2,'0')} / 07</div><h2>{info[stage].title}</h2><p>{info[stage].desc}</p>
        <div className="tip"><b>관측 노트</b><span>{info[stage].tip}</span></div>
        <Controls stage={stage} values={values} setValue={setValue}/>
        <div className={`check-state ${passed?'pass':''}`}>{passed?<><Check/> 조건을 만족했습니다</>:<>● 완료 조건을 찾아보세요</>}</div>
        <Button className="next" disabled={!passed} onClick={next}>{stage===6?'관측 결과 확인':'다음 단계로'} <ChevronRight/></Button>
      </aside>

      {complete&&<div className="complete-overlay"><section className="complete-card glass"><Trophy/><div className="eyebrow">MISSION COMPLETE</div><h2>첫 관측에 성공했어요!</h2><p>7단계 설치를 모두 마치고 목성에 정확히 초점을 맞췄습니다.</p><div className="score"><b>7 / 7</b><span>완료 단계</span></div><Button className="launch" onClick={reset}>한 번 더 연습하기 <RotateCcw/></Button></section></div>}
      <footer><span>관측지 · 해발 640m</span><span>맑음 · 시상 4/5</span><span>진행 상황 자동 저장</span></footer>
    </main>
  );
}

function Range({label,value,index,setValue}:{label:string,value:number,index:number,setValue:(i:number,v:number)=>void}) {
  return <label>{label}<output>{value}</output><input aria-label={label} type="range" min="0" max="100" value={value} onChange={e=>setValue(index,+e.target.value)}/></label>;
}
function Controls({stage,values,setValue}:{stage:number,values:number[],setValue:(i:number,v:number)=>void}) {
  if(stage===0)return <Range label="왼쪽 다리 길이" value={values[0]} index={0} setValue={setValue}/>;
  if(stage===1)return <Button className={`action-button ${values[1]?'installed':''}`} variant="outline" onClick={()=>setValue(1,1)}>{values[1]?<><Check/> 가대가 고정되었습니다</>:'가대를 삼각대에 올려놓기'}</Button>;
  if(stage===2)return <Range label="무게추 위치" value={values[2]} index={2} setValue={setValue}/>;
  if(stage===3)return <Button className={`action-button ${values[3]?'installed':''}`} variant="outline" onClick={()=>setValue(3,1)}>{values[3]?<><Check/> 경통 잠금 완료</>:'경통을 안장 홈에 결합하기'}</Button>;
  if(stage===4)return <><Range label="적경축 각도" value={values[4]} index={4} setValue={setValue}/><Range label="적위축 각도" value={values[5]} index={5} setValue={setValue}/></>;
  if(stage===5)return <><Range label="파인더 좌우" value={values[6]} index={6} setValue={setValue}/><Range label="파인더 상하" value={values[7]} index={7} setValue={setValue}/></>;
  return <Range label="초점 손잡이" value={values[8]} index={8} setValue={setValue}/>;
}
