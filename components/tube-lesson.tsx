'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TripodRig } from './tripod-rig';
import { CounterweightArt } from './counterweight-art';
import { TubeArt, TubeAssembly } from './tube-art';
import { counterweightRig } from '@/lib/counterweight-rig';
import { tubeRig, TUBE_RAIL } from '@/lib/tube-rig';
import { tubeReadiness, type TubeAction, type TubeState } from '@/lib/tube';
import { type CounterweightState } from '@/lib/counterweight';
import { type MountState } from '@/lib/mount';
import { type TripodState } from '@/lib/tripod';
import common from './tripod-lesson.module.css';
import styles from './tube-lesson.module.css';
import { ObservingTube } from './observing-art';
import { type SetupState } from '@/lib/observing-setup';

export function TubeLesson({ state: s, counter, mount, tripod, observing, laterWork, onAction, onAdvance, onBack }: {
  state: TubeState; counter: CounterweightState; mount: MountState; tripod: TripodState; laterWork: boolean;
  observing?: SetupState;
  onAction: (a: TubeAction) => void; onAdvance: () => void; onBack: () => void;
}) {
  const target = useRef<SVGCircleElement>(null), marker = useRef<SVGCircleElement>(null);
  const origin = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const rig = tubeRig(tripod, s.seated), cw = counterweightRig(tripod, observing?.weight ?? counter.position);
  const ready = tubeReadiness(s, counter, mount, tripod);
  const inside = (x: number, y: number) => { const r = target.current?.getBoundingClientRect(); return !!r && r.width > 0 && Math.hypot((x-r.left-r.width/2)/(r.width/2), (y-r.top-r.height/2)/(r.height/2)) <= 1; };
  const key = (e: React.KeyboardEvent, action: TubeAction) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAction(action); } };
  const cancel = () => { origin.current = null; setDrag(null); setOver(false); };
  return <div className={common.lesson}>
    <section className={common.scene} aria-label="경통 작업 화면">
      <div className={common.sceneBar}><span>STEP 04 · 경통</span><div>
        <Button variant="outline" aria-pressed={s.view === 'assembly'} onClick={() => onAction({ type: 'view', view: 'assembly' })}>전체</Button>
        <Button variant="outline" aria-pressed={s.view === 'detail'} onClick={() => onAction({ type: 'view', view: 'detail' })}>결합부 확대</Button>
      </div></div>
      <TripodRig state={tripod} mounted className={`${styles.rig} ${s.view === 'detail' ? styles.detail : ''} ${s.placed ? styles.installed : ''}`}
        viewBox={s.view === 'detail' ? `${rig.saddle.x - 260} ${rig.saddle.y - 210} 610 480` : '-150 -1050 1350 2590'}>
        <g transform={cw.transform}>
          {counter.stopper && <g transform={`translate(${cw.end.x} ${cw.end.y}) rotate(7.5) scale(1.3)`}><CounterweightArt stopper /></g>}
          {counter.placed && <g data-counterweight-position={counter.position} transform={`translate(${cw.weight.x} ${cw.weight.y}) rotate(7.5) scale(.8)`}><CounterweightArt /></g>}
        </g>
        <TubeAssembly tripod={tripod} state={s} offset={observing?.offset}>{observing && <ObservingTube state={observing}/>}</TubeAssembly>
        {!s.placed && <g><circle ref={target} data-tube-saddle cx={rig.saddle.x} cy={rig.saddle.y} r={s.view === 'detail' ? 70 : 115} className={`${styles.target} ${over ? styles.over : ''}`} /><text x={rig.saddle.x} y={rig.saddle.y + 150} textAnchor="middle" className={styles.label}>안장 홈</text></g>}
        {s.placed && s.view === 'detail' && <>
          <path d={`M${rig.rail.x-80} ${rig.rail.y-38}l160 76`} className={s.seated ? styles.seatedLine : styles.looseLine} />
          <g transform={rig.mountTransform} className={styles.hotspot} role="button" tabIndex={0} aria-label="그림의 안장 고정 손잡이 조이기" onClick={() => onAction({ type: 'tighten' })} onKeyDown={e => key(e, { type: 'tighten' })}>
            <circle cx={rig.knob.x} cy={rig.knob.y} r="65" /><path d={`M${rig.knob.x} ${rig.knob.y-48}v20`} transform={`rotate(${s.clamp*90} ${rig.knob.x} ${rig.knob.y})`} />
          </g>
        </>}
      </TripodRig>
      {!s.placed && <div className={styles.rack}><b>준비물대 · 경통</b>
        <button className={styles.dragPart} aria-label="경통 드래그 또는 Enter로 안장에 가져오기" style={drag ? { transform: `translate(${drag.x}px,${drag.y}px)` } : undefined}
          onPointerDown={e => { if(e.button !== 0) return; const r = marker.current?.getBoundingClientRect(); if(!r) return; origin.current = { x:e.clientX,y:e.clientY,rx:r.left+r.width/2,ry:r.top+r.height/2 }; e.currentTarget.setPointerCapture(e.pointerId); setDrag({x:0,y:0}); }}
          onPointerMove={e => { const o = origin.current; if(!o) return; const x=e.clientX-o.x,y=e.clientY-o.y; setDrag({x,y}); setOver(inside(o.rx+x,o.ry+y)); }}
          onPointerUp={e => { const o = origin.current; if(!o) return; onAction({ type: inside(o.rx+e.clientX-o.x,o.ry+e.clientY-o.y) ? 'place' : 'miss' }); e.currentTarget.releasePointerCapture(e.pointerId); cancel(); }}
          onPointerCancel={cancel} onKeyDown={e => key(e, { type: 'place' })}>
          <svg viewBox="-120 -120 1790 1350" aria-hidden="true"><g transform={`rotate(${s.aligned ? 0 : -14} ${TUBE_RAIL.x} ${TUBE_RAIL.y})`}><TubeArt /><circle ref={marker} cx={TUBE_RAIL.x} cy={TUBE_RAIL.y} r="35" className={styles.marker} /></g></svg>
        </button><span>레일 기준점 → 안장 홈</span><small>{s.supported ? '본체 받침 유지 중' : '옮기기 전 본체를 받쳐 주세요'}</small>
      </div>}
      <div className={styles.status}><b>{!s.placed ? '준비물대' : !s.seated ? '홈 입구 · 안착 전' : s.clamp < 3 ? '홈 안착 · 고정 중' : s.tested ? '고정·유격 확인됨' : '조임 완료 · 유격 확인 전'}</b><span>{s.supported ? '본체를 받치는 중' : s.placed ? '확인 후 손 뗌' : '준비물대에 놓임'}</span></div>
      <div className={common.feedback} role="status" aria-live="polite">{s.feedback}</div>
    </section>
    <aside className={common.controls} aria-label="경통 설치 조작">
      <span className={common.kicker}>받침 → 홈 안착 → 고정 → 유격 확인</span><h2>{ready.ready ? '경통 고정 확인 완료' : !s.placed ? '레일과 안장 맞추기' : !s.seated ? '홈 안으로 안착시키기' : '손을 떼기 전 확인'}</h2>
      <p>경통 아래 도브테일 레일의 양쪽 면이 안장 홈에 들어가야 안전하게 고정됩니다.</p>
      {laterWork && <p className={styles.note}>후속 실습을 시작했습니다. 여기서는 경통 고정을 관찰할 수 있습니다.</p>}
      <Button variant="outline" onClick={() => onAction({ type:'inspect' })}>{s.inspected ? '레일·안장 다시 관찰' : '레일·안장과 축 잠금 관찰'}</Button>
      <Button variant="outline" aria-pressed={s.supported} onClick={() => onAction({ type:'support' })}>{s.supported ? '경통에서 손 떼기' : '경통 본체·밴드 받치기'}</Button>
      {!s.placed && <Button variant="outline" aria-pressed={s.aligned} onClick={() => onAction({ type:'align' })}>{s.aligned ? '레일 방향 맞음 · 다시 돌리기' : '레일을 안장 홈과 나란히 맞추기'}</Button>}
      <Button variant="outline" onClick={() => onAction({ type:'open' })}>{s.saddleOpen ? '안장 홈 열림 · 여유 다시 확인' : '안장 고정 손잡이 조금 풀기'}</Button>
      {s.placed && <>
        <Button variant="outline" onClick={() => onAction({ type:'seat' })}>받친 채 레일을 홈 안으로 밀기</Button>
        <Button variant="outline" onClick={() => onAction({ type:'tighten' })}>안장 고정 손잡이 ¼회전 조이기</Button>
        <p className={common.small}>조임 {s.clamp}/3 · 회전 횟수와 안착 틈은 실습용 표현입니다. 실물은 설명서에 따라 밀착될 만큼만 조입니다.</p>
        <Button variant="outline" onClick={() => onAction({ type:'test' })}>받친 채 경통 유격 확인</Button>
        <Button variant="ghost" onClick={() => onAction({ type:'return' })}>받친 채 준비물대로 되돌리기</Button>
      </>}
      <div className={styles.choices}><Button variant="ghost" onClick={() => onAction({type:'lens'})}>렌즈면을 잡으면?</Button><Button variant="ghost" onClick={() => onAction({type:'clutch'})}>클러치를 풀면?</Button></div>
      <div className={common.checks}><span>{s.seated?'✓':'○'} 양쪽 면 안착</span><span>{ready.fixed?'✓':'○'} 안장 고정</span><span>{s.tested?'✓':'○'} 유격 확인</span><span>{s.checked?'✓':'○'} 최종 확인</span></div>
      <p className={styles.mobileFeedback}>{s.feedback}</p>
      <Button variant="outline" onClick={() => onAction({type:'check'})}>경통 설치 최종 확인</Button>
      <Button variant="ghost" onClick={() => onAction({type:'hint'})}>힌트 보기 · {s.hints}회</Button>
      <Button className={common.advance} aria-disabled={!ready.ready} onClick={() => ready.ready ? onAdvance() : onAction({type:'check'})}>부속품·축 균형 단계로 이동 {ready.ready?'→':'· 확인 필요'}</Button>
      <Button variant="ghost" onClick={onBack}>무게추 다시 보기</Button>
    </aside>
  </div>;
}
