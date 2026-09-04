/** Small-angle, fixed-footprint teaching model; dimensions are illustrative. */
export const LEG_IDS = ['north', 'southwest', 'southeast'] as const;
export type LegId = typeof LEG_IDS[number];
export const LEG_LABELS: Record<LegId, string> = { north: '북쪽 다리', southwest: '남서쪽 다리', southeast: '남동쪽 다리' };
export const TRIPOD_STORAGE_KEY = 'telescope-lab-progress-tripod-v2';
export const LEVEL_TOLERANCE_DEG = 0.25;
export const SCENARIOS = {
  terrace: { label: '관측지 A', ground: [0, -12, 8] },
  hillside: { label: '관측지 B', ground: [10, 6, -10] },
} as const;
export type TripodEvent = { sequence: number; action: string; leg?: LegId; blocked: boolean; message: string };
export type TripodState = {
  version: 2; placed: boolean; groundChecked: boolean; supported: boolean;
  view: 'field' | 'top'; observed: boolean; checked: boolean;
  selected: LegId; scenario: keyof typeof SCENARIOS;
  legs: Record<LegId, { extension: number; locked: boolean; spread: boolean }>;
  feedback: string; hintCount: number; sequence: number; events: TripodEvent[];
};
export type TripodAction =
  | { type: 'place' | 'ground' | 'support' | 'check' | 'hint' | 'miss' | 'mounted-guard' }
  | { type: 'view'; view: 'field' | 'top' }
  | { type: 'select' | 'spread' | 'lock'; leg: LegId }
  | { type: 'extend'; leg: LegId; value: number }
  | { type: 'scenario'; scenario: keyof typeof SCENARIOS };

export function createTripod(): TripodState {
  return {
    version: 2, placed: false, groundChecked: false, supported: false, view: 'field', observed: false, checked: false,
    selected: 'north', scenario: 'terrace',
    legs: { north: { extension: 24, locked: true, spread: false }, southwest: { extension: 24, locked: true, spread: false }, southeast: { extension: 24, locked: true, spread: false } },
    feedback: '준비물대의 삼각대를 설치 원으로 옮겨 보세요.', hintCount: 0, sequence: 0, events: [],
  };
}

export function tripodGeometry(state: TripodState) {
  // Feet: (0, 300), (-sqrt(3)*150, -150), (sqrt(3)*150, -150) mm.
  // z = eastSlope*x + northSlope*y + meanHeight; extension projects at 20°.
  const heights = LEG_IDS.map((id, i) => SCENARIOS[state.scenario].ground[i] + state.legs[id].extension * Math.cos(Math.PI / 9));
  const eastSlope = (heights[2] - heights[1]) / (300 * Math.sqrt(3));
  const northSlope = (heights[0] - (heights[1] + heights[2]) / 2) / 450;
  const magnitude = Math.hypot(eastSlope, northSlope);
  const tiltDeg = Math.atan(magnitude) * 180 / Math.PI;
  // Screen Y points south; a real bubble travels toward the higher surface.
  const gain = magnitude > 0 ? Math.min(900, 64 / magnitude) : 900;
  return { heights, eastSlope, northSlope, tiltDeg, bubbleX: eastSlope * gain, bubbleY: -northSlope * gain, level: tiltDeg <= LEVEL_TOLERANCE_DEG };
}

export function tripodReadiness(state: TripodState) {
  const spread = LEG_IDS.every(id => state.legs[id].spread);
  const locked = LEG_IDS.every(id => state.legs[id].locked);
  const stable = state.placed && state.groundChecked && spread && locked;
  return { spread, locked, stable, ready: stable && state.observed && state.checked && tripodGeometry(state).level };
}

export function tripodReducer(state: TripodState, action: TripodAction): TripodState {
  let next: TripodState = { ...state, legs: Object.fromEntries(LEG_IDS.map(id => [id, { ...state.legs[id] }])) as TripodState['legs'] };
  let message = ''; let blocked = false;
  const readiness = tripodReadiness(state);
  const deny = (text: string) => { blocked = true; message = text; };
  switch (action.type) {
    case 'mounted-guard': deny('가대나 경통이 장착된 상태에서는 다리 조절을 잠급니다. 처음부터 다시 연습하거나 현재 상태를 관찰하세요.'); break;
    case 'scenario':
      if (state.placed) { deny('설치 후에는 지면 조건을 바꾸지 않습니다. 처음부터 시작해 다른 관측지를 선택하세요.'); break; }
      next.scenario = action.scenario; message = `${SCENARIOS[action.scenario].label}를 선택했습니다. 세 발이 닿는 높이가 달라집니다.`; break;
    case 'place': next.placed = true; message = '한 손으로 지지하며 세 다리를 하나씩 펼치세요.'; break;
    case 'miss': deny('설치 원 밖입니다. 삼각대의 발이 놓일 원 안으로 옮겨 주세요.'); break;
    case 'spread':
      if (!state.placed) { deny('먼저 삼각대를 설치 위치로 가져오세요.'); break; }
      next.legs[action.leg].spread = true; next.checked = false;
      message = `${LEG_LABELS[action.leg]}를 펼쳤습니다. 세 다리가 모두 펼쳐져야 지지 상태를 확인할 수 있어요.`; break;
    case 'ground':
      if (!state.placed || !readiness.spread) { deny('다리가 모두 펼쳐지지 않아 안정적으로 서 있지 않습니다. 세 다리를 먼저 펼치세요.'); break; }
      next.groundChecked = true; message = '단단한 지면에 세 발이 닿았습니다. 이제 위에서 기포를 관찰하세요.'; break;
    case 'view':
      if (action.view === 'top' && (!readiness.spread || !state.groundChecked)) { deny('먼저 다리를 모두 펼치고 발끝 지지를 확인하세요.'); break; }
      next.view = action.view;
      if (action.view === 'top') next.observed = true;
      message = action.view === 'top' ? '북쪽은 화면 위입니다. 기포의 방향을 보고 조절할 다리를 선택하세요.' : '전체 모습으로 돌아왔습니다. 확대 수준기는 상부 보기에서 확인할 수 있어요.'; break;
    case 'select': next.selected = action.leg; message = `${LEG_LABELS[action.leg]}를 선택했습니다.`; break;
    case 'support':
      if (!state.placed || !readiness.spread) { deny('먼저 삼각대를 놓고 세 다리를 펼치세요.'); break; }
      if (state.supported && !readiness.locked) { deny('다리가 풀려 있습니다. 길이 잠금을 모두 잠근 뒤 상판에서 손을 떼세요.'); break; }
      next.supported = !state.supported; message = next.supported ? '상판을 받치고 있습니다. 조절할 다리 하나의 길이 잠금만 푸세요.' : '잠금 상태를 유지한 채 상판에서 손을 뗐습니다.'; break;
    case 'lock':
      if (!state.placed || !readiness.spread || !state.groundChecked) { deny('다리를 모두 펼치고 지면 지지를 확인한 뒤 길이를 조절하세요.'); break; }
      if (state.legs[action.leg].locked) {
        if (!state.supported) { deny('길이 잠금을 풀면 상판이 내려갈 수 있습니다. 먼저 상판을 받쳐 주세요.'); break; }
        if (!readiness.locked) { deny('한 번에 한 다리만 조절합니다. 이미 풀린 다리를 먼저 잠그세요.'); break; }
      }
      next.legs[action.leg].locked = !state.legs[action.leg].locked; next.checked = false;
      message = `${LEG_LABELS[action.leg]} 길이 잠금을 ${next.legs[action.leg].locked ? '잠갔습니다. 기포를 다시 확인하세요.' : '풀었습니다. 길이를 조금 바꿔 기포의 이동을 관찰하세요.'}`; break;
    case 'extend': {
      if (!Number.isFinite(action.value)) return state;
      if (!state.placed || !readiness.spread || !state.groundChecked) { deny('삼각대의 지지 상태부터 확인하세요.'); break; }
      if (state.legs[action.leg].locked) { deny('선택한 다리의 길이 잠금이 잠겨 있어 움직이지 않습니다. 상판을 받친 뒤 이 다리의 잠금을 푸세요.'); break; }
      if (!state.supported) { deny('상판을 받친 상태에서 다리 길이를 조절하세요.'); break; }
      next.legs[action.leg].extension = Math.round(Math.max(0, Math.min(60, action.value)));
      next.checked = false;
      const before = tripodGeometry(state).tiltDeg; const after = tripodGeometry(next).tiltDeg;
      message = Math.abs(after - before) < 0.0001 ? '다리의 조절 범위 끝입니다.' : after < before ? '기포가 중심에 가까워졌습니다. 조금씩 조절하며 변화를 관찰하세요.' : '기포가 중심에서 더 멀어졌습니다. 반대 방향이나 다른 다리의 조절을 생각해 보세요.';
      break;
    }
    case 'check':
      if (!readiness.stable) { deny('가대를 올릴 수 없습니다. 세 다리의 펼침·발끝 지지·길이 잠금을 모두 확인하세요.'); break; }
      if (!state.observed || state.view !== 'top') { deny('위에서 수준기를 관찰한 뒤 설치 상태를 확인하세요.'); break; }
      if (!tripodGeometry(state).level) { deny('기포가 중심 원 밖에 있습니다. 상판이 아직 기울어져 있어요. 다리 길이를 조절하고 다시 잠그세요.'); break; }
      next.checked = true; next.supported = false; message = '세 발의 지지와 잠금, 상판 수평을 확인했습니다. 가대를 올릴 준비가 됐습니다.'; break;
    case 'hint': {
      next.hintCount = state.hintCount + 1;
      if (!readiness.spread) message = '세 다리가 모두 펼쳐져야 지지 영역이 확보됩니다.';
      else if (!state.groundChecked) message = '발끝 지지 확인을 먼저 해 보세요.';
      else if (next.hintCount === 1) message = '먼저 위에서 기포가 중심의 어느 방향에 있는지 살펴보세요.';
      else if (next.hintCount === 2) message = '기포는 상판의 높은 쪽으로 이동합니다. 한 다리를 늘리면 그쪽 지지 높이가 올라갑니다.';
      else {
        const geo = tripodGeometry(state);
        if (geo.level) message = '기포는 중심에 있습니다. 길이 잠금을 모두 잠그고 설치 상태를 다시 확인하세요.';
        else {
          const highest = geo.heights.indexOf(Math.max(...geo.heights)); const lowest = geo.heights.indexOf(Math.min(...geo.heights));
          const leg = state.legs[LEG_IDS[highest]].extension > 0 ? LEG_IDS[highest] : LEG_IDS[lowest];
          message = `${LEG_LABELS[leg]}를 ${leg === LEG_IDS[highest] ? '조금 줄여' : '조금 늘려'} 보세요. 상판을 받치고 해당 다리의 길이 잠금을 먼저 푸세요.`;
        }
      }
      break;
    }
  }
  if (blocked) next = { ...state };
  const sequence = state.sequence + 1;
  return { ...next, feedback: message, sequence, events: [...state.events, { sequence, action: action.type, ...('leg' in action ? { leg: action.leg } : {}), blocked, message }].slice(-160) };
}

/** Reject malformed/future saves, never turn old numerical progress into credit. */
export function restoreTripod(input: unknown): TripodState {
  if (!input || typeof input !== 'object') return createTripod();
  const data = input as TripodState;
  if (data.version !== 2 || !Object.hasOwn(SCENARIOS, data.scenario) || !LEG_IDS.includes(data.selected) || !['field', 'top'].includes(data.view)) return createTripod();
  for (const field of ['placed', 'groundChecked', 'supported', 'observed', 'checked'] as const) if (typeof data[field] !== 'boolean') return createTripod();
  for (const id of LEG_IDS) {
    const leg = data.legs?.[id];
    if (!leg || !Number.isFinite(leg.extension) || leg.extension < 0 || leg.extension > 60 || typeof leg.locked !== 'boolean' || typeof leg.spread !== 'boolean') return createTripod();
  }
  const restored = { ...createTripod(), ...data, events: Array.isArray(data.events) ? data.events.filter(e => e && Number.isInteger(e.sequence) && typeof e.action === 'string' && typeof e.message === 'string' && typeof e.blocked === 'boolean').slice(-160) : [], hintCount: Number.isInteger(data.hintCount) && data.hintCount >= 0 ? data.hintCount : 0, sequence: Number.isInteger(data.sequence) && data.sequence >= 0 ? data.sequence : 0, feedback: typeof data.feedback === 'string' ? data.feedback : '' };
  if (!tripodReadiness(restored).stable || !tripodGeometry(restored).level || !restored.observed) restored.checked = false;
  // Resuming a virtual support action is allowed, but never counts as final safety credit.
  if (LEG_IDS.some(id => !restored.legs[id].locked)) restored.checked = false;
  return restored;
}
