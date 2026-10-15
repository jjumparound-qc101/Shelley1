// Shot check: where figures land on screen for one camera key, without opening the game, so a shot
// can be composed before it is tried. "OK" means wholly in the picture and above the text strip
// (the bottom 30%, as tools/frame_report.mjs counts it).
// Usage: node tools/shot_check.mjs '[px,py,pz]' '[lx,ly,lz]' name:x,feetY,headY,z ...
//   e.g. node tools/shot_check.mjs '[1.3,0.2,1.65]' '[-0.35,0.2,-0.9]' alice:0.95,0,0.3,0.4 king:-0.15,0.13,0.47,-1.83
import * as THREE from 'three';

const [,, pos, look, ...things] = process.argv;
const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.02, 80);          // the game's camera, at a 16:9 window
cam.position.set(...JSON.parse(pos)); cam.lookAt(new THREE.Vector3(...JSON.parse(look)));
cam.updateMatrixWorld(); cam.updateProjectionMatrix();
for (const t of things) {
  const [name, v] = t.split(':'); const [x, y0, y1, z] = v.split(',').map(Number);
  const a = new THREE.Vector3(x, y0, z).project(cam), b = new THREE.Vector3(x, y1, z).project(cam);
  const ok = Math.abs(a.x) <= 1 && a.y >= -0.4 && b.y <= 1 && a.z < 1;
  console.log(`${name.padEnd(8)} x ${a.x.toFixed(2)}  feet ${a.y.toFixed(2)}  head ${b.y.toFixed(2)}  ${ok ? 'OK' : 'OUT'}`);
}
