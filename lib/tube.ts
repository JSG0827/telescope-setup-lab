import { counterweightReadiness, type CounterweightState } from './counterweight.ts';
import { type MountState } from './mount.ts';
import { type TripodState } from './tripod.ts';

export const TUBE_STORAGE_KEY = 'telescope-lab-progress-tube-v5';
export type TubeState = {
  version: 1; view: 'assembly' | 'detail'; inspected: boolean; aligned: boolean;
  supported: boolean; placed: boolean; seated: boolean; saddleOpen: boolean;
  clamp: number; tested: boolean; checked: boolean; hints: number; feedback: string;
  events: { action: string; blocked: boolean; message: string }[];
};
export type TubeAction = { type: 'inspect' | 'align' | 'support' | 'open' | 'place' | 'miss' | 'seat' | 'tighten' | 'test' | 'check' | 'return' | 'lens' | 'clutch' | 'hint' }
  | { type: 'view'; view: TubeState['view'] };
export function createTube(): TubeState {
  return { version: 1, view: 'assembly', inspected: false, aligned: false, supported: false,
    placed: false, seated: false, saddleOpen: false, clamp: 0, tested: false, checked: false,
    hints: 0, feedback: '경통 아래 도브테일 레일과 가대 안장을 관찰하세요. 경통을 본체와 밴드 부근에서 받쳐 옮깁니다.', events: [] };
}
export function tubeReadiness(s: TubeState, counter: CounterweightState, mount: MountState, tripod: TripodState) {
  const fixed = counterweightReadiness(counter, mount, tripod).ready && s.inspected && s.aligned && s.placed && s.seated && !s.saddleOpen && s.clamp === 3;
  return { fixed, secured: fixed && s.tested, ready: fixed && s.tested && s.checked };
}
export function tubeReducer(s: TubeState, a: TubeAction, counter: CounterweightState, mount: MountState, tripod: TripodState, laterWork = false): TubeState {
  const n = { ...s }; let blocked = false; let message = '';
  const deny = (text: string) => { blocked = true; message = text; };
  const invalidate = () => { n.tested = false; n.checked = false; };
  if (laterWork && !['view', 'hint', 'check'].includes(a.type)) deny('축 균형 또는 관측 부속품 실습을 시작한 상태입니다. 이 단계에서는 고정 상태를 관찰하세요. 재장착하려면 처음부터 다시 연습하세요.');
  else if (!counterweightReadiness(counter, mount, tripod).ready && !['view', 'hint', 'miss'].includes(a.type)) deny('삼각대·가대와 무게추의 고정 확인이 먼저입니다. 무게추 안전장치와 미끄러짐 확인을 마친 뒤 경통을 올리세요.');
  else switch (a.type) {
    case 'view': n.view = a.view; message = a.view === 'detail' ? '경통 아래 레일과 안장 결합부 확대입니다. 위에 닿은 상태와 홈 안으로 들어간 상태를 구분하세요.' : '앞 단계의 다리 길이와 무게추 위치가 이어진 전체 모습입니다.'; break;
    case 'inspect': n.inspected = true; n.view = 'detail'; message = '도브테일은 경통 아래 레일, 안장은 가대의 결합 홈입니다. 무게추 고정과 두 축 잠금을 확인한 설치 자세입니다.'; break;
    case 'align':
      if (s.placed) { deny('경통이 안장에 걸쳐 있습니다. 받친 채 준비물대로 되돌린 후 방향을 바꾸세요.'); break; }
      n.aligned = !s.aligned; message = n.aligned ? '레일의 긴 방향을 안장 홈과 나란히 맞췄습니다.' : '레일이 홈과 어긋난 방향입니다. 비스듬히 놓으면 양쪽 면이 제대로 물리지 않습니다.'; break;
    case 'lens': deny('렌즈면은 잡는 곳이 아닙니다. 경통 본체와 밴드 부근을 받쳐 무게를 지지하세요.'); break;
    case 'clutch': deny('클러치는 가대 축의 회전을 제어하며 경통을 안장에 고정하지 않습니다. 설치 중에는 두 축을 잠그고 안장 옆 고정 손잡이를 사용하세요.'); break;
    case 'support':
      if (s.placed && s.supported && !tubeReadiness(s, counter, mount, tripod).secured) { deny('경통 고정과 유격 확인이 끝나지 않았습니다. 받친 손을 떼면 경통이 미끄러지거나 기울어질 수 있어요.'); break; }
      n.supported = !s.supported; message = n.supported ? '경통 본체와 밴드 부근을 받치고 있습니다. 손잡이를 조작하는 동안에도 경통을 계속 지지하세요.' : s.placed ? '경통의 고정과 유격을 확인한 뒤 손을 뗐습니다.' : '준비물대에 놓인 경통에서 손을 뗐습니다.'; break;
    case 'open':
      if (!s.inspected) { deny('결합부 확대에서 안장 고정 손잡이의 위치를 먼저 확인하세요.'); break; }
      if (s.placed && !s.supported) { deny('고정 손잡이를 풀기 전에 경통을 받치세요. 잠금을 풀면 경통을 붙잡는 힘이 사라집니다.'); break; }
      n.saddleOpen = true; n.clamp = 0; invalidate(); message = '안장 손잡이를 조금 풀어 레일이 들어갈 여유를 만들었습니다. 나사를 완전히 빼지 않습니다.'; break;
    case 'place':
      if (s.placed) { deny('경통은 이미 안장 쪽에 있습니다. 홈 안착과 고정을 이어서 확인하세요.'); break; }
      if (!s.inspected) { deny('경통 아래 레일과 안장 홈을 먼저 관찰하세요.'); break; }
      if (!s.supported) { deny('먼저 경통 본체를 받쳐 주세요. 드래그만으로 무거운 경통을 안전하게 지지한 것으로 보지 않습니다.'); break; }
      if (!s.saddleOpen) { deny('안장 고정 손잡이가 잠겨 있어 레일이 들어갈 여유가 없습니다. 손잡이를 조금 풀어 주세요.'); break; }
      if (!s.aligned) { deny('레일이 안장 홈과 비스듬히 어긋나 있습니다. 준비물대에서 긴 방향을 나란히 맞춘 뒤 다시 옮기세요.'); break; }
      n.placed = true; n.seated = false; invalidate(); message = '레일을 홈 입구에 가져왔지만 아직 완전히 물리지 않았습니다. 받친 채 레일을 홈 안으로 밀어 안착시키세요.'; break;
    case 'miss': deny('경통 아래 레일의 작은 기준점을 가대 안장의 표시 안으로 옮겨 주세요. 경통 몸통이 닿는 것만으로 결합되지 않습니다.'); break;
    case 'seat':
      if (!s.placed || !s.supported) { deny('안장에 가져온 경통을 받친 채 레일을 안착시키세요.'); break; }
      if (!s.saddleOpen || s.clamp > 0) { deny('잠긴 안장에 경통을 억지로 밀지 마세요. 받친 뒤 고정 손잡이를 조금 풀어야 합니다.'); break; }
      n.seated = true; invalidate(); message = '레일 양쪽 면이 안장 홈 안으로 들어갔습니다. 고정 손잡이를 조여 밀착시키세요.'; break;
    case 'tighten':
      if (!s.placed || !s.supported) { deny('경통이 안장에 있고 받쳐져 있어야 고정할 수 있습니다.'); break; }
      if (!s.seated) { deny('레일이 홈 입구에 걸쳐 있습니다. 이 상태에서 조이면 한쪽만 물릴 수 있어요. 먼저 홈 안으로 안착시키세요.'); break; }
      if (s.clamp === 3) { deny('이미 밀착됐습니다. 더 세게 조이지 말고 받친 채 유격을 확인하세요.'); break; }
      n.clamp++; n.saddleOpen = false; invalidate(); message = n.clamp === 3 ? '레일이 안장에 밀착됐습니다. 경통을 받친 채 결합부가 움직이지 않는지 확인하세요.' : '손잡이를 조이고 있습니다. 아직 결합부 고정을 마치지 않았습니다.'; break;
    case 'test':
      if (!s.placed || !s.supported) { deny('경통을 받친 채 아주 작은 힘으로 결합부를 확인하세요. 손을 놓고 시험하지 않습니다.'); break; }
      if (!s.seated) { deny('레일이 홈 안에 완전히 들어가지 않아 기울어집니다. 받친 채 다시 안착시키세요.'); break; }
      if (!tubeReadiness(s, counter, mount, tripod).fixed) { deny('결합부에 유격이 남아 경통이 움직입니다. 받침을 유지하며 안장 고정 손잡이를 조인 뒤 다시 확인하세요.'); break; }
      n.tested = true; message = '받친 채 확인했을 때 레일이 들리거나 미끄러지지 않습니다. 안장과 경통이 함께 고정되어 있습니다.'; break;
    case 'return':
      if (!s.placed || !s.supported || s.clamp > 0 || !s.saddleOpen) { deny('경통을 받치고 안장 고정 손잡이를 푼 상태에서만 준비물대로 되돌릴 수 있습니다.'); break; }
      n.placed = false; n.seated = false; n.supported = false; invalidate(); message = '경통을 받쳐 준비물대에 내려놓았습니다. 레일 방향과 안장 상태를 다시 살펴보세요.'; break;
    case 'check':
      if (!tubeReadiness(s, counter, mount, tripod).secured) { deny('홈 안착·고정 손잡이·받친 채 유격 확인을 모두 마쳐야 합니다. 고정했다고 바로 균형이 맞는 것은 아닙니다.'); break; }
      n.checked = true; n.supported = false; message = '경통 설치를 확인했습니다. 고정과 축 균형은 다른 확인입니다. 최종 균형은 관측 부속품을 모두 장착한 상태에서 맞춥니다.'; break;
    case 'hint':
      n.hints++; message = n.hints === 1 ? '경통 아래 긴 레일과 안장 양쪽 면을 확대해서 비교해 보세요. 손을 떼기 전 무엇을 확인해야 할까요?' : n.hints === 2 ? '홈 입구에 걸친 상태에서는 조여도 제대로 고정되지 않습니다. 레일 양쪽 면을 홈 안에 넣고 고정해야 해요.' : '결합부 관찰 → 안장 여유 만들기 → 본체 받침·레일 방향 맞춤 → 드래그 → 홈 안착 → 손잡이 조임 → 받친 채 유격 확인 → 최종 확인 순서입니다.'; break;
  }
  return { ...(blocked ? s : n), feedback: message, events: [...s.events, { action: a.type, blocked, message }].slice(-160) };
}
export function restoreTube(input: unknown, counter: CounterweightState, mount: MountState, tripod: TripodState): TubeState {
  if (!input || typeof input !== 'object' || !counterweightReadiness(counter, mount, tripod).ready) return createTube();
  const s = input as TubeState;
  if (s.version !== 1 || !['assembly', 'detail'].includes(s.view)) return createTube();
  for (const k of ['inspected', 'aligned', 'supported', 'placed', 'seated', 'saddleOpen', 'tested', 'checked'] as const) if (typeof s[k] !== 'boolean') return createTube();
  if (!Number.isInteger(s.clamp) || s.clamp < 0 || s.clamp > 3 ||
    (s.placed && (!s.inspected || !s.aligned)) || (!s.placed && (s.seated || s.clamp > 0 || s.tested || s.checked)) ||
    (s.clamp > 0 && (!s.seated || s.saddleOpen)) || (s.placed && s.clamp === 0 && !s.saddleOpen) ||
    (s.tested && (s.clamp !== 3 || !s.seated)) || (s.placed && !s.supported && !s.tested)) return createTube();
  const r = { ...createTube(), ...s, hints: Number.isInteger(s.hints) && s.hints >= 0 ? s.hints : 0,
    feedback: typeof s.feedback === 'string' ? s.feedback : '', events: Array.isArray(s.events) ? s.events.filter(e => e && typeof e.action === 'string' && typeof e.blocked === 'boolean' && typeof e.message === 'string').slice(-160) : [] };
  if (!tubeReadiness(r, counter, mount, tripod).secured) r.checked = false;
  return r;
}
