import { tripodRig } from './tripod-rig.ts';
import { type TripodState } from './tripod.ts';

// Landmarks in the existing mount PNG. All parts and drop tests share this transform.
export function counterweightRig(tripod: TripodState, position: number) {
  const rig = tripodRig(tripod);
  const x = rig.socket.x - 600 * .53, y = rig.socket.y - 1140 * .53;
  const point = (a: number, b: number) => ({ x: x + a * .53, y: y + b * .53 });
  return { transform: `translate(${x} ${y}) scale(.53)`,
    entry: point(103, 1125),
    weight: { x: 335 + (103 - 335) * position / 100, y: 770 + (1125 - 770) * position / 100 },
    end: { x: 103, y: 1125 } };
}
