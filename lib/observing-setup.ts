export const SETUP_STORAGE_KEY = 'telescope-lab-progress-observing-v6';
export const PARTS = ['finder', 'diagonal', 'eyepiece'] as const;
export type Part = typeof PARTS[number];
export const PART_LABELS = { finder: '파인더', diagonal: '천정미러', eyepiece: '접안렌즈' };
export type Axis = 'ra' | 'dec';
export type PartStatus = 'rack' | 'placed' | 'seated' | 'fixed' | 'checked';
export type SetupState = {
  version: 1; selected: Part; parts: Record<Part, PartStatus>; inspected: Record<Part, boolean>;
  open: Record<Part, boolean>; holding: boolean; view: 'assembly' | 'detail' | 'ra' | 'dec';
  supported: boolean; free: Axis | null; weightOpen: boolean; tubeOpen: boolean;
  weight: number; offset: number; tested: Record<Axis, boolean>; checked: boolean;
  observed: { axis: Axis; moment: number } | null; feedback: string; hints: number;
  events: { action: string; blocked: boolean; message: string }[];
};
export function createSetup(weight = 35): SetupState {
  return { version: 1, selected: 'finder', parts: { finder:'rack', diagonal:'rack', eyepiece:'rack' },
    inspected: { finder:false, diagonal:false, eyepiece:false }, open: { finder:false, diagonal:false, eyepiece:false },
    holding:false, view:'assembly', supported:false, free:null, weightOpen:false, tubeOpen:false,
    weight: Math.max(15, Math.min(75, Number.isFinite(weight) ? weight : 35)), offset:0,
    tested:{ra:false,dec:false}, checked:false, observed:null, hints:0, events:[],
    feedback:'균형을 맞추기 전에 실제 관측에 쓸 파인더·천정미러·접안렌즈를 장착하고 고정을 확인하세요.' };
}
export const accessoriesReady = (s: SetupState) => PARTS.every(p => s.parts[p] === 'checked');
// Educational masses (kg), signed longitudinal positions (mm), not measured product specifications.
export const PAYLOAD = { tube: { mass:3.2, x:15 }, finder:{mass:.35,x:-60}, diagonal:{mass:.20,x:220}, eyepiece:{mass:.15,x:250} };
export function moments(s: SetupState) {
  let mass = PAYLOAD.tube.mass, longitudinal = PAYLOAD.tube.mass * PAYLOAD.tube.x;
  for (const p of PARTS) if (s.parts[p] !== 'rack') { mass += PAYLOAD[p].mass; longitudinal += PAYLOAD[p].mass * PAYLOAD[p].x; }
  return { ra: mass * .25 - 3 * (.10 + .006 * s.weight), dec: (longitudinal - mass * s.offset) / 1000, mass };
}
export const withinBalance = (s: SetupState, axis: Axis) => Math.abs(moments(s)[axis]) <= (axis === 'ra' ? .035 : .008);
export const setupReady = (s: SetupState) => accessoriesReady(s) && s.tested.ra && s.tested.dec && withinBalance(s,'ra') && withinBalance(s,'dec') && !s.free && !s.weightOpen && !s.tubeOpen && s.checked;
export type SetupAction = {type:'select'; part:Part} | {type:'view'; view:SetupState['view']} | {type:'move'; axis:Axis; value:number}
  | {type:'clutch'; axis:Axis} | {type:'inspect'|'hold'|'open'|'place'|'miss'|'seat'|'fix'|'part-test'|'remove'|'support'|'weight-clamp'|'tube-clamp'|'test'|'check'|'hint'|'lens'};
export function setupReducer(s: SetupState, a: SetupAction, prerequisite = true, later = false): SetupState {
  const n = { ...s, parts:{...s.parts}, inspected:{...s.inspected}, open:{...s.open}, tested:{...s.tested} };
  const p = s.selected, name = PART_LABELS[p]; let blocked = false, message = '';
  const deny = (m:string) => { blocked = true; message = m; };
  const invalidate = () => { n.checked=false; n.tested={ra:false,dec:false}; n.observed=null; };
  if (later && !['view','select','hint'].includes(a.type)) deny('정렬·관측을 시작한 구성입니다. 여기서는 관찰만 할 수 있습니다. 구성을 바꾸려면 처음부터 다시 연습하세요.');
  else if (!prerequisite && !['view','hint'].includes(a.type)) deny('먼저 경통의 안착·고정·유격 확인을 마치세요.');
  else switch(a.type) {
    case 'select': if(s.free||s.weightOpen||s.tubeOpen) deny('현재 축과 위치 고정을 잠근 뒤 부속품 보기로 돌아가세요.'); else if(s.holding) deny('현재 부품을 고정·확인하거나 준비물대로 돌려놓은 뒤 다른 부품을 선택하세요.'); else {n.selected=a.part; n.view='detail';message=`${PART_LABELS[a.part]}의 결합부를 관찰합니다.`;} break;
    case 'view':
      if(a.view==='ra'||a.view==='dec') {
        if(!accessoriesReady(s)) {deny('세 부속품을 모두 고정·확인해야 관측 구성의 균형을 시험할 수 있습니다.');break;}
        if(s.free||s.weightOpen||s.tubeOpen||s.holding) {deny('자세를 바꾸기 전에 현재 축과 부품 고정을 잠그세요.');break;}
        if(!s.supported && !later) {deny('장비를 받친 뒤 시험 자세로 옮기세요.');break;}
        if(a.view==='dec'&&!s.tested.ra) {deny('먼저 적경축을 시험하고 균형을 확인한 뒤 잠그세요.');break;}
      } else if(s.free||s.weightOpen||s.tubeOpen) {deny('조립 자세로 돌아가기 전에 두 축과 위치 고정을 잠그세요.');break;}
      n.view=a.view; n.observed=null; message=a.view==='ra'?'적경축 단면 보기: 무게추 봉이 수평인 시험 자세입니다. 적위축은 잠근 채 적경축만 시험합니다.':a.view==='dec'?'적위축 단면 보기: 경통이 수평인 시험 자세입니다. 적경축은 잠근 채 경통 앞뒤의 회전 경향을 봅니다.':'전체 장비와 부속품 결합 상태를 확인합니다.';break;
    case 'inspect': if(s.free||s.weightOpen||s.tubeOpen) {deny('현재 축과 위치 고정을 잠근 뒤 결합부를 관찰하세요.');break;} n.inspected[p]=true;n.view='detail';message=p==='finder'?'파인더 발은 경통 위 슈에 끼웁니다. 슈 고정나사와 파인더 방향 조절나사는 다른 장치입니다.':p==='diagonal'?'천정미러의 은색 배럴을 경통 뒤 포커서에 넣습니다. 위쪽 소켓은 접안렌즈 자리입니다.':'접안렌즈 배럴은 천정미러 위 소켓에 넣습니다. 유리 대신 금속 몸체를 잡으세요.';break;
    case 'hold':
      if(s.holding&&s.parts[p]!=='rack'&&s.parts[p]!=='checked') deny('고정과 유격 확인 전에는 부품을 받친 손을 떼지 마세요.');
      else {n.holding=!s.holding;message=n.holding?`${name} 몸체를 받치고 있습니다.`:'안전한 상태에서 손을 뗐습니다.';}break;
    case 'open':
      if(s.free||s.view==='ra'||s.view==='dec') {deny('축을 잠그고 전체/결합부 보기에서 부속품을 조작하세요.');break;}
      if(!s.inspected[p]) {deny('고정나사와 결합 방향을 먼저 관찰하세요.');break;}
      if(s.parts[p]!=='rack'&&!s.holding) {deny('부품을 받친 뒤 고정나사를 조금 풀어 주세요.');break;}
      if(p==='diagonal'&&s.parts.eyepiece!=='rack') {deny('접안렌즈가 달린 천정미러를 바로 풀지 마세요. 먼저 접안렌즈를 받쳐 분리하세요.');break;}
      n.open[p]=true;if(['fixed','checked'].includes(s.parts[p])) n.parts[p]='seated';invalidate();message=`${name} 결합부의 고정나사를 조금 풀었습니다. 나사를 완전히 빼지 않습니다.`;break;
    case 'place':
      if(s.view==='ra'||s.view==='dec'||s.free) {deny('두 축을 잠그고 조립 자세에서 장착하세요.');break;}
      if(s.parts[p]!=='rack') {deny('이미 결합부에 있습니다. 안착·고정·확인을 이어가세요.');break;}
      if(!s.inspected[p]||!s.holding||!s.open[p]) {deny('결합 방향 관찰, 몸체 받침, 고정나사 여유를 먼저 확인하세요.');break;}
      if(p==='eyepiece'&&s.parts.diagonal!=='checked') {deny('천정미러가 먼저 고정되어야 접안렌즈를 지지할 수 있습니다.');break;}
      n.parts[p]='placed';invalidate();message=`${name} 부품을 입구에 가져왔습니다. 받친 채 끝까지 안착시키세요.`;break;
    case 'miss': deny(`${name}의 결합 기준점을 표시된 소켓으로 옮겨 주세요.`);break;
    case 'seat': if(s.parts[p]!=='placed'||!s.holding||!s.open[p]) deny('입구에 가져온 부품을 받치고 고정나사가 풀린 상태에서 안착시키세요.');else {n.parts[p]='seated';invalidate();message='끝까지 안착했습니다. 고정나사를 밀착할 만큼 조이세요.';}break;
    case 'fix': if(s.parts[p]!=='seated'||!s.holding) deny('부품이 끝까지 안착되고 받쳐져 있어야 조일 수 있습니다.');else {n.parts[p]='fixed';n.open[p]=false;invalidate();message='고정했습니다. 받친 채 들리거나 돌아가지 않는지 확인하세요.';}break;
    case 'part-test': if(s.parts[p]!=='fixed'||!s.holding||s.open[p]) deny('고정이 덜 된 부품은 들리거나 돌아갈 수 있습니다. 안착과 나사를 확인하고 받친 채 시험하세요.');else {n.parts[p]='checked';n.holding=false;message=`${name} 고정을 확인했습니다. ${PARTS.every(k=>n.parts[k]==='checked')?'관측 구성이 준비됐습니다. 장비를 받치고 적경축 시험 자세로 이동하세요.':'다음 부품을 선택하세요.'}`;}break;
    case 'remove': if(s.free||!s.holding||!s.open[p]||(p==='diagonal'&&s.parts.eyepiece!=='rack')) deny('축 잠금, 부품 받침, 고정나사 해제를 확인하세요. 천정미러보다 접안렌즈를 먼저 분리합니다.');else {n.parts[p]='rack';n.holding=false;invalidate();message='준비물대로 내려놓았습니다. 구성 변경으로 두 축의 균형 확인을 다시 해야 합니다.';}break;
    case 'support': if(s.supported&&(s.free||s.weightOpen||s.tubeOpen)) deny('축이나 위치 고정이 풀려 있습니다. 손을 완전히 떼지 말고 잠금을 마치세요.');else {n.supported=!s.supported;message=n.supported?'장비를 받쳤습니다. 시험할 때도 손을 가까이 두고 서서히 지지력을 줄입니다.':'잠금을 확인하고 장비에서 손을 뗐습니다.';}break;
    case 'clutch':
      if(s.free===a.axis) {if(s.weightOpen||s.tubeOpen) deny('먼저 무게추/경통 위치 고정나사를 잠그세요.');else {n.free=null;message='현재 축을 잠갔습니다. 잠갔다는 사실만으로 균형이 확인되지는 않습니다.';}break;}
      if(!accessoriesReady(s)||!s.supported||s.view!==a.axis||s.free||s.weightOpen||s.tubeOpen) {deny('관측 구성을 확인하고 장비를 받친 뒤 해당 시험 자세에서 한 축만 푸세요. 다른 축은 잠겨 있어야 합니다.');break;}
      n.free=a.axis;n.tested[a.axis]=false;n.checked=false;n.observed=null;message='축 잠금을 풀었습니다. 위치 고정나사는 잠근 채 먼저 회전 경향을 관찰하세요.';break;
    case 'weight-clamp': case 'tube-clamp': {
      const axis=a.type==='weight-clamp'?'ra':'dec', field=axis==='ra'?'weightOpen':'tubeOpen';
      if(!s.supported||s.free!==axis||s.view!==axis) {deny('해당 축 시험 자세에서 장비와 이동할 부품을 받쳐야 위치 고정을 조절할 수 있습니다.');break;}
      n[field]=!s[field];n.tested[axis]=false;n.checked=false;n.observed=null;message=n[field]?'위치 고정을 조금 풀었습니다. 받침을 유지하며 안전 범위 안에서 이동하세요.':'위치 고정을 잠갔습니다. 다시 회전 경향을 시험하세요.';break;
    }
    case 'move': {
      if(!Number.isFinite(a.value)) return s;
      if(s.free!==a.axis||!s.supported||!(a.axis==='ra'?s.weightOpen:s.tubeOpen)) {deny('클러치와 위치 고정나사는 다릅니다. 장비를 받치고 해당 위치 고정을 조금 푼 뒤 이동하세요.');break;}
      if(a.axis==='ra') n.weight=Math.max(15,Math.min(75,a.value));else n.offset=Math.max(-60,Math.min(60,a.value));
      n.tested[a.axis]=false;n.checked=false;n.observed=null;message='위치를 바꿨습니다. 이동한 부품의 고정나사를 잠그고 같은 자세에서 다시 시험하세요.';break;
    }
    case 'test': {
      if(!s.free||!s.supported||s.weightOpen||s.tubeOpen||!accessoriesReady(s)) {deny('한 축만 풀고 장비를 받치세요. 무게추·경통·부속품 고정나사는 잠근 상태에서 시험합니다.');break;}
      const axis=s.free, moment=moments(s)[axis]; n.observed={axis,moment};n.tested[axis]=withinBalance(s,axis);
      message=n.tested[axis]?'지지력을 서서히 줄여도 뚜렷한 회전 경향이 없습니다. 손을 가까이 둔 채 현재 축을 잠그세요.':axis==='ra'?(moment>0?'경통 쪽이 내려가려 합니다. 무게추를 축에서 더 멀리 옮기면 반대쪽 회전 효과가 커집니다.':'무게추 쪽이 내려가려 합니다. 무게추를 축 쪽으로 옮겨 회전 효과를 줄여 보세요.'):(moment>0?'접안부 쪽이 내려가려 합니다. 경통을 대물렌즈 방향으로 조금 옮겨 보세요.':'대물렌즈 쪽이 내려가려 합니다. 경통을 접안부 방향으로 조금 옮겨 보세요.');break;
    }
    case 'check': if(!accessoriesReady(s)||!s.tested.ra||!s.tested.dec||!withinBalance(s,'ra')||!withinBalance(s,'dec')||s.free||s.weightOpen||s.tubeOpen) deny('부속품 고정, 두 축의 시험 결과, 위치 고정과 두 축 재잠금을 모두 확인하세요.');else {n.checked=true;n.supported=false;message='관측 부속품을 포함한 두 축 균형을 확인했습니다. 이제 파인더는 다시 장착하지 않고 정렬합니다.';}break;
    case 'hint': n.hints++;message=n.hints===1?'어떤 부품이 무엇에 결합되나요? 균형에서는 어느 쪽이 내려가는지 먼저 관찰하세요.':n.hints===2?'회전 효과는 무게뿐 아니라 축에서 떨어진 거리에도 달려 있습니다.':'부속품 관찰·받침·나사 풀기·드래그·안착·고정·시험 → 장비 받침 → 적경 자세·클러치·시험·조절·재고정·재시험·잠금 → 적위 반복 → 최종 확인.';break;
    case 'lens': deny('렌즈면은 손잡이가 아닙니다. 부품의 몸체를 잡고 유리 표면을 만지지 마세요.');break;
  }
  return { ...(blocked?s:n), feedback:message, events:[...s.events,{action:a.type,blocked,message}].slice(-160) };
}
export function restoreSetup(raw:unknown, weight:number, prerequisite:boolean): SetupState {
  const fallback=createSetup(weight);if(!prerequisite||!raw||typeof raw!=='object') return fallback;
  const s=raw as SetupState;
  if(s.version!==1||!PARTS.includes(s.selected)||!['assembly','detail','ra','dec'].includes(s.view)||![null,'ra','dec'].includes(s.free)||!s.parts||!s.open||!s.inspected||!s.tested) return fallback;
  if(!Number.isFinite(s.weight)||s.weight<15||s.weight>75||!Number.isFinite(s.offset)||Math.abs(s.offset)>60) return fallback;
  for(const key of ['holding','supported','weightOpen','tubeOpen','checked'] as const) if(typeof s[key]!=='boolean') return fallback;
  for(const p of PARTS) {
    if(!['rack','placed','seated','fixed','checked'].includes(s.parts[p])||typeof s.open[p]!=='boolean'||typeof s.inspected[p]!=='boolean') return fallback;
    if(s.parts[p]!=='rack'&&!s.inspected[p]) return fallback;
    if(['fixed','checked'].includes(s.parts[p])&&s.open[p]) return fallback;
    if(['placed','seated'].includes(s.parts[p])&&(!s.open[p]||!s.holding||s.selected!==p)) return fallback;
    if(s.parts[p]==='fixed'&&(!s.holding||s.selected!==p)) return fallback;
  }
  if(s.parts.eyepiece!=='rack'&&s.parts.diagonal!=='checked') return fallback;
  if((s.free||s.weightOpen||s.tubeOpen)&&(!s.supported||!accessoriesReady(s))) return fallback;
  if(s.free&&s.view!==s.free||s.weightOpen&&s.free!=='ra'||s.tubeOpen&&s.free!=='dec') return fallback;
  if((s.view==='ra'||s.view==='dec')&&!accessoriesReady(s)) return fallback;
  for(const axis of ['ra','dec'] as const) if(typeof s.tested[axis]!=='boolean'||s.tested[axis]&&!withinBalance(s,axis)) return fallback;
  const n={...fallback,...s,feedback:typeof s.feedback==='string'?s.feedback:fallback.feedback,observed:null,hints:Number.isInteger(s.hints)&&s.hints>=0?s.hints:0,events:Array.isArray(s.events)?s.events.filter(e=>e&&typeof e.action==='string'&&typeof e.blocked==='boolean'&&typeof e.message==='string').slice(-160):[]};
  if(!setupReady(n)) n.checked=false; return n;
}
