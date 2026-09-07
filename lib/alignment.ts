export const ALIGNMENT_STORAGE_KEY = 'telescope-lab-progress-alignment-v7';
export type Point = { x:number; y:number };
export const REFERENCE:Point = {x:0,y:0};
export const JUPITER:Point = {x:2.4,y:1.2};
export const SKY = [
  {id:'reference',name:'기준별',...REFERENCE,r:3.5},
  {id:'jupiter',name:'목성',...JUPITER,r:5},
  {id:'a',name:'동반별 A',x:.24,y:.18,r:1.8},
  {id:'b',name:'동반별 B',x:-.32,y:.28,r:1.6},
  {id:'c',name:'',x:1.2,y:-.5,r:1.5},
  {id:'d',name:'',x:2.1,y:1.5,r:1.8},
  {id:'e',name:'',x:3,y:.6,r:1.4},
  {id:'f',name:'',x:-1.2,y:-.7,r:1.5},
];
export type AlignmentState = {
  version:1; phase:'reference'|'align'|'target'; pointing:Point; offset:Point;
  inspected:boolean; referenceChecked:boolean; aligned:boolean; checked:boolean;
  fine:boolean; hints:number; feedback:string;
  events:{action:string;blocked:boolean;message:string}[];
};
export function createAlignment():AlignmentState {
  return {version:1,phase:'reference',pointing:{x:.3,y:-.2},offset:{x:.6,y:-.4},
    inspected:false,referenceChecked:false,aligned:false,checked:false,fine:false,hints:0,events:[],
    feedback:'저배율 접안렌즈와 파인더의 역할을 확인한 뒤, 밝은 기준별을 주망원경 중심에 넣으세요.'};
}
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const centered=(s:AlignmentState,p:Point)=>distance(s.pointing,p)<=.071;
export const calibrated=(s:AlignmentState)=>Math.hypot(s.offset.x,s.offset.y)<=.071;
export const alignmentReady=(s:AlignmentState)=>s.inspected&&s.aligned&&calibrated(s)&&s.phase==='target'&&s.checked&&centered(s,JUPITER);
// Local tangent-plane teaching model in degrees. Fixed optical orientation:
// diagonal main scope = horizontally mirrored, straight-through finder = inverted.
export function project(s:AlignmentState,p:Point,view:'main'|'finder') {
  const radius=view==='main'?.5:2.5;
  const dx=p.x-s.pointing.x-(view==='finder'?s.offset.x:0);
  const dy=p.y-s.pointing.y-(view==='finder'?s.offset.y:0);
  return {x:-dx/radius,y:(view==='main'?-dy:dy)/radius,visible:Math.hypot(dx,dy)<radius};
}
export type AlignmentAction = {type:'move'|'adjust';axis:'x'|'y';direction:1|-1}
  |{type:'inspect'|'fine'|'reference-check'|'align-check'|'target'|'target-check'|'realign'|'hint'|'release'};
export function alignmentReducer(s:AlignmentState,a:AlignmentAction,prerequisite=true,readOnly=false):AlignmentState {
  const n={...s,pointing:{...s.pointing},offset:{...s.offset}};
  let message='',blocked=false;
  const deny=(m:string)=>{message=m;blocked=true;};
  if(readOnly&&a.type!=='hint') deny('초점 관측을 시작한 방향입니다. 여기서는 시야를 비교할 수 있지만 장비 방향을 바꿀 수 없습니다.');
  else if(!prerequisite&&a.type!=='hint') deny('부속품 고정과 두 축 균형 확인을 먼저 마치세요.');
  else if(!s.inspected&&!['inspect','hint'].includes(a.type)) deny('파인더의 방향 조절과 가대의 미동이 무엇을 움직이는지 먼저 살펴보세요.');
  else switch(a.type) {
    case 'inspect':n.inspected=true;message='파인더 슈 고정은 유지합니다. 가대 미동은 두 시야를 함께, 파인더 방향 조절은 파인더 시야만 움직입니다. 저배율 접안렌즈로 기준별을 식별할 수 있는 초점에서 시작합니다.';break;
    case 'fine':n.fine=!s.fine;message=n.fine?'작은 미동으로 바꿨습니다. 별의 움직임을 보며 조금씩 조절하세요.':'넓은 이동으로 바꿨습니다. 실제 장비에서는 미동의 이동 한계를 확인하세요.';break;
    case 'move': {
      const v=Math.max(-3,Math.min(4,s.pointing[a.axis]+a.direction*(s.fine?.05:.2)));
      n.pointing[a.axis]=Math.round(v*100)/100;n.checked=false;
      if(s.phase!=='target'){n.referenceChecked=false;n.phase='reference';}
      message=s.phase==='align'?'경통을 움직여 주망원경 기준점이 바뀌었습니다. 기준별을 다시 중심에 넣고 확인하세요. 파인더 방향 자체는 변하지 않았습니다.':'경통의 관측 방향이 바뀌어 두 시야 속 별이 함께 움직입니다. 영상 방향이 달라 화면상 이동 방향은 다를 수 있습니다.';break;
    }
    case 'reference-check':
      if(!centered(s,REFERENCE))deny('밝은 기준별이 주망원경 중심에서 벗어나 있습니다. 주변 두 동반별도 비교해 같은 별인지 확인하고 미동으로 중심에 넣으세요.');
      else {n.referenceChecked=true;n.phase='align';n.checked=false;message='기준별을 주망원경 중심에서 확인했습니다. 이제 경통을 그대로 두고 파인더 방향 조절만 사용하세요.';}break;
    case 'adjust':
      if(s.phase!=='align'||!s.referenceChecked||!centered(s,REFERENCE))deny('파인더 나사로 목표 천체를 따라가면 정렬이 틀어집니다. 먼저 주망원경 중심의 기준별을 확인한 정렬 상태에서 조절하세요.');
      else {n.offset[a.axis]=Math.round(Math.max(-2,Math.min(2,s.offset[a.axis]+a.direction*.1))*100)/100;n.aligned=false;n.checked=false;message='파인더의 방향만 바뀌었습니다. 주망원경 기준별은 그대로입니다. 고정된 십자선 중심에 같은 별이 오도록 조절하세요.';}break;
    case 'align-check':
      if(s.phase!=='align'||!s.referenceChecked||!centered(s,REFERENCE))deny('주망원경의 기준별 중심 확인이 먼저입니다.');
      else if(!calibrated(s)||Math.hypot(project(s,REFERENCE,'finder').x,project(s,REFERENCE,'finder').y)*2.5>.09)deny('두 광축이 아직 다릅니다. 파인더의 다른 별을 맞춘 것은 아닌지 주변 별 배치를 비교하고 방향을 조금 더 조절하세요.');
      else {n.aligned=true;message='같은 기준별이 두 시야 중심에 있습니다. 파인더 정렬을 확인했습니다. 이제 파인더 방향 조절은 멈추고 목성을 찾아보세요.';}break;
    case 'target':if(!s.aligned||!calibrated(s))deny('같은 기준별로 파인더 정렬을 확인한 뒤 목표를 바꾸세요.');else{n.phase='target';n.checked=false;message='관측 목표만 목성으로 바뀌었습니다. 경통은 자동으로 움직이지 않습니다. 탐색도의 별 배치를 보고 미동으로 목성을 찾아보세요.';}break;
    case 'target-check':if(s.phase!=='target'||!s.aligned||!calibrated(s))deny('파인더 정렬을 확인한 후 목성 탐색을 시작하세요.');else if(!centered(s,JUPITER))deny(project(s,JUPITER,'finder').visible?'목성이 파인더에 보이더라도 좁은 주망원경 시야의 중심에 있다는 뜻은 아닙니다. 주망원경을 보며 작은 미동으로 마무리하세요.':'목성이 아직 파인더 시야 밖입니다. 탐색도의 방향과 주변 별 배치를 살펴보세요.');else{n.checked=true;message='목성을 주망원경 중심에서 확인했습니다. 장착과 균형을 유지한 채 다음 단계에서 초점을 세밀하게 조절합니다.';}break;
    case 'realign':n.phase='reference';n.referenceChecked=false;n.aligned=false;n.checked=false;message='기준별 재확인으로 돌아갑니다. 경통은 이동하지 않았습니다. 탐색도를 보며 기준별을 다시 찾아오세요.';break;
    case 'release':deny('이 실습은 클러치를 잠근 상태에서 미동 손잡이를 사용합니다. 갑자기 클러치를 풀면 경통이 돌아갈 수 있습니다. 큰 이동과 경통 받침은 별도 실습 범위입니다.');break;
    case 'hint':n.hints++;message=s.phase==='reference'?'주망원경에는 밝은 기준별과 작은 두 동반별이 있습니다. 미동 한 번 후 별이 움직이는 방향을 관찰하고 중심에 가까워지는 쪽을 선택하세요.':s.phase==='align'?'십자선은 움직이지 않습니다. 파인더 방향 조절을 한 번 해 보고 기준별이 중심에 가까워지는지 관찰하세요. 경통 미동은 건드리지 않습니다.':'목성은 탐색도에서 기준별보다 오른쪽 위입니다. 적경 +, 적위 +로 접근한 뒤 좁은 주망원경 시야에서 작은 미동으로 마무리하세요.';break;
  }
  n.feedback=message;n.events=[...s.events,{action:a.type,blocked,message}].slice(-160);return n;
}
export function restoreAlignment(raw:unknown,prerequisite:boolean):AlignmentState {
  const s=createAlignment();if(!prerequisite||!raw||typeof raw!=='object')return s;
  const r=raw as Partial<AlignmentState>;
  if(r.version!==1)return s;
  const point=(p:Point|undefined,min:number,max:number)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=min&&p.x<=max&&p.y>=min&&p.y<=max;
  if(!point(r.pointing,-3,4)||!point(r.offset,-2,2))return s;
  s.pointing={...r.pointing!};s.offset={...r.offset!};s.inspected=r.inspected===true;s.fine=r.fine===true;
  s.aligned=s.inspected&&r.aligned===true&&calibrated(s);
  s.referenceChecked=s.inspected&&r.referenceChecked===true&&centered(s,REFERENCE);
  s.phase=r.phase==='target'&&s.aligned?'target':r.phase==='align'&&s.referenceChecked?'align':'reference';
  s.checked=s.phase==='target'&&r.checked===true&&centered(s,JUPITER);
  s.hints=Number.isInteger(r.hints)&&r.hints!>=0?Math.min(r.hints!,999):0;
  s.events=Array.isArray(r.events)?r.events.filter(e=>e&&typeof e.action==='string'&&typeof e.blocked==='boolean'&&typeof e.message==='string').slice(-160):[];
  s.feedback='정렬 실습을 이어갑니다. 현재 두 시야와 진행 상태를 확인하세요.';return s;
}
