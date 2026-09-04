import { tripodRig } from './tripod-rig.ts';
import { type TripodState } from './tripod.ts';

export const TUBE_RAIL = { x: 780, y: 766 };
export const SADDLE = { x: 607, y: 123 };
export const TUBE_SCALE = .8;
export function tubeRig(tripod: TripodState, seated: boolean) {
  const socket = tripodRig(tripod).socket;
  const x = socket.x - 600 * .53, y = socket.y - 1140 * .53;
  const shift = seated ? { x: 0, y: 0 } : { x: -105, y: -74 };
  const rail = { x: SADDLE.x + shift.x, y: SADDLE.y + shift.y };
  return {
    mountTransform: `translate(${x} ${y}) scale(.53)`,
    tubeTransform: `translate(${rail.x - TUBE_RAIL.x * TUBE_SCALE} ${rail.y - TUBE_RAIL.y * TUBE_SCALE}) scale(${TUBE_SCALE})`,
    saddle: { x: x + SADDLE.x * .53, y: y + SADDLE.y * .53 },
    rail: { x: x + rail.x * .53, y: y + rail.y * .53 },
    knob: { x: 815, y: 241 },
  };
}
