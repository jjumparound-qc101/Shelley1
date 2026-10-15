// Paper flats: the building block of every set, like a Victorian toy theater.
// Units are metres. The audience looks down -Z; the proscenium is at z = 2.2 (theatre.js).
import * as THREE from 'three';

const EDGE = new THREE.Color('#8b8272'); // the cut paper edge seen behind each flat

// A flat paper cutout with a visible paper thickness behind it.
// anchor 'bottom' stands it on the floor; 'center' centres it on y.
export function paperFlat(tex, width, height, { anchor = 'bottom', edge = true, opaque = false } = {}) {
  const geo = new THREE.PlaneGeometry(width, height);
  if (anchor === 'bottom') geo.translate(0, height / 2, 0);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: !opaque, alphaTest: opaque ? 0 : 0.5, side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  const front = new THREE.Mesh(geo, mat);
  group.add(front);
  if (edge) {
    const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: tex, color: EDGE, transparent: !opaque, alphaTest: opaque ? 0 : 0.5, side: THREE.DoubleSide,
    }));
    // The card's edge: about 1 cm on a figure a metre or more tall, in proportion on smaller ones
    // (a fixed offset showed as a dark double behind the tiny Caterpillar).
    const k = Math.min(1, Math.max(width, height));
    back.position.set(0.012 * k, -0.012 * k, -0.018 * k);
    group.add(back);
  }
  group.userData.front = front;
  return group;
}

// A texture repeated across a wide flat; mirroring hides the seam between copies.
export function tiled(t, repeatX) {
  t.wrapS = THREE.MirroredRepeatWrapping;
  t.repeat.set(repeatX, 1);
  t.needsUpdate = true;
  return t;
}

// A soft halo of light, for spot colours that glow (docs/COLOR.md). Sits just behind a prop.
let haloTex = null;
export function halo(color, size, strength = 0.45) {
  if (!haloTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    haloTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({
    map: haloTex, color, transparent: true, opacity: strength, depthWrite: false,
  }));
  m.position.z = -0.005;
  return m;
}
