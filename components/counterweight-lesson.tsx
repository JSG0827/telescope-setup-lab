'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TripodRig } from './tripod-rig';
import { CounterweightArt } from './counterweight-art';
import { TubeAssembly } from './tube-art';
import { ObservingTube } from './observing-art';
import { type SetupState } from '@/lib/observing-setup';
import { type TubeState } from '@/lib/tube';
import { counterweightRig } from '@/lib/counterweight-rig';
import { counterweightReadiness, type CounterweightAction, type CounterweightState } from '@/lib/counterweight';
import { type TripodState } from '@/lib/tripod';
import { type MountState } from '@/lib/mount';
import common from './tripod-lesson.module.css';
import styles from './counterweight-lesson.module.css';

export function CounterweightLesson({ state: s, tripod, mount, tubeAttached, tube, observing, onAction, onAdvance, onBack }: {
  state: CounterweightState; tripod: TripodState; mount: MountState; tubeAttached: boolean; tube?: TubeState;
  observing?: SetupState;
  onAction: (a: CounterweightAction) => void; onAdvance: () => void; onBack: () => void;
}) {
  const target = useRef<SVGCircleElement>(null);
  const origin = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const rig = counterweightRig(tripod, observing?.weight ?? s.position);
  const ready = counterweightReadiness(s, mount, tripod);
  const inside = (x: number, y: number) => {
    const r = target.current?.getBoundingClientRect();
    return !!r && r.width > 0 && Math.hypot((x - r.left - r.width / 2) / (r.width / 2), (y - r.top - r.height / 2) / (r.height / 2)) <= 1;
  };
  const knob = { x: rig.weight.x + 64, y: rig.weight.y + 33 };
  const press = (e: React.KeyboardEvent, action: CounterweightAction) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAction(action); } };
  const cancel = () => { origin.current = null; setDrag(null); setOver(false); };
  return <div className={common.lesson}>
    <section className={`${common.scene} ${styles.scene}`} aria-label="무게추 작업 화면">
      <div className={common.sceneBar}><span>STEP 03 · 무게추</span><div>
        <Button variant="outline" aria-pressed={s.view === 'assembly'} onClick={() => onAction({ type: 'view', view: 'assembly' })}>전체</Button>
        <Button variant="outline" aria-pressed={s.view === 'detail'} onClick={() => onAction({ type: 'view', view: 'detail' })}>봉 확대</Button>
      </div></div>
      <TripodRig state={tripod} mounted className={`${styles.rig} ${s.view === 'detail' ? styles.detail : ''}`}
        viewBox={s.view === 'detail' ? `${rig.entry.x - 100} ${rig.entry.y - 300} 380 450` : tube?.placed ? '-150 -1050 1350 2590' : '-100 -620 1224 2140'}>
        <g transform={rig.transform}>
          {s.stopper && <g transform={`translate(${rig.end.x} ${rig.end.y}) rotate(7.5) scale(1.3)`}><CounterweightArt stopper /></g>}
          {s.placed && <g data-counterweight-position={s.position} transform={`translate(${rig.weight.x} ${rig.weight.y}) rotate(7.5) scale(.8)`}><CounterweightArt /></g>}
          {s.placed && s.view === 'detail' && <g className={styles.hotspot} role="button" tabIndex={0} aria-label="그림의 무게추 고정나사" onClick={() => onAction({ type: 'clamp' })} onKeyDown={e => press(e, { type: 'clamp' })}>
            <circle cx={knob.x} cy={knob.y} r="36" /><text x={knob.x + 50} y={knob.y + 8}>위치 고정</text>
          </g>}
          {s.view === 'detail' && <g className={styles.hotspot} role="button" tabIndex={0} aria-label="그림의 봉 끝 안전장치" onClick={() => onAction({ type: 'stopper' })} onKeyDown={e => press(e, { type: 'stopper' })}>
            <circle cx={rig.end.x} cy={rig.end.y} r="44" /><text x={rig.end.x + 58} y={rig.end.y + 16}>이탈 방지</text>
          </g>}
        </g>
        {!s.placed && <circle data-counterweight-entry ref={target} cx={rig.entry.x} cy={rig.entry.y} r={s.view === 'detail' ? 48 : 88} className={`${styles.entry} ${over ? styles.over : ''}`} />}
        {tube && <TubeAssembly tripod={tripod} state={tube} offset={observing?.offset}>{observing && <ObservingTube state={observing}/>}</TubeAssembly>}
      </TripodRig>
      <div className={styles.rack}><b>{s.placed ? '안전장치 보관함' : '준비물대'}</b>
        {!s.placed && <><button className={styles.dragPart} aria-label="무게추 드래그 또는 Enter로 끼우기" style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}
          onPointerDown={e => { if (e.button !== 0) return; const r = e.currentTarget.getBoundingClientRect(); origin.current = { x: e.clientX, y: e.clientY, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: 0, y: 0 }); }}
          onPointerMove={e => { const o = origin.current; if (!o) return; const x = e.clientX - o.x, y = e.clientY - o.y; setDrag({ x, y }); setOver(inside(o.cx + x, o.cy + y)); }}
          onPointerUp={e => { const o = origin.current; if (!o) return; onAction({ type: inside(o.cx + e.clientX - o.x, o.cy + e.clientY - o.y) ? 'place' : 'miss' }); e.currentTarget.releasePointerCapture(e.pointerId); cancel(); }}
          onPointerCancel={cancel} onKeyDown={e => press(e, { type: 'place' })}>
          <svg viewBox="-130 -100 260 200" aria-hidden="true"><CounterweightArt /><circle cx="0" cy="0" r="9" className={styles.marker} /></svg>
        </button><span>가운데 기준점 → 봉 끝 원</span></>}
        <div className={styles.tray}>{!s.stopper ? <><svg viewBox="-40 -30 80 60" aria-hidden="true"><CounterweightArt stopper /></svg><span>안전장치 보관 중</span></> : <span>안전장치: 봉 끝에 장착됨</span>}</div>
      </div>
      <div className={styles.status}><b>{s.placed ? s.supported ? '손으로 받치는 중' : '고정 확인 후 손 뗌' : '아직 장착 전'}</b><span>{s.clamped ? '고정나사 잠김' : '고정나사 풀림'} · {s.stopper ? '안전장치 있음' : '봉 끝 열림'}</span></div>
      <div className={common.feedback} role="status" aria-live="polite">{s.feedback}</div>
    </section>
    <aside className={common.controls} aria-label="무게추 설치 조작">
      <span className={common.kicker}>관찰 → 받침 → 고정 → 재확인</span><h2>{ready.ready ? '경통을 올릴 준비 완료' : !s.placed ? '봉 끝에서 끼워 넣기' : '고정과 이탈 방지'}</h2>
      <p>무게추 옆 나사는 위치를 고정하고, 봉 끝 안전장치는 빠져나가는 것을 막습니다.</p>
      {tubeAttached && <p className={styles.notice}>경통이 장착되어 있어 지금은 관찰만 가능합니다. 위치 조절은 축 균형 단계에서 진행하세요.</p>}
      <Button variant="outline" onClick={() => onAction({ type: 'inspect' })}>{s.inspected ? '봉·축 잠금 다시 관찰' : '봉 고정·축 잠금 확인'}</Button>
      {!s.placed && <p className={common.small}>이 장비는 봉이 가대에 고정되고 두 축이 잠긴 상태에서 시작합니다. 무게추를 옮길 때는 계속 받칩니다.</p>}
      <Button variant="outline" aria-pressed={s.stopper} onClick={() => onAction({ type: 'stopper' })}>{s.stopper ? '봉 끝 안전장치 풀어 보관' : '봉 끝 안전장치 다시 장착'}</Button>
      {s.placed && <Button variant="outline" aria-pressed={s.supported} onClick={() => onAction({ type: 'support' })}>{s.supported ? '무게추에서 손 떼기' : '무게추 아래 받치기'}</Button>}
      <Button variant="outline" aria-pressed={s.clamped} onClick={() => onAction({ type: 'clamp' })}>{s.clamped ? '무게추 고정나사 조금 풀기' : '무게추 고정나사 조이기'}</Button>
      {s.placed && <div className={styles.adjust}>
        <label htmlFor="counterweight-position">봉 위 임시 위치</label>
        <input id="counterweight-position" type="range" min="15" max="75" value={s.position} aria-valuetext={`가대 쪽에서 봉 끝 방향으로 ${s.position}%`} onChange={e => onAction({ type: 'move', value: Number(e.target.value) })} />
        <div><span>가대 쪽</span><span>봉 끝 쪽</span></div>
        <p className={common.small}>그림을 보며 이동하세요. 중앙에 맞출 필요는 없습니다. 봉 끝의 여유를 남기는 범위에서 연습합니다.</p>
        <Button variant="outline" onClick={() => onAction({ type: 'test' })}>받친 채 미끄러짐 확인</Button>
      </div>}
      <Button variant="ghost" onClick={() => onAction({ type: 'clutch' })}>적경 클러치를 풀면?</Button>
      <div className={common.checks}><span>{s.inspected ? '✓' : '○'} 봉·축 확인</span><span>{s.placed && s.clamped ? '✓' : '○'} 무게추 고정</span><span>{s.stopper ? '✓' : '○'} 이탈 방지</span><span>{s.tested ? '✓' : '○'} 미끄러짐 확인</span></div>
      <p className={styles.mobileFeedback}>{s.feedback}</p>
      <Button variant="outline" onClick={() => onAction({ type: 'check' })}>무게추 설치 최종 확인</Button>
      <Button variant="ghost" onClick={() => onAction({ type: 'hint' })}>힌트 보기 · {s.hints}회</Button>
      <Button className={common.advance} aria-disabled={!ready.ready} onClick={() => ready.ready ? onAdvance() : onAction({ type: 'check' })}>경통 설치로 이동 {ready.ready ? '→' : '· 확인 필요'}</Button>
      <Button variant="ghost" onClick={onBack}>가대 다시 보기</Button>
    </aside>
  </div>;
}
