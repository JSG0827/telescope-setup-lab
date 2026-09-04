import { mountReadiness, type MountState } from './mount.ts';
import { type TripodState } from './tripod.ts';

export const COUNTERWEIGHT_STORAGE_KEY = 'telescope-lab-progress-counterweight-v4';
export type CounterweightState = {
  version: 1; view: 'assembly' | 'detail'; inspected: boolean; stopper: boolean;
  placed: boolean; supported: boolean; clamped: boolean; position: number;
  tested: boolean; checked: boolean; hints: number; feedback: string;
  events: { action: string; blocked: boolean; message: string; value?: number }[];
};
export type CounterweightAction = { type: 'inspect' | 'stopper' | 'clamp' | 'place' | 'miss' | 'support' | 'test' | 'check' | 'hint' | 'clutch' }
  | { type: 'view'; view: CounterweightState['view'] } | { type: 'move'; value: number };
export function createCounterweight(): CounterweightState {
  return { version: 1, view: 'assembly', inspected: false, stopper: true, placed: false,
    supported: false, clamped: true, position: 70, tested: false, checked: false, hints: 0,
    feedback: '봉의 고정과 축 잠금을 확인한 뒤, 무게추를 봉 끝으로 가져오세요.', events: [] };
}
export function counterweightReadiness(s: CounterweightState, mount: MountState, tripod: TripodState) {
  const secured = mountReadiness(mount, tripod).ready && s.inspected && s.placed && s.clamped && s.stopper && s.tested;
  return { secured, ready: secured && s.checked };
}
export function counterweightReducer(s: CounterweightState, a: CounterweightAction, mount: MountState, tripod: TripodState, tubeAttached = false): CounterweightState {
  const next = { ...s }; let blocked = false; let message = '';
  const deny = (text: string) => { blocked = true; message = text; };
  const prerequisite = mountReadiness(mount, tripod).ready;
  if (tubeAttached && !['view', 'hint', 'check'].includes(a.type)) deny('경통이 장착된 상태입니다. 무게추 위치 조정은 두 축 균형 단계에서 진행합니다. 지금은 관찰만 할 수 있어요.');
  else if (!prerequisite && !['view', 'hint', 'miss'].includes(a.type)) deny('먼저 삼각대와 가대의 고정·기본 방향 확인을 마치세요. 무게추가 더해지면 장비에 하중이 걸립니다.');
  else switch (a.type) {
    case 'view': next.view = a.view; message = a.view === 'detail' ? '봉 확대입니다. 무게추 옆 고정나사와 봉 끝 안전장치는 서로 다른 부품이에요.' : '1·2단계에서 설치한 삼각대와 가대의 전체 모습입니다.'; break;
    case 'inspect': next.inspected = true; next.view = 'detail'; message = '봉이 가대에 고정되어 있고 아래쪽을 향하며, 두 축 클러치가 잠겨 있음을 확인했습니다. 이 연습은 봉이 장착된 가대에서 시작해요.'; break;
    case 'clutch': deny('클러치를 풀면 가대의 축이 회전할 수 있습니다. 지금 필요한 것은 무게추 옆 고정나사입니다. 축 균형은 경통과 부속품을 장착한 뒤 연습해요.'); break;
    case 'stopper':
      if (!s.inspected) { deny('봉 확대에서 봉의 고정과 축 잠금 상태를 먼저 확인하세요.'); break; }
      if (s.placed && (!s.supported || (s.stopper && !s.clamped))) { deny('무게추를 받치고 위치를 고정한 상태에서 봉 끝 안전장치를 다루세요. 풀린 무게추가 봉 밖으로 빠질 수 있습니다.'); break; }
      next.stopper = !s.stopper; next.tested = false; next.checked = false;
      message = next.stopper ? '봉 끝 안전장치를 다시 장착했습니다. 이탈을 막지만 무게추의 위치를 고정하지는 않아요.' : '봉 끝 안전장치를 풀어 보관함에 놓았습니다. 무게추를 끼운 뒤 반드시 다시 장착하세요.'; break;
    case 'clamp':
      if (s.placed && !s.supported) { deny('먼저 무게추를 아래에서 받치세요. 고정나사를 풀면 봉을 따라 미끄러질 수 있어요.'); break; }
      next.clamped = !s.clamped; next.tested = false; next.checked = false;
      message = next.clamped ? '무게추 고정나사를 조였습니다. 받친 채 위치가 움직이지 않는지 확인해야 합니다.' : s.placed ? '받친 상태에서 고정나사를 조금 풀었습니다. 봉을 따라 임시 위치를 조절하세요.' : '준비물대에서 고정나사를 조금 풀어 가운데 구멍을 비웠습니다. 나사를 완전히 빼지는 않아요.'; break;
    case 'place':
      if (s.placed) { deny('무게추는 이미 봉에 있습니다. 받침·고정·안전장치를 확인하세요.'); break; }
      if (!s.inspected) { deny('무게추를 들기 전에 봉의 고정과 축 잠금 상태를 확인하세요.'); break; }
      if (s.stopper) { deny('봉 끝 안전장치가 구멍보다 커서 들어가지 않습니다. 안전장치를 풀어 보관한 뒤 다시 끼우세요.'); break; }
      if (s.clamped) { deny('무게추 고정나사가 구멍을 막고 있습니다. 준비물대에서 나사를 조금 풀고 다시 옮기세요.'); break; }
      next.placed = true; next.supported = true; next.position = 70; next.tested = false; next.checked = false;
      message = '무게추를 받쳐 봉 끝에서 안쪽으로 끼웠습니다. 받친 채 임시 위치를 조절하고 고정나사를 조이세요.'; break;
    case 'miss': deny('무게추의 가운데 기준점을 봉 끝의 삽입 원에 맞춰 주세요. 봉 옆면으로는 끼울 수 없어요. Enter로도 같은 절차를 진행할 수 있습니다.'); break;
    case 'support':
      if (!s.placed) { deny('무게추는 준비물대 위에 있습니다. 옮길 때 자동으로 받친 상태가 됩니다.'); break; }
      if (s.supported && !counterweightReadiness(s, mount, tripod).secured) { deny('고정나사·봉 끝 안전장치·미끄러짐 확인을 마칠 때까지 받쳐 주세요. 손을 놓으면 무게추가 떨어지거나 안전장치에 충돌할 수 있습니다.'); break; }
      next.supported = !s.supported; message = next.supported ? '무게추를 아래에서 받치고 있습니다.' : '고정과 이탈 방지 상태를 확인한 뒤 손을 뗐습니다.'; break;
    case 'move':
      if (!Number.isFinite(a.value)) return s;
      if (!s.placed || !s.supported) { deny('봉에 끼운 무게추를 아래에서 받친 상태에서 움직이세요.'); break; }
      if (s.clamped) { deny('고정나사가 잠겨 있어 움직이지 않습니다. 받친 채 무게추 고정나사를 조금 풀어 주세요.'); break; }
      next.position = Math.round(Math.max(15, Math.min(75, a.value))); next.tested = false; next.checked = false;
      message = '받친 무게추를 봉을 따라 옮겼습니다. 지금은 임시 위치입니다. 최종 균형은 경통과 관측 부속품을 모두 장착한 뒤 맞춰요.'; break;
    case 'test':
      if (!s.placed || !s.supported) { deny('무게추를 아래에서 받친 상태에서 미끄러짐을 확인하세요.'); break; }
      if (!s.clamped) { deny('받친 손 안에서 무게추가 봉을 따라 움직입니다. 봉 끝 안전장치가 있어도 위치는 고정되지 않아요. 고정나사를 조인 뒤 다시 확인하세요.'); break; }
      if (!s.stopper) { deny('무게추 위치는 고정됐지만 봉 끝이 열려 있습니다. 안전장치를 다시 장착한 뒤 확인하세요.'); break; }
      next.tested = true; message = '받친 채 확인했을 때 무게추가 미끄러지지 않고 봉 끝 안전장치도 장착되어 있습니다.'; break;
    case 'check':
      if (!counterweightReadiness(s, mount, tripod).secured) { deny('설치 확인이 끝나지 않았습니다. 무게추 고정나사, 봉 끝 안전장치, 받친 채 미끄러짐 확인을 점검하세요.'); break; }
      next.checked = true; next.supported = false; message = '무게추의 고정과 이탈 방지를 확인했습니다. 이제 경통을 설치할 수 있어요. 아직 축 균형을 확인한 것은 아닙니다.'; break;
    case 'hint':
      next.hints++;
      message = next.hints === 1 ? '봉 끝과 무게추 옆을 비교해 보세요. 어느 나사가 구멍을 막고, 어느 부품이 봉 밖으로 빠지는 것을 막을까요?' : next.hints === 2 ? '봉 끝 안전장치는 이탈 방지용, 무게추 옆 고정나사는 위치 고정용입니다. 풀린 무게추는 계속 받쳐야 해요.' : '봉 상태 확인 → 안전장치 보관 → 무게추 나사 풀기 → 봉 끝으로 옮기기 → 위치 고정 → 안전장치 재장착 → 받친 채 확인 순서로 진행하세요.'; break;
  }
  return { ...(blocked ? s : next), feedback: message, events: [...s.events, { action: a.type, blocked, message, ...('value' in a ? { value: a.value } : {}) }].slice(-160) };
}
export function restoreCounterweight(input: unknown, mount: MountState, tripod: TripodState): CounterweightState {
  if (!input || typeof input !== 'object' || !mountReadiness(mount, tripod).ready) return createCounterweight();
  const s = input as CounterweightState;
  if (s.version !== 1 || !['assembly', 'detail'].includes(s.view)) return createCounterweight();
  for (const k of ['inspected', 'stopper', 'placed', 'supported', 'clamped', 'tested', 'checked'] as const) if (typeof s[k] !== 'boolean') return createCounterweight();
  if (!Number.isInteger(s.position) || s.position < 15 || s.position > 75 || (s.placed && !s.inspected) || (!s.placed && (s.supported || s.tested || s.checked)) || (s.placed && !s.supported && (!s.clamped || !s.stopper || !s.tested)) || (s.tested && (!s.clamped || !s.stopper))) return createCounterweight();
  const r = { ...createCounterweight(), ...s, hints: Number.isInteger(s.hints) && s.hints >= 0 ? s.hints : 0,
    events: Array.isArray(s.events) ? s.events.filter(e => e && typeof e.action === 'string' && typeof e.message === 'string' && typeof e.blocked === 'boolean').slice(-160) : [], feedback: typeof s.feedback === 'string' ? s.feedback : '' };
  if (!counterweightReadiness(r, mount, tripod).secured) r.checked = false;
  return r;
}
