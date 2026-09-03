import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Check CSS actually referenced by the production page, not an unused chunk.
const html = await readFile('.next/server/app/index.html', 'utf8');
const paths = [...new Set([...html.matchAll(/href="(\/_next\/[^"?]+\.css)(?:\?[^\"]*)?"/g)].map((match) => match[1]))];
assert(paths.length > 0, 'Production page must reference a stylesheet');
const css = (await Promise.all(paths.map((path) => readFile(join('.next', path.slice('/_next/'.length)), 'utf8')))).join('\n');
for (const selector of [
  '.rig-anchor-layer',
  '.rig-anchor-layer .mount-drop-target',
  '.rig-anchor-layer .tube-drop-target',
  '.rig-anchor-layer .observation-drop-target',
]) {
  assert(css.includes(selector), `Missing assembly CSS in production page: ${selector}`);
}
console.log('Assembly production CSS verified: image anchors and drop targets are included.');
