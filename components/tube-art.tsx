'use client';

import { useId, type ReactNode } from 'react';
import { tubeRig } from '@/lib/tube-rig';
import { type TripodState } from '@/lib/tripod';
import { type TubeState } from '@/lib/tube';

export function TubeArt() {
  const id = useId().replace(/:/g, '');
  return <g><defs><clipPath id={id}><path d="M19 307 C5 222 104 50 180 29 Q208 20 242 40 L528 193 L557 223 L744 326 L779 315 L795 275 L875 300 L855 348 L872 374 L867 430 L1030 471 L1043 438 L1075 437 L1148 471 L1131 518 L1147 596 L1242 617 L1283 633 L1293 602 L1315 608 L1400 648 L1395 681 L1417 740 L1426 785 L1500 816 Q1534 839 1515 896 L1495 932 L1378 909 L1330 936 L1235 917 L1175 881 L1195 840 L986 772 L992 826 L976 862 L550 678 L589 611 L589 583 L355 479 L88 362 Q24 345 19 307Z" /></clipPath></defs>
    <image href="/optical-tube-stylized-v2.png" x="0" y="0" width="1536" height="1024" clipPath={`url(#${id})`} />
  </g>;
}
export function TubeAssembly({ tripod, state, children, offset = 0 }: { tripod: TripodState; state: TubeState; children?: ReactNode; offset?: number }) {
  if (!state.placed) return null;
  const rig = tubeRig(tripod, state.seated);
  return <g transform={rig.mountTransform}><g data-tube-seated={state.seated} transform={rig.tubeTransform}><g transform={`translate(${-offset*3.6} ${-offset*1.7})`}>{children ?? <TubeArt />}</g></g></g>;
}
