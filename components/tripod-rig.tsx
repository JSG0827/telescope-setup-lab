'use client';

import { useId, type ReactNode, type Ref } from 'react';
import { LEG_IDS, LEG_LABELS, type TripodState, type LegId } from '@/lib/tripod';
import { tripodRig, RIG_LEGS } from '@/lib/tripod-rig';

export function TripodRig({ state, className, mounted = false, loose = false, viewBox, children, svgRef, detail }: {
  state: TripodState; className?: string; mounted?: boolean; loose?: boolean; viewBox?: string;
  children?: ReactNode; svgRef?: Ref<SVGSVGElement>; detail?: LegId;
}) {
  const id = useId().replace(/:/g, '');
  const rig = tripodRig(state);
  const p = detail ? RIG_LEGS[detail] : null;
  const box = viewBox ?? (p ? `${p.x - (detail === 'north' ? 100 : 200)} ${p.cuff - 130} ${detail === 'north' ? 200 : 420} ${p.foot - p.cuff + 200}` : mounted ? '0 -620 1024 2140' : '0 -200 1024 1740');
  const art = <image href="/telescope-stage-01-v4.png" width="1024" height="1536" />;
  return <svg ref={svgRef} className={className} viewBox={box} role="img" aria-label={detail ? `${LEG_LABELS[detail]}의 연장부: ${state.legs[detail].extension} mm, ${state.legs[detail].locked ? '잠김' : '풀림'}` : '다리별 연장량에 연결된 삼각대 조립 모습'}>
    <defs>
      <clipPath id={`${id}-upper`}><rect width="1024" height="311" /></clipPath>
      <mask id={`${id}-no-tray`} maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536"><rect width="1024" height="1536" fill="white" /><path d="M300 766L465 651L534 651L716 768L713 810L302 810Z" fill="black" /></mask>
      {LEG_IDS.map(leg => <g key={leg}>
        <clipPath id={`${id}-${leg}-upper`}><rect x={RIG_LEGS[leg].upperX} y="310" width={RIG_LEGS[leg].upperW} height={RIG_LEGS[leg].cuff - 310 + 1} /></clipPath>
        <clipPath id={`${id}-${leg}-shaft`}><path d={RIG_LEGS[leg].region} /></clipPath>
        <clipPath id={`${id}-${leg}-length`}><rect x="0" y={RIG_LEGS[leg].cuff} width="1024" height={RIG_LEGS[leg].ankle - RIG_LEGS[leg].cuff + 1} /></clipPath>
        <clipPath id={`${id}-${leg}-shoe`}><rect x="0" y={RIG_LEGS[leg].ankle} width="1024" height="400" /></clipPath>
      </g>)}
      <clipPath id={`${id}-tray`}><path d="M300 766L465 651L534 651L716 768L713 810L302 810Z" /></clipPath>
      <clipPath id={`${id}-mount-base`}><rect width="1230" height="1147" /></clipPath>
    </defs>
    {LEG_IDS.map(leg => <g key={leg} data-rig-leg={leg} data-extension={state.legs[leg].extension}>
      <g transform={rig.legs[leg].upperShaft}><g clipPath={`url(#${id}-${leg}-upper)`}><g mask={`url(#${id}-no-tray)`}>{art}</g></g></g>
      <g transform={rig.legs[leg].shaft}><g clipPath={`url(#${id}-${leg}-length)`}><g clipPath={`url(#${id}-${leg}-shaft)`}>{art}</g></g></g>
      <g transform={rig.legs[leg].shoe}><g clipPath={`url(#${id}-${leg}-shoe)`}><g clipPath={`url(#${id}-${leg}-shaft)`}>{art}</g></g></g>
    </g>)}
    <g transform={rig.upper}><g clipPath={`url(#${id}-upper)`}>{art}</g><g clipPath={`url(#${id}-tray)`}>{art}</g></g>
    {mounted && <g data-mounted-art transform={`translate(${rig.socket.x - 600 * .53} ${rig.socket.y - 1140 * .53 - (loose ? 12 : 0)}) scale(.53)`}><image href="/equatorial-mount-stylized-v3.png" width="1230" height="1266" clipPath={`url(#${id}-mount-base)`} /></g>}
    {children}
  </svg>;
}
