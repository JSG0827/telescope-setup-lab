'use client';

import { useId } from 'react';

// Clip existing illustration pixels, not a new geometric drawing of the equipment.
export function CounterweightArt({ stopper = false }: { stopper?: boolean }) {
  const id = useId().replace(/:/g, '');
  return <g>
    <defs><clipPath id={id}><path d={stopper
      ? 'M211 705 Q225 702 242 715 L250 725 Q250 735 237 739 Q217 738 204 725Z'
      : 'M249 482 C278 470 341 488 382 517 Q407 534 403 552 L395 570 L410 567 L425 576 L415 615 L398 622 L387 607 L370 623 Q338 635 276 605 Q238 591 215 562Z'} /></clipPath></defs>
    <g transform={stopper ? 'translate(-226 -721)' : 'translate(-308 -550)'}>
      <image href="/telescope-stage-03-v4.png" width="1024" height="1536" clipPath={`url(#${id})`} />
    </g>
  </g>;
}
