export const FOCUS_STORAGE_KEY = 'telescope-lab-progress-focus-v8';
export const FOCUS_CASES = { a:{start:20.2,plane:23.6}, b:{start:28.6,plane:24.8} };
export type FocusState = {
  version:1; practice:'a'|'b'; opened:boolean; position:number; fine:boolean;
  touching:boolean; settled:boolean; motion:number; seeing:'steady'|'variable';
  lastDirection:1|-1|0; turns:number; reversals:number; hints:number;
  samples:{position:number;seeing:'steady'|'variable';description:string}[];
  observed:boolean; features:{edge:boolean;points:boolean}; checked:boolean;
  feedback:string;events:{action:string;blocked:boolean;message:string}[];
};
export function createFocus(practice:FocusState['practice']='a'):FocusState {
  return {version:1,practice,opened:false,position:FOCUS_CASES[practice].start,fine:false,touching:false,settled:true,motion:0,seeing:'steady',lastDirection:0,turns:0,reversals:0,hints:0,samples:[],observed:false,features:{edge:false,points:false},checked:false,events:[],feedback:'6단계에서 찾은 목성을 저배율로 관측합니다. 초점 손잡이는 확대가 아니라 접안부 위치를 바꾸는 장치입니다.'};
}
// Thin-cone defocus model: circle-of-confusion radius = axial defocus / (2*f-number).
// 70/700 mm, 1° field and 40 arcsec Jupiter are illustrative, not measured equipment.
export function focusOptics(s:FocusState,phase=0) {
  const defocus=Math.abs(s.position-FOCUS_CASES[s.practice].plane);
  const coneRadius=defocus/20;
  const pxPerMm=180/(700*Math.tan(Math.PI/360));
  const seeing=(s.seeing==='steady'?.045:.15)+ (s.seeing==='steady'?.025:.16)*(1+Math.sin(phase))/2;
  return {defocus,blur:Math.hypot(coneRadius*pxPerMm/2,seeing),sharp:defocus<=.16};
}
export const focusReady=(s:FocusState)=>s.opened&&!s.touching&&s.settled&&s.observed&&s.features.edge&&s.features.points&&s.checked&&focusOptics(s).sharp;
export type FocusAction = {type:'turn';direction:1|-1;steps?:number}|{type:'settle';motion:number}|{type:'practice';practice:'a'|'b'}|{type:'seeing';seeing:FocusState['seeing']}|{type:'feature';feature:'edge'|'points'}|{type:'open'|'fine'|'touch'|'release'|'observe'|'check'|'hint'|'lens'|'clamp'};
export function focusReducer(s:FocusState,a:FocusAction,prerequisite=true):FocusState {
  const n={...s,features:{...s.features}};let message='',blocked=false;
  const deny=(m:string)=>{blocked=true;message=m;};
  const invalidate=()=>{n.checked=false;n.observed=false;n.features={edge:false,points:false};};
  if(!prerequisite&&a.type!=='hint')deny('먼저 파인더 정렬과 주망원경에서 목성 중심 확인을 마치세요.');
  else if(!s.opened&&!['open','practice','hint','lens','clamp'].includes(a.type))deny('접안 시야를 먼저 열어 상을 보며 조절하세요.');
  else switch(a.type){
    case 'practice':if(s.opened)deny('관측 중에는 실습 조건을 바꾸지 않습니다. 다시 연습할 때 다른 조건을 선택하세요.');else return createFocus(a.practice);break;
    case 'open':n.opened=true;message='접안렌즈에 눈을 바짝 누르지 않고 원형 시야를 봅니다. 위성의 번진 빛점과 목성 가장자리를 살펴보세요.';break;
    case 'fine':n.fine=!s.fine;message=n.fine?'같은 손잡이를 더 조금씩 돌립니다. 미세 조절 버튼은 별도의 감속 장치를 뜻하지 않습니다.':'한 번에 조금 더 돌립니다. 선명해지는 지점에 접근하면 작은 조절로 바꾸세요.';break;
    case 'turn': {
      if(a.steps!==undefined&&(!Number.isFinite(a.steps)||a.steps<1))return s;
      const step=Math.min(10,Math.floor(a.steps??1));
      const position=Math.round(Math.max(12,Math.min(36,s.position+a.direction*(s.fine?.1:.8)*step))*100)/100;
      if(position===s.position){deny('포커서 이동 끝입니다. 힘을 더 주지 말고 반대 방향으로 돌아오세요.');break;}
      n.position=position;n.motion++;n.settled=false;n.turns+=step;
      if(s.lastDirection&&s.lastDirection!==a.direction)n.reversals++;
      n.lastDirection=a.direction;invalidate();message='접안부가 이동했습니다. 손을 떼고 진동이 가라앉은 뒤 이전 상과 비교하세요. 번짐이 커졌다면 반대 방향을 시험해 볼 수 있습니다.';break;
    }
    case 'touch':n.touching=true;n.settled=false;n.motion++;invalidate();message='손잡이에 손을 대면 상이 흔들릴 수 있습니다. 초점을 판단할 때는 손을 떼세요.';break;
    case 'release':n.touching=false;n.settled=false;n.motion++;message='손을 뗐습니다. 기계적 진동이 가라앉는 것을 잠시 지켜보세요.';break;
    case 'settle':if(a.motion!==s.motion||s.touching||s.settled)return s;n.settled=true;message='손을 댄 뒤의 진동이 가라앉았습니다. 이제 상을 관찰할 수 있습니다. 대기 때문에 작은 흔들림은 남을 수 있습니다.';break;
    case 'seeing':n.seeing=a.seeing;invalidate();message='대기 조건만 바뀌었습니다. 초점 위치는 그대로입니다. 일렁임을 없애려고 손잡이를 계속 돌리면 오히려 초점을 놓칠 수 있습니다.';break;
    case 'observe': {
      if(s.touching||!s.settled){deny('손잡이에서 손을 떼고 진동이 멎은 뒤 관찰하세요. 손의 떨림을 초점 불량으로 판단하지 않습니다.');break;}
      const optics=focusOptics(s);
      const description=optics.defocus>.8?'위성 빛점이 넓게 번지고 원반의 경계가 흐립니다.':!optics.sharp?'번짐이 줄었지만 위성 빛점과 가장자리를 조금 더 비교할 수 있습니다.':s.seeing==='variable'?'위성 빛점이 작게 모이고, 가장자리가 또렷해졌다 일렁입니다. 대기 변화는 초점 손잡이로 없앨 수 없습니다.':'위성 빛점이 작게 모이며 목성 가장자리와 옅은 띠가 구분됩니다.';
      n.samples=[...s.samples,{position:s.position,seeing:s.seeing,description}].slice(-12);n.observed=true;n.checked=false;message=description;break;
    }
    case 'feature':if(!s.observed||!s.settled||s.touching)deny('현재 위치에서 손을 뗀 뒤 상 관찰을 먼저 기록하세요.');else{n.features[a.feature]=!s.features[a.feature];n.checked=false;message='직접 본 특징을 기록했습니다. 흐린 상을 또렷하다고 선택해도 초점 확인을 통과하지 않습니다.';}break;
    case 'check':if(s.touching||!s.settled)deny('진동이 멎기 전에 초점 상태를 확정하지 마세요.');else if(!s.observed)deny('현재 위치의 상을 관찰하고 기록한 뒤 확인하세요.');else if(!focusOptics(s).sharp)deny('위성의 번짐과 목성 경계가 아직 초점 범위에 들지 않았습니다. 조금씩 조절하고, 더 흐려지면 되돌려 비교하세요.');else if(!s.features.edge||!s.features.points)deny('원반 가장자리와 주변 위성 빛점에서 실제로 확인한 특징을 기록하세요.');else{n.checked=true;message='현재 조건에서 초점을 확인했습니다. 목성은 작은 원반, 위성은 빛점으로 보입니다. 대기 흔들림까지 완전히 멈추게 할 필요는 없습니다.';}break;
    case 'lens':deny('렌즈를 만지거나 눈으로 누르지 않습니다. 유리에 손을 대지 말고 적당한 눈 간격에서 원형 시야를 찾으세요.');break;
    case 'clamp':deny('접안렌즈 고정나사는 초점 손잡이가 아닙니다. 고정 상태를 유지하고 포커서 손잡이를 돌리세요.');break;
    case 'hint':n.hints++;message=s.hints===0?'목성 띠만 보지 말고, 주변 위성의 빛점이 얼마나 작게 모이는지 비교해 보세요.':s.hints===1?'한 방향으로 조금 돌린 후 손을 떼고 관찰하세요. 더 번졌다면 되돌리세요. 초점을 지나면 다시 흐려집니다.':'선명해지는 구간에서는 작은 조절을 쓰세요. 불규칙한 일렁임과 손잡이를 돌릴 때마다 달라지는 번짐은 원인이 다릅니다.';break;
  }
  n.feedback=message;n.events=[...s.events,{action:a.type,blocked,message}].slice(-160);return n;
}
export function restoreFocus(raw:unknown,prerequisite:boolean):FocusState {
  if(!prerequisite||!raw||typeof raw!=='object')return createFocus();
  const r=raw as Partial<FocusState>;
  if(r.version!==1||!['a','b'].includes(r.practice??'')||!Number.isFinite(r.position)||r.position!<12||r.position!>36)return createFocus();
  const s=createFocus(r.practice);s.opened=r.opened===true;s.position=s.opened?r.position!:s.position;
  s.fine=r.fine===true;s.seeing=r.seeing==='variable'?'variable':'steady';
  for(const key of ['turns','reversals','hints'] as const)s[key]=Number.isInteger(r[key])&&r[key]!>=0?Math.min(r[key]!,9999):0;
  s.lastDirection=r.lastDirection===1||r.lastDirection===-1?r.lastDirection:0;
  s.samples=Array.isArray(r.samples)?r.samples.filter(p=>p&&Number.isFinite(p.position)&&p.position>=12&&p.position<=36&&['steady','variable'].includes(p.seeing)&&typeof p.description==='string').slice(-12):[];
  const sample=s.samples.at(-1);
  s.observed=s.opened&&r.observed===true&&r.settled===true&&r.touching===false&&sample?.position===s.position&&sample?.seeing===s.seeing;
  s.features={edge:s.observed&&r.features?.edge===true,points:s.observed&&r.features?.points===true};
  s.checked=r.checked===true&&s.observed&&s.features.edge&&s.features.points&&focusOptics(s).sharp;
  // A reload releases the pointer; never restore a held hand or a pending timer.
  s.touching=false;s.settled=true;s.motion=0;
  s.events=Array.isArray(r.events)?r.events.filter(e=>e&&typeof e.action==='string'&&typeof e.blocked==='boolean'&&typeof e.message==='string').slice(-160):[];
  s.feedback=s.checked?'관측 기록을 복원했습니다. 다시 조절하면 초점을 재확인해야 합니다.':'초점 위치를 복원했습니다. 손을 뗀 상태에서 현재 상을 다시 살펴보세요.';return s;
}
