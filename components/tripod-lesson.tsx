'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { LEG_IDS, LEG_LABELS, SCENARIOS, tripodGeometry, tripodReadiness, type TripodAction, type TripodState } from '@/lib/tripod';
import styles from './tripod-lesson.module.css';
import { TripodRig } from './tripod-rig';

export function TripodLesson({ state, onAction, onAdvance, payloadAttached = false }: { state: TripodState; onAction: (action: TripodAction) => void; onAdvance: () => void; payloadAttached?: boolean }) {
  const target = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const geometry = tripodGeometry(state);
  const readiness = tripodReadiness(state);
  const leg = state.legs[state.selected];
  const bubbleStyle = { '--bubble-x': `${geometry.bubbleX}px`, '--bubble-y': `${geometry.bubbleY}px` } as CSSProperties;
  const plateStyle = { transform: `rotateX(${Math.atan(geometry.northSlope) * 180 / Math.PI * 5}deg) rotateY(${-Math.atan(geometry.eastSlope) * 180 / Math.PI * 5}deg)` };
  const inside = (x: number, y: number) => { const r = target.current?.getBoundingClientRect(); return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  const spreadCount = LEG_IDS.filter(id => state.legs[id].spread).length;
  return (
    <div className={styles.lesson}>
      <section className={styles.scene} aria-label="삼각대 작업 화면">
        <div className={styles.sceneBar}>
          <span>STEP 01 · {SCENARIOS[state.scenario].label}</span>
          <div>
            <Button variant="outline" aria-pressed={state.view === 'field'} onClick={() => onAction({ type: 'view', view: 'field' })}>전체 보기</Button>
            <Button variant="outline" aria-pressed={state.view === 'top'} onClick={() => onAction({ type: 'view', view: 'top' })}>위에서 보기</Button>
          </div>
        </div>
        {!state.placed ? <>
          <div className={styles.rack}><b>준비물대</b><span>접힌 삼각대</span></div>
          <button className={styles.dragPart} aria-label="접힌 삼각대. 설치 원으로 드래그하거나 Enter로 설치"
            style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)`, zIndex: 5 } : undefined}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); origin.current = { x: e.clientX, y: e.clientY }; setDrag({ x: 0, y: 0 }); }}
            onPointerMove={e => { if (!origin.current) return; setDrag({ x: e.clientX - origin.current.x, y: e.clientY - origin.current.y }); setOver(inside(e.clientX, e.clientY)); }}
            onPointerUp={e => { if (!origin.current) return; e.currentTarget.releasePointerCapture(e.pointerId); onAction({ type: inside(e.clientX, e.clientY) ? 'place' : 'miss' }); origin.current = null; setDrag(null); setOver(false); }}
            onPointerCancel={() => { origin.current = null; setDrag(null); setOver(false); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAction({ type: 'place' }); } }}>
            <img src="/tripod-folded-stylized-v1.png" alt="접힌 알루미늄 삼각대" draggable={false} />
            <span>잡아서 이동 · Enter로 설치</span>
          </button>
          <div ref={target} className={`${styles.drop} ${over ? styles.over : ''}`}><span>N</span>삼각대 설치 원</div>
        </> : state.view === 'field' ? <>
          {readiness.spread ? <TripodRig state={state} mounted={payloadAttached} className={styles.fieldImage} /> : <img className={styles.fieldImage} src="/tripod-folded-stylized-v1.png" alt="설치 위치에 놓은 삼각대. 펼침 상태는 각 다리 표시로 확인" />}
          <div className={styles.fieldCaption}>
            <b>{spreadCount}/3 다리 펼침 · {state.groundChecked ? '발끝 지지 확인됨' : '발끝 지지 확인 전'}</b>
            <p>발끝 위치를 유지하며 연장부가 움직입니다. 길이 변화는 이해를 돕기 위해 강조했습니다.</p>
          </div>
        </> : <>
          <div className={styles.plate} style={plateStyle}>
            <img src="/tripod-top-inspection-v1.png" alt="북쪽 다리가 위를 향한 삼각대 상판" />
            <div className={styles.miniLevel} style={bubbleStyle}><i /></div>
            {LEG_IDS.map((id, i) => <button key={id} className={`${styles.legPin} ${styles[id]} ${id === state.selected ? styles.selectedPin : ''}`} onClick={() => onAction({ type: 'select', leg: id })} aria-label={`${LEG_LABELS[id]} 선택`} aria-pressed={id === state.selected}>{['N', 'SW', 'SE'][i]}</button>)}
          </div>
          <div className={styles.levelInset}>
            <b>원형 수준기 확대</b>
            <div className={`${styles.level} ${geometry.level ? styles.levelOk : ''}`} style={bubbleStyle} role="img" aria-label={geometry.level ? '기포가 중심 원 안에 있습니다' : `기포가 중심에서 ${geometry.bubbleX >= 0 ? '동' : '서'}쪽, ${geometry.bubbleY <= 0 ? '북' : '남'}쪽으로 벗어났습니다`}>
              <span className={styles.northMark}>N</span><span className={styles.westMark}>W</span><span className={styles.eastMark}>E</span><span className={styles.southMark}>S</span>
              <div className={styles.targetRing} /><i className={styles.bubble} />
            </div>
            <span>{geometry.level ? '중심 원 안' : '기포의 이동 방향을 관찰하세요'}</span>
          </div>
          <p className={styles.modelNote}>위에서 본 방향 · 상판 기울기 5배 강조<br />발 위치를 고정한 작은 기울기 교육 모형</p>
        </>}
        <div className={styles.feedback} role="status" aria-live="polite">{state.feedback}</div>
      </section>

      <aside className={styles.controls} aria-label="삼각대 설치 조작">
        <span className={styles.kicker}>관찰 → 조절 → 다시 확인</span>
        <h2>{!state.placed ? '삼각대 가져오기' : !readiness.spread ? '세 다리 펼치기' : '다리 길이와 수평'}</h2>
        {payloadAttached && <p className={styles.small}>가대가 장착되어 있어 다리 조절은 잠겨 있습니다. 상부 보기는 삼각대만 확대해 보여줍니다.</p>}
        {!state.placed ? <>
          <p>설치 원으로 삼각대를 옮기세요. 관측지마다 세 발이 닿는 높이가 다릅니다.</p>
          <div className={styles.scenarios}>{Object.entries(SCENARIOS).map(([id, scenario]) => <Button key={id} variant="outline" aria-pressed={state.scenario === id} onClick={() => onAction({ type: 'scenario', scenario: id as keyof typeof SCENARIOS })}>{scenario.label}</Button>)}</div>
          <p className={styles.small}>두 관측지 모두 단단한 지면입니다. 높이 차이만 다르게 설정한 연습입니다.</p>
        </> : <>
          <div className={styles.legs}>{LEG_IDS.map(id => <div key={id} className={styles.legRow}>
            <button aria-pressed={state.selected === id} onClick={() => onAction({ type: 'select', leg: id })}>{LEG_LABELS[id]}<small>{state.legs[id].spread ? (state.legs[id].locked ? '펼침 · 잠김' : '펼침 · 풀림') : '접힘'}</small></button>
            {!state.legs[id].spread && <Button variant="outline" onClick={() => onAction({ type: 'spread', leg: id })} aria-label={`${LEG_LABELS[id]} 펼치기`}>펼치기</Button>}
          </div>)}</div>
          <Button variant="outline" onClick={() => onAction({ type: 'ground' })}>{state.groundChecked ? '발끝 지지 다시 확인' : '발끝 지지 확인'}</Button>
          {readiness.spread && state.groundChecked && <>
            <div className={styles.adjustment}>
              <b>{LEG_LABELS[state.selected]} 조절</b>
              <div className={styles.legDetail}><TripodRig state={state} detail={state.selected} /><span>선택한 다리 확대<br />{leg.locked ? '길이 잠김' : '길이 조절 중'}<br />2D 연장 표현</span></div>
              <Button variant="outline" aria-pressed={state.supported} onClick={() => onAction({ type: 'support' })}>{state.supported ? '상판에서 손 떼기' : '상판 받치기'}</Button>
              <Button variant="outline" onClick={() => onAction({ type: 'lock', leg: state.selected })}>{leg.locked ? '선택한 다리 잠금 풀기' : '선택한 다리 다시 잠그기'}</Button>
              <div className={styles.controlObservation} style={bubbleStyle}>
                {state.view === 'top' && <div className={`${styles.level} ${styles.compactLevel} ${geometry.level ? styles.levelOk : ''}`} aria-hidden="true"><span className={styles.northMark}>N</span><span className={styles.westMark}>W</span><span className={styles.eastMark}>E</span><span className={styles.southMark}>S</span><div className={styles.targetRing} /><i className={styles.bubble} /></div>}
                <span>{state.feedback}</span>
              </div>
              <label htmlFor="leg-extension">다리 연장량 <output>{leg.extension} mm</output></label>
              <input id="leg-extension" type="range" min="0" max="60" step="1" value={leg.extension} aria-label={`${LEG_LABELS[state.selected]} 연장량`} aria-describedby="extension-note" onChange={e => onAction({ type: 'extend', leg: state.selected, value: Number(e.target.value) })} />
              <div className={styles.adjustButtons}><Button variant="outline" onClick={() => onAction({ type: 'extend', leg: state.selected, value: leg.extension - 1 })}>1 mm 줄이기</Button><Button variant="outline" onClick={() => onAction({ type: 'extend', leg: state.selected, value: leg.extension + 1 })}>1 mm 늘리기</Button></div>
              <p id="extension-note" className={styles.small}>교육용 연장량입니다. 정답 숫자가 아니라 기포의 움직임을 확인하세요. 잠긴 다리는 움직이지 않습니다.</p>
            </div>
          </>}
          <div className={styles.checks}><span>{readiness.spread ? '✓' : '○'} 세 다리 펼침</span><span>{state.groundChecked ? '✓' : '○'} 발끝 지지</span><span>{readiness.locked ? '✓' : '○'} 길이 잠금</span><span>{state.checked ? '✓' : '○'} 최종 수평 확인</span></div>
          <Button variant="outline" onClick={() => onAction({ type: 'check' })}>설치 상태 확인</Button>
        </>}
        <Button variant="ghost" onClick={() => onAction({ type: 'hint' })}>힌트 보기 · {state.hintCount}회 사용</Button>
        <Button className={styles.advance} onClick={() => { if (readiness.ready) onAdvance(); else onAction({ type: 'check' }); }} aria-disabled={!readiness.ready}>가대 설치로 이동 {readiness.ready ? '→' : '· 준비 확인 필요'}</Button>
        <p className={styles.small}>수평 맞추기는 극축 정렬과 다른 작업입니다.</p>
      </aside>
    </div>
  );
}
