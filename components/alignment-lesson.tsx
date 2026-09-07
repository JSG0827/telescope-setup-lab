'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG diagrams need an accessible image role; replacing them with img would remove their dynamic optical geometry. */
import {Button} from './ui/button';
import {ObservingRig} from './observing-art';
import {type SetupState} from '@/lib/observing-setup';
import {type TripodState} from '@/lib/tripod';
import {SKY,project,alignmentReady,type AlignmentState,type AlignmentAction} from '@/lib/alignment';
import styles from './alignment-lesson.module.css';

function OpticalView({state:s,view}:{state:AlignmentState;view:'main'|'finder'}) {
  const main=view==='main';
  return <figure className={styles.optic}>
    <figcaption><b>{main?'주망원경':'파인더'}</b><span>{main?'좁은 시야 · 저배율':'넓은 시야 · 고정 십자선'}</span></figcaption>
    <svg viewBox="-110 -110 220 220" role="img" aria-label={`${main?'주망원경':'파인더'} 시야: ${SKY.filter(p=>project(s,p,view).visible).map(p=>p.name).filter(Boolean).join(', ')||'대상 없음'}`}>
      <defs><clipPath id={`field-${view}`}><circle r="100"/></clipPath><radialGradient id={`night-${view}`}><stop stopColor="#172942"/><stop offset="1" stopColor="#060c1a"/></radialGradient></defs>
      <circle r="104" fill="#263c55"/><circle r="100" fill={`url(#night-${view})`}/>
      <g clipPath={`url(#field-${view})`}>
        {SKY.map(p=>{const v=project(s,p,view);return <g key={p.id} transform={`translate(${v.x*100} ${v.y*100})`}>
          <circle r={p.id==='jupiter'?(main?7:3):p.r*(main?1:.7)} fill={p.id==='jupiter'?'#ead0ac':'#f7fbff'}/>
          {p.id==='jupiter'&&main&&<path d="M-5 -2H5M-5 2H5" stroke="#b79577" strokeWidth="1.5"/>}
        </g>;})}
        {main?<g fill="none" stroke="#79dddc" strokeWidth=".5" opacity=".65"><circle r="14.2" strokeDasharray="2 3"/><path d="M-5 0H5M0 -5V5"/></g>:<path d="M-100 0H100M0 -100V100" stroke="#f0a37e" strokeWidth=".6"/>}
      </g>
    </svg>
    <small>{main?'천정미러 좌우 반전 모형 · 점선은 학습용 중심 표시':'직시형 파인더 상하·좌우 반전 모형'}</small>
  </figure>;
}
export function AlignmentLesson({state:s,setup,tripod,readOnly,onAction,onBack,onAdvance}:{state:AlignmentState;setup:SetupState;tripod:TripodState;readOnly:boolean;onAction:(a:AlignmentAction)=>void;onBack:()=>void;onAdvance:()=>void}) {
  const control=(type:'move'|'adjust',axis:'x'|'y',label:string)=><div className={styles.pair}><span>{label}</span><Button variant="outline" aria-label={`${type==='move'?'미동':'파인더'} ${label} −`} onClick={()=>onAction({type,axis,direction:-1})}>−</Button><Button variant="outline" aria-label={`${type==='move'?'미동':'파인더'} ${label} +`} onClick={()=>onAction({type,axis,direction:1})}>+</Button></div>;
  const map=(x:number,y:number)=>({x:40+(x+1.5)*58,y:172-y*58});
  const aim=map(s.pointing.x,s.pointing.y);
  return <div className={styles.lesson}>
    <section className={styles.workspace} aria-label="파인더 정렬 실습">
      <header><span>STEP 06 · ALIGN & FIND</span><h2>같은 별을 보고 있나요?</h2><p>경통은 함께 움직이고, 파인더는 따로 조절합니다.</p></header>
      <ol className={styles.progress}><li aria-current={s.phase==='reference'?'step':undefined}>01 기준별 중심</li><li aria-current={s.phase==='align'?'step':undefined}>02 두 시야 정렬</li><li aria-current={s.phase==='target'?'step':undefined}>03 목성 탐색</li></ol>
      <div className={styles.fields}><OpticalView state={s} view="main"/><OpticalView state={s} view="finder"/></div>
      <details className={styles.contextDisclosure}><summary>탐색도·조립 장비 보기</summary><div className={styles.context}>
        <div className={styles.map}><b>탐색도 · 정방향</b><svg viewBox="0 0 365 230" role="img" aria-label="기준별 오른쪽 위에 목성. 점선 원은 주망원경이 보는 방향">
          <path d="M25 205H345M25 205V20" stroke="#50677e"/><text x="277" y="221">적경 + →</text><text x="28" y="20">적위 + ↑</text>
          {SKY.map(p=>{const q=map(p.x,p.y);return <g key={p.id}><circle cx={q.x} cy={q.y} r={p.r} fill={p.id==='jupiter'?'#efcb9b':'#ecf9ff'}/><text x={q.x+7} y={q.y-7}>{p.name}</text></g>;})}
          <circle cx={aim.x} cy={aim.y} r="29" fill="none" stroke="#73ddd3" strokeDasharray="4 3"/>
        </svg><small>학습용 배치 · 실제 날짜의 밤하늘이 아닙니다.</small></div>
        <div className={styles.rig}><ObservingRig state={setup} tripod={tripod}/><small>앞 단계의 부속품·균형 유지<br/>장비 그림은 결합 상태 표시</small></div>
      </div></details>
      <output className={styles.feedback} aria-live="polite"><b>{s.checked?'목표 확인 완료':'관찰 → 판단 → 조작 → 확인'}</b><p>{s.feedback}</p></output>
    </section>
    <aside className={styles.controls} aria-label="정렬 조작 패널">
      {readOnly&&<p className={styles.notice}>관측을 시작한 상태 · 이 단계는 관찰 전용입니다.</p>}
      <section><h3>먼저, 무엇을 움직일까?</h3><p>슈 고정나사는 풀지 않습니다. 두 축 클러치를 잠근 상태에서 미동 손잡이로 움직입니다.</p><Button variant="outline" onClick={()=>onAction({type:'inspect'})}>{s.inspected?'✓ 조작 구분 확인함':'조작 부위와 저배율 준비 확인'}</Button>
        <details><summary>파인더 정렬 ≠ 극축 정렬</summary><p>파인더 정렬은 두 망원경의 시선을 맞춥니다. 극축 정렬은 가대의 방위·고도로 적경축을 지구 자전축 방향에 맞춥니다. 앞 단계의 북쪽·위도 설정은 대략적인 준비이며, 정밀 극축 정렬은 아직 이 프로그램에서 실습하지 않습니다.</p><p>태양이나 태양 근처는 망원경·파인더로 보지 않습니다. 실제 장비의 시야 방향·나사 구성은 모델에 따라 다릅니다.</p></details>
      </section>
      <section><h3>가대 · 경통 방향 미동</h3><p>두 시야를 함께 관찰하세요. 목성 탐색에서도 이 손잡이를 사용합니다.</p>{control('move','x','적경')}{control('move','y','적위')}<Button variant="outline" aria-pressed={s.fine} onClick={()=>onAction({type:'fine'})}>{s.fine?'작은 미동 사용 중':'작은 미동으로 전환'}</Button><Button variant="ghost" onClick={()=>onAction({type:'release'})}>클러치를 풀면?</Button></section>
      <section><h3>① 기준별을 주망원경 중심에</h3><p>밝은 별과 주변 두 동반별을 탐색도와 비교하세요. 점선 원 안에 기준별을 넣습니다.</p><Button variant="outline" onClick={()=>onAction({type:'reference-check'})}>주망원경 기준별 확인</Button></section>
      <section className={s.phase==='align'?styles.active:undefined}><h3>② 파인더 방향 조절</h3><p>경통을 움직이지 않고 같은 별을 십자선 중심으로. ±는 나사 조합에 따른 방향 변화이며 실제 나사 개수·회전량을 뜻하지 않습니다.</p>{control('adjust','x','가로')}{control('adjust','y','세로')}<Button variant="outline" onClick={()=>onAction({type:'align-check'})}>{s.aligned?'✓ 두 시야 정렬 확인함':'두 시야의 같은 별 확인'}</Button></section>
      <section className={s.phase==='target'?styles.active:undefined}><h3>③ 파인더로 목성 찾기</h3><p>파인더로 대상을 찾은 뒤 좁은 주망원경 시야에서 중심을 확인하세요.</p><Button variant="outline" onClick={()=>onAction({type:'target'})}>목성 탐색 시작</Button><Button variant="outline" onClick={()=>onAction({type:'target-check'})}>주망원경에서 목성 확인</Button><Button variant="ghost" onClick={()=>onAction({type:'realign'})}>기준별 재정렬로 돌아가기</Button></section>
      <Button variant="ghost" onClick={()=>onAction({type:'hint'})}>관찰 힌트 · {s.hints}회</Button>
      <div className={styles.navigation}><Button variant="outline" onClick={onBack}>이전 단계</Button><Button disabled={!alignmentReady(s)} onClick={onAdvance}>7단계 · 초점 조절 →</Button></div>
    </aside>
  </div>;
}
