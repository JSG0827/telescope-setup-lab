'use client';
import { useId } from 'react';
import { TubeArt } from './tube-art';
import { TripodRig } from './tripod-rig';
import { CounterweightArt } from './counterweight-art';
import { tubeRig } from '@/lib/tube-rig';
import { counterweightRig } from '@/lib/counterweight-rig';
import { type TripodState } from '@/lib/tripod';
import { type Part, type SetupState } from '@/lib/observing-setup';
export const CONNECTIONS = { finder:{x:1070,y:465}, diagonal:{x:1500,y:860}, eyepiece:{x:1730,y:843} };
export const PART_POINTS = {finder:{x:650,y:900},diagonal:{x:230,y:780},eyepiece:{x:510,y:1300}};
export function AccessoryArt({part}:{part:Part}) {
  const id=useId().replace(/:/g,'');
  const path=part==='finder'?'M85 268 Q50 90 219 30 Q270 15 317 60 L669 246 L957 408 L942 321 L965 272 L1014 290 L1021 325 L1084 351 L1080 391 L1050 425 L1043 475 L1217 545 L1217 523 L1233 515 L1284 541 L1278 569 L1295 599 L1400 674 Q1451 718 1425 798 L1400 860 L1232 798 L883 687 L757 741 L711 865 L765 890 L737 985 L484 897 L492 820 L525 780 L585 788 L657 652 L487 533 L261 380 Q104 344 85 268Z':part==='diagonal'?'M798 65 Q801 4 1000 15 Q1209 7 1210 71 L1190 300 L1250 287 L1291 295 L1330 321 L1320 385 L1280 400 L1185 370 L1190 513 L1260 520 L1280 567 L974 950 Q947 977 916 954 L862 901 L733 878 L678 876 L614 903 L296 949 Q181 973 180 765 Q171 627 240 616 L506 570 L553 535 L615 526 L671 532 L776 448Z':'M190 216 C176 56 835 54 839 207 L830 885 Q830 939 758 966 L754 1251 Q755 1368 511 1374 Q267 1372 267 1280 L268 962 Q195 938 193 880Z';
  return <g><defs><clipPath id={id}><path d={path}/></clipPath></defs><image x="0" y="0" width={part==='eyepiece'?1024:1536} height={part==='eyepiece'?1536:1024} href={`/${part==='finder'?'finder-scope':part==='diagonal'?'star-diagonal':'eyepiece-25mm'}-stylized-v1.png`} clipPath={`url(#${id})`}/></g>;
}
export function ObservingTube({state:s}:{state:SetupState}) {
  return <g data-observing-tube><TubeArt/>
    {s.parts.finder!=='rack'&&<g transform={`translate(1070 ${s.parts.finder==='placed'?410:465}) scale(.38) translate(-650 -900)`}><AccessoryArt part="finder"/></g>}
    {s.parts.diagonal!=='rack'&&<g transform={`translate(${s.parts.diagonal==='placed'?1570:1500} 860) rotate(38) scale(.22) translate(-230 -780)`}>
      <AccessoryArt part="diagonal"/>
      {s.parts.eyepiece!=='rack'&&<g transform={`translate(1000 ${s.parts.eyepiece==='placed'?-95:65}) scale(.58) translate(-510 -1300)`}><AccessoryArt part="eyepiece"/></g>}
    </g>}
  </g>;
}
export function ObservingRig({state,tripod,className}:{state:SetupState;tripod:TripodState;className?:string}) {
  const rig=tubeRig(tripod,true),cw=counterweightRig(tripod,state.weight);
  return <TripodRig state={tripod} mounted className={className} viewBox="-220 -1200 1750 2700">
    <g transform={cw.transform}><g transform={`translate(${cw.end.x} ${cw.end.y}) rotate(7.5) scale(1.3)`}><CounterweightArt stopper/></g><g transform={`translate(${cw.weight.x} ${cw.weight.y}) rotate(7.5) scale(.8)`}><CounterweightArt/></g></g>
    <g transform={rig.mountTransform}><g transform={rig.tubeTransform}><g transform={`translate(${-state.offset*3.6} ${-state.offset*1.7})`}><ObservingTube state={state}/></g></g></g>
  </TripodRig>;
}
