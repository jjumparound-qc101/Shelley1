// Side scenery for outdoor sets, so the wider Explore look arc (150°, owner 2026-10-11) never
// finds the edge of the world: sky and a far treeline on both sides, facing in, like the wings
// of a toy theater carried all the way back. The fog softens them into the distance.
import * as THREE from 'three';
import { paperFlat } from '../stage.js';

const tiled = (t, rx) => { t = t.clone(); t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.set(rx, 1); t.needsUpdate = true; return t; };

export function panorama(group, ai, { x = 16, z0 = -14, z1 = 14, trees = true } = {}) {
  const depth = z1 - z0, zc = (z0 + z1) / 2;
  for (const s of [-1, 1]) {
    const sky = paperFlat(tiled(ai.sky.tex, depth / (14 * ai.sky.aspect)), depth, 14, { edge: false, opaque: true });
    sky.rotation.y = -s * Math.PI / 2; sky.position.set(s * x, -0.5, zc); group.add(sky);
    if (!trees) continue;
    const far = paperFlat(tiled(ai.treeline.tex, depth / (3.2 * ai.treeline.aspect)), depth, 3.2, { edge: false });
    far.rotation.y = -s * Math.PI / 2; far.position.set(s * (x - 1.5), 0, zc); group.add(far);
  }
}
