'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TripodRig } from './tripod-rig';
import { tripodRig } from '@/lib/tripod-rig';
import { type TripodState } from '@/lib/tripod';
import { mountReadiness, PRACTICE_LATITUDE, type MountAction, type MountState, type MountView } from '@/lib/mount';
import common from './tripod-lesson.module.css';
import styles from './mount-lesson.module.css';

export function MountLesson({ state, tripod, onAction, onAdvance, onBack }: {
  state: MountState; tripod: TripodState; onAction: (action: MountAction) => void; onAdvance: () => void; onBack: () => void;
}) {
  const target = useRef<SVGCircleElement>(null);
  const origin = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const rig = tripodRig(tripod);
  const ready = mountReadiness(state, tripod);
  const within = (x: number, y: number) => { const r = target.current?.getBoundingClientRect(); return !!r && Math.hypot((x - r.left - r.width / 2) / (r.width / 2), (y - r.top - r.height / 2) / (r.height / 2)) <= 1; };
  const view = state.view;
  const heading = !state.placed ? '가대 가져오기' : !ready.fixed ? '안착과 고정은 달라요' : '극축의 기본 방향';
  return <div className={common.lesson}>
    <section className={common.scene} aria-label="가대 작업 화면">
      <div className={common.sceneBar}><span>STEP 02 · 가대</span><div>
        {([['assembly', '전체'], ['under', '하부 확대'], ['direction', '방향 보기']] as [MountView, string][]).map(([v, text]) => <Button key={v} variant="outline" aria-pressed={view === v} onClick={() => onAction({ type: 'view', view: v })}>{text}</Button>)}
      </div></div>
      {view !== 'direction' ? <>
        <TripodRig state={tripod} mounted={state.placed} loose={state.placed && state.bolt < 4} className={`${styles.rig} ${view === 'under' ? styles.under : ''}`} viewBox={view === 'under' ? `250 ${rig.socket.y - 60} 520 440` : '0 -620 1024 2140'}>
          {!state.placed && view === 'assembly' && <g><circle ref={target} data-mount-socket cx={rig.socket.x} cy={rig.socket.y} r="130" className={`${styles.socket} ${over ? styles.over : ''}`} /><text x={rig.socket.x} y={rig.socket.y + 210} textAnchor="middle" className={styles.svgLabel}>결합면</text></g>}
          {view === 'under' && <g role="button" tabIndex={0} aria-label="하부 중앙 결합 손잡이 조이기" onClick={() => onAction({ type: 'bolt' })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAction({ type: 'bolt' }); } }} className={styles.boltTarget}>
            <circle cx={rig.bolt.x} cy={rig.bolt.y} r="66" />
            <path d={`M${rig.bolt.x} ${rig.bolt.y - 55} v15`} transform={`rotate(${state.bolt * 90} ${rig.bolt.x} ${rig.bolt.y})`} />
          </g>}
        </TripodRig>
        {!state.placed && view === 'assembly' && <div className={styles.rack}><b>준비물대</b><span>적도의식 가대</span>
          <button className={styles.dragPart} aria-label="가대 드래그 또는 Enter로 안착" style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)`, zIndex: 10 } : undefined}
            onPointerDown={e => { if (e.button !== 0) return; const r = e.currentTarget.getBoundingClientRect(); origin.current = { x: e.clientX, y: e.clientY, baseX: r.left + r.width * .488, baseY: r.top + r.height * .9 }; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: 0, y: 0 }); }}
            onPointerMove={e => { const o = origin.current; if (!o) return; const x = e.clientX - o.x, y = e.clientY - o.y; setDrag({ x, y }); setOver(within(o.baseX + x, o.baseY + y)); }}
            onPointerUp={e => { const o = origin.current; if (!o) return; onAction({ type: within(o.baseX + e.clientX - o.x, o.baseY + e.clientY - o.y) ? 'place' : 'miss' }); e.currentTarget.releasePointerCapture(e.pointerId); origin.current = null; setDrag(null); setOver(false); }}
            onPointerCancel={() => { origin.current = null; setDrag(null); setOver(false); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAction({ type: 'place' }); } }}>
            <img src="/equatorial-mount-stylized-v3.png" alt="밑면을 맞춰 옮길 가대" draggable={false} /><i className={styles.baseMarker} />
          </button><small>밑면의 작은 원을 결합면에 맞추기</small>
        </div>}
        {view === 'under' && <div className={styles.caption}><b>중앙 결합 손잡이</b><p>{state.bolt === 4 ? '결합면 밀착' : '안착 뒤에도 하부 고정이 필요합니다.'}</p><small>틈과 회전 표시는 교육용 강조입니다.</small></div>}
        {view === 'assembly' && state.placed && <div className={styles.caption}><b>{ready.fixed ? '하부 고정 확인됨' : '받친 상태 · 아직 고정 전'}</b><p>1단계에서 조절한 다리 길이를 그대로 유지합니다.</p></div>}
      </> : <div className={styles.direction}>
        <div><b>위에서 · 북쪽과 극축 방향</b><svg viewBox="0 0 260 245" role="img" aria-label={`북쪽에서 ${state.azimuth}도 벗어난 극축 방향`}>
          <circle cx="130" cy="130" r="88" fill="none" stroke="#567c93" /><path d="M130 215V35" stroke="#b1c99f" strokeDasharray="5 5" /><text x="130" y="22" textAnchor="middle">N · 북쪽</text><text x="18" y="135">W</text><text x="230" y="135">E</text>
          <g transform={`rotate(${state.azimuth} 130 130)`}><path d="M130 187V48m-9 15 9-15 9 15" fill="none" stroke="#80edff" strokeWidth="5" /></g><text x="130" y="238" textAnchor="middle">방위 편차 {state.azimuth}°</text>
        </svg></div>
        <div><b>옆에서 · 극축 고도와 위도</b><svg viewBox="0 0 260 245" role="img" aria-label={`극축 고도 ${state.altitude}도, 가상 관측지 북위 ${PRACTICE_LATITUDE}도`}>
          <path d="M35 188H238" stroke="#567c93" /><path d={`M35 188 L${35 + 190 * Math.cos(PRACTICE_LATITUDE * Math.PI / 180)} ${188 - 190 * Math.sin(PRACTICE_LATITUDE * Math.PI / 180)}`} stroke="#b1c99f" strokeDasharray="5 5" />
          <path d={`M35 188 L${35 + 190 * Math.cos(state.altitude * Math.PI / 180)} ${188 - 190 * Math.sin(state.altitude * Math.PI / 180)}`} stroke="#80edff" strokeWidth="5" /><text x="130" y="28" textAnchor="middle">기준: 북위 {PRACTICE_LATITUDE}°</text><text x="130" y="238" textAnchor="middle">극축 고도 {state.altitude}°</text>
        </svg></div>
        <p>방위·고도 개념도입니다. 경통의 적경·적위 회전과는 다른 조절이며, 이것만으로 정밀 극축 정렬이 끝나지는 않습니다.</p>
      </div>}
      <div className={common.feedback} role="status" aria-live="polite">{state.feedback}</div>
    </section>
    <aside className={common.controls} aria-label="가대 설치 조작">
      <span className={common.kicker}>안착 → 고정 확인 → 기본 방향</span><h2>{heading}</h2>
      {!state.placed ? <><p>밑면의 기준 홈이 북쪽 기준과 맞는지 먼저 확인하세요.</p><Button variant="outline" aria-pressed={state.alignedBase} onClick={() => onAction({ type: 'align-base' })}>{state.alignedBase ? '기준 홈 방향 맞음 ✓' : '기준 홈을 북쪽에 맞추기'}</Button><p className={common.small}>이 교육 장비의 결합 기준입니다. 실물의 홈·돌기·고정부 모양은 모델마다 다릅니다.</p></> : <>
        <Button variant="outline" aria-pressed={state.supported} onClick={() => onAction({ type: 'support' })}>{state.supported ? '가대에서 손 떼기' : '가대 받치기'}</Button>
        {!ready.fixed || view === 'under' ? <>
          <Button variant="outline" onClick={() => onAction({ type: 'view', view: 'under' })}>하부 고정 위치 보기</Button>
          <Button variant="outline" onClick={() => onAction({ type: 'bolt' })}>중앙 손잡이 ¼회전 조이기</Button>
          <p className={common.small}>조임 {state.bolt}/4 · 회전 횟수는 실습용입니다. 실물은 설명서에 따라 밀착될 만큼만 조입니다.</p>
          <Button variant="outline" onClick={() => onAction({ type: 'test' })}>받친 채 유격 확인</Button>
        </> : null}
        {ready.fixed && <>
          <Button variant="outline" onClick={() => onAction({ type: 'view', view: 'direction' })}>방위·고도 개념도 보기</Button>
          <p className={common.small}>가상 관측지: 북위 {PRACTICE_LATITUDE}°. 실제 학교 위치를 뜻하지 않습니다. 측면 나사는 방향을 조절하며 하부 결합 고정을 대신하지 않습니다.</p>
          <div className={styles.adjust}><label htmlFor="mount-azimuth">측면 방위 조절 <output>{state.azimuth}°</output></label><input id="mount-azimuth" type="range" min="-25" max="25" value={state.azimuth} onChange={e => onAction({ type: 'azimuth', value: Number(e.target.value) })} />
            <Button variant="outline" aria-pressed={state.azSeated} onClick={() => onAction({ type: 'az-seat' })}>{state.azSeated ? '방위 나사 조절 여유 만들기' : '양쪽 방위 나사 맞닿음 확인'}</Button>
            <label htmlFor="mount-altitude">극축 고도 조절 <output>{state.altitude}°</output></label><input id="mount-altitude" type="range" min="10" max="60" value={state.altitude} onChange={e => onAction({ type: 'altitude', value: Number(e.target.value) })} />
            <Button variant="outline" aria-pressed={state.altSeated} onClick={() => onAction({ type: 'alt-seat' })}>{state.altSeated ? '고도 나사 조절 여유 만들기' : '양쪽 고도 나사 맞닿음 확인'}</Button>
          </div>
        </>}
        <div className={common.checks}><span>{state.placed ? '✓' : '○'} 안착</span><span>{ready.fixed ? '✓' : '○'} 하부 고정 확인</span><span>{state.azSeated && state.altSeated ? '✓' : '○'} 조절 나사 정리</span><span>{state.checked ? '✓' : '○'} 최종 확인</span></div>
        <Button variant="outline" onClick={() => onAction({ type: 'check' })}>가대 설치 최종 확인</Button>
      </>}
      <p className={styles.mobileFeedback}>{state.feedback}</p>
      <Button variant="ghost" onClick={() => onAction({ type: 'hint' })}>힌트 보기 · {state.hints}회 사용</Button>
      <Button className={common.advance} aria-disabled={!ready.ready} onClick={() => ready.ready ? onAdvance() : onAction({ type: 'check' })}>무게추 설치로 이동 {ready.ready ? '→' : '· 확인 필요'}</Button>
      <Button variant="ghost" onClick={onBack}>삼각대 다시 보기</Button>
    </aside>
  </div>;
}
