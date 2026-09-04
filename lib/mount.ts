import { tripodReadiness, type TripodState } from './tripod.ts';

export const MOUNT_STORAGE_KEY = 'telescope-lab-progress-mount-v3';
export const PRACTICE_LATITUDE = 37; // Fictional northern site, NOT the user's school.
export type MountView = 'assembly' | 'under' | 'direction';
export type MountState = {
  version: 1; alignedBase: boolean; placed: boolean; supported: boolean; bolt: number;
  fixationChecked: boolean; azimuth: number; altitude: number; azSeated: boolean; altSeated: boolean;
  checked: boolean; view: MountView; feedback: string; hints: number;
  events: { action: string; blocked: boolean; message: string }[];
};
export type MountAction = { type: 'align-base' | 'place' | 'miss' | 'support' | 'bolt' | 'test' | 'az-seat' | 'alt-seat' | 'check' | 'hint' }
  | { type: 'view'; view: MountView } | { type: 'azimuth' | 'altitude'; value: number };
export function createMount(): MountState {
  return { version: 1, alignedBase: false, placed: false, supported: false, bolt: 0, fixationChecked: false,
    azimuth: 12, altitude: 25, azSeated: false, altSeated: false, checked: false, view: 'assembly', hints: 0,
    feedback: '가대의 기준 홈을 확인한 뒤 삼각대 결합면으로 옮기세요.', events: [] };
}
export function mountReadiness(s: MountState, tripod: TripodState) {
  const fixed = s.placed && s.alignedBase && s.bolt === 4 && s.fixationChecked && tripodReadiness(tripod).ready;
  const directed = Math.abs(s.azimuth) <= 2 && Math.abs(s.altitude - PRACTICE_LATITUDE) <= 2;
  return { fixed, directed, ready: fixed && directed && s.azSeated && s.altSeated && s.checked };
}
export function mountReducer(s: MountState, a: MountAction, tripod: TripodState, loaded = false): MountState {
  const next = { ...s }; let message = ''; let blocked = false;
  const deny = (text: string) => { blocked = true; message = text; };
  const ready = mountReadiness(s, tripod);
  if (loaded && !['view', 'hint', 'check'].includes(a.type)) deny('무게추나 경통이 올라간 상태입니다. 이 연습에서는 가대 설정을 바꿀 수 없습니다. 관찰하거나 처음부터 다시 연습하세요.');
  else switch (a.type) {
    case 'view': next.view = a.view; message = a.view === 'under' ? '하부 확대입니다. 중앙 결합 손잡이를 확인하세요. 실제 실습에서는 장비 아래로 머리를 넣지 마세요.' : a.view === 'direction' ? '방위는 위에서, 고도는 옆에서 본 개념도로 확인합니다. 정밀 극축 정렬은 아직 아닙니다.' : '전체 조립 모습입니다.'; break;
    case 'align-base':
      if (s.placed) { deny('이미 안착했습니다. 장착 전 확인한 기준 홈을 유지합니다.'); break; }
      next.alignedBase = !s.alignedBase; message = next.alignedBase ? '가대 밑면의 기준 홈을 삼각대 북쪽 기준에 맞췄습니다. 이제 결합면으로 옮기세요.' : '기준 홈 방향을 되돌렸습니다. 안착 전에 다시 맞춰 주세요.'; break;
    case 'place':
      if (!tripodReadiness(tripod).ready) { deny('삼각대의 수평·지지·최종 잠금 확인이 먼저입니다. 불안정한 삼각대에 가대를 올릴 수 없습니다.'); break; }
      if (s.placed) { deny('이미 가대가 놓여 있습니다. 하부 고정을 확인하세요.'); break; }
      if (!s.alignedBase) { deny('기준 홈 방향이 맞지 않아 완전히 내려앉지 않습니다. 밑면의 홈을 북쪽 기준에 맞춘 뒤 다시 옮기세요.'); break; }
      next.placed = true; next.supported = true; message = '가대를 받친 채 올려놓았습니다. 아직 고정되지 않았습니다. 하부 확대에서 중앙 결합 손잡이를 조이세요.'; break;
    case 'miss': deny('결합면을 벗어났습니다. 가대 밑면의 작은 원을 삼각대 결합 원에 맞춰 주세요.'); break;
    case 'support':
      if (!s.placed) { deny('먼저 가대를 안착하세요. 옮길 때에는 받친 상태로 이동합니다.'); break; }
      if (s.supported && !ready.fixed) { deny('하부 고정과 유격 확인 전에는 손을 떼지 마세요. 가대가 넘어질 수 있습니다.'); break; }
      next.supported = !s.supported; message = next.supported ? '가대를 받치고 있습니다.' : '하부 고정을 확인한 뒤 손을 뗐습니다.'; break;
    case 'bolt':
      if (!s.placed || !s.supported) { deny('가대를 안착하고 받친 상태에서 하부 손잡이를 조이세요.'); break; }
      if (s.view !== 'under') { deny('하부 확대에서 중앙 결합 손잡이의 위치를 먼저 확인하세요.'); break; }
      if (s.bolt === 4) { deny('결합면이 밀착되었습니다. 더 세게 조이지 말고 유격을 확인하세요.'); break; }
      next.bolt++; next.fixationChecked = false; next.checked = false;
      message = next.bolt === 4 ? '결합면이 밀착되었습니다. 가대를 받친 채 유격이 없는지 확인하세요.' : '하부 손잡이가 조여지고 있습니다. 아직 결합면에 틈이 남아 있습니다.'; break;
    case 'test':
      if (!s.placed || !s.supported) { deny('가대를 받친 상태에서 결합부의 유격을 확인하세요.'); break; }
      if (s.bolt < 4) { deny('결합부에 유격이 남아 있습니다. 하부 중앙 손잡이를 더 조인 뒤 다시 확인하세요.'); break; }
      next.fixationChecked = true; message = '결합면이 밀착되고 유격이 없습니다. 이제 측면 방위·고도 설정을 확인하세요.'; break;
    case 'azimuth': case 'altitude': {
      if (!Number.isFinite(a.value)) return s;
      if (!ready.fixed) { deny('먼저 하부 결합 고정과 유격 확인을 완료하세요. 측면 나사는 하부 결합을 대신하지 않습니다.'); break; }
      if (s.view !== 'direction') { deny('방향 보기에서 어떤 축이 움직이는지 확인하며 조절하세요.'); break; }
      if (a.type === 'azimuth' ? s.azSeated : s.altSeated) { deny('양쪽 조절 나사가 맞닿아 있습니다. 조절 여유를 만든 뒤 조금씩 움직이세요. 억지로 돌리지 마세요.'); break; }
      next[a.type] = Math.round(Math.max(a.type === 'azimuth' ? -25 : 10, Math.min(a.type === 'azimuth' ? 25 : 60, a.value)));
      next.checked = false;
      message = a.type === 'azimuth' ? '방위 조절은 가대의 극축 방향을 좌우로 바꿉니다. 북쪽 기준선과 비교하세요.' : '고도 조절은 극축의 높이를 바꿉니다. 가상 관측지의 북위 37°와 비교하세요.'; break;
    }
    case 'az-seat': case 'alt-seat': {
      if (!ready.fixed) { deny('먼저 하부 결합 고정과 유격 확인을 완료하세요.'); break; }
      const field = a.type === 'az-seat' ? 'azSeated' : 'altSeated'; next[field] = !s[field]; next.checked = false;
      message = next[field] ? '양쪽 나사가 가볍게 맞닿도록 정리했습니다. 과도하게 힘을 주지 않습니다.' : '조절할 쪽의 반대편 나사를 조금 풀어 여유를 만들었습니다.'; break;
    }
    case 'check':
      if (!ready.fixed) { deny('가대의 안착·하부 고정·유격 확인이 모두 필요합니다.'); break; }
      if (!ready.directed) { deny('극축의 기본 방향이 아직 맞지 않습니다. 북쪽 기준선과 가상 위도 37°를 다시 비교하세요.'); break; }
      if (!s.azSeated || !s.altSeated) { deny('설정 후 방위·고도 조절 나사가 가볍게 맞닿았는지 확인하세요.'); break; }
      next.checked = true; next.supported = false; message = '가대 고정과 북쪽·위도 기본 설정을 확인했습니다. 정밀 극축 정렬은 이후에 별도로 해야 합니다.'; break;
    case 'hint':
      next.hints++;
      message = !s.placed ? '먼저 가대 밑면의 기준 홈을 북쪽 기준에 맞추세요. 드래그 대신 Enter도 사용할 수 있습니다.' : !ready.fixed ? '하부 확대 → 중앙 손잡이 조임 → 받친 채 유격 확인 순서입니다.' : next.hints < 3 ? '방위 나사는 좌우, 고도 나사는 위아래 방향을 조절합니다. 개념도의 기준선과 비교하세요.' : '방위는 0° 부근, 고도는 가상 위도 37° 부근으로 조절한 뒤 양쪽 나사 맞닿음을 확인하세요.'; break;
  }
  return { ...(blocked ? s : next), feedback: message, events: [...s.events, { action: a.type, blocked, message }].slice(-160) };
}
export function restoreMount(input: unknown, tripod: TripodState): MountState {
  if (!input || typeof input !== 'object' || !tripodReadiness(tripod).ready) return createMount();
  const s = input as MountState;
  if (s.version !== 1 || !['assembly', 'under', 'direction'].includes(s.view)) return createMount();
  for (const key of ['alignedBase', 'placed', 'supported', 'fixationChecked', 'azSeated', 'altSeated', 'checked'] as const) if (typeof s[key] !== 'boolean') return createMount();
  if (!Number.isInteger(s.bolt) || s.bolt < 0 || s.bolt > 4 || !Number.isInteger(s.azimuth) || Math.abs(s.azimuth) > 25 || !Number.isInteger(s.altitude) || s.altitude < 10 || s.altitude > 60) return createMount();
  if ((s.placed && !s.alignedBase) || (!s.placed && s.bolt > 0) || (s.fixationChecked && s.bolt !== 4)) return createMount();
  const r = { ...createMount(), ...s, hints: Number.isInteger(s.hints) && s.hints >= 0 ? s.hints : 0,
    feedback: typeof s.feedback === 'string' ? s.feedback : '', events: Array.isArray(s.events) ? s.events.filter(e => e && typeof e.action === 'string' && typeof e.blocked === 'boolean' && typeof e.message === 'string').slice(-160) : [] };
  if (!mountReadiness(r, tripod).ready) r.checked = false;
  return r;
}
