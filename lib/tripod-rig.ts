import { LEG_IDS, SCENARIOS, tripodGeometry, type TripodState } from './tripod.ts';

// Pixel landmarks measured on telescope-stage-01-v4.png (1024 × 1536).
// This is a 2D skinned illustration, not a rigid-body or engineering model.
export const RIG_LEGS = {
  north: { x: 496, footX: 490, cuff: 650, ankle: 1018, foot: 1094, region: 'M420 650H560V1120H420Z', upperX: 460, upperW: 88 },
  southwest: { x: 230, footX: 70, cuff: 890, ankle: 1300, foot: 1400, region: 'M0 890H300V1450H0Z', upperX: 0, upperW: 460 },
  southeast: { x: 798, footX: 955, cuff: 890, ankle: 1320, foot: 1425, region: 'M720 890H1024V1460H720Z', upperX: 548, upperW: 476 },
} as const;
export const RIG_GAIN = 2;
export function tripodRig(state: TripodState) {
  const heights = tripodGeometry(state).heights;
  const rise = heights.map(h => -(h - 24 * Math.cos(Math.PI / 9)) * RIG_GAIN);
  const b = (rise[2] - rise[1]) / (798 - 230);
  const f = (rise[0] + rise[1] + rise[2]) / 3 - b * 510;
  const upperY = (x: number, y: number) => b * x + y + f;
  const legs = Object.fromEntries(LEG_IDS.map((id, i) => {
    const p = RIG_LEGS[id];
    const top = p.cuff + rise[i];
    const groundShift = -SCENARIOS[state.scenario].ground[i] * RIG_GAIN;
    const bottom = p.ankle + groundShift + b * (p.x - p.footX);
    const scale = (bottom - top) / (p.ankle - p.cuff);
    const upperScale = (top - upperY(p.x, 310)) / (p.cuff - 310);
    return [id, { top, bottom, foot: p.foot + groundShift, scale,
      upperShaft: `matrix(1 ${b} 0 ${upperScale} 0 ${upperY(p.x, 310) - upperScale * 310 - b * p.x})`,
      shaft: `matrix(1 ${b} 0 ${scale} 0 ${top - scale * p.cuff - b * p.x})`,
      shoe: `matrix(1 ${b} 0 1 0 ${groundShift - b * p.footX})` }];
  })) as Record<typeof LEG_IDS[number], { top: number; bottom: number; foot: number; scale: number; upperShaft: string; shaft: string; shoe: string }>;
  return { upper: `matrix(1 ${b} 0 1 0 ${f})`, legs, socket: { x: 510, y: upperY(510, 95) }, bolt: { x: 500, y: upperY(500, 270) } };
}
