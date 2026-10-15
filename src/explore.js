// Explore mode: walk the floor of the diorama with a limited look arc (150°, owner 2026-10-11),
// so the flat edges of the set never come into view.
import * as THREE from 'three';

const EYE = 1.35;
const YAW_LIMIT = THREE.MathUtils.degToRad(75);   // ±75° = a 150° arc
const PITCH_LIMIT = THREE.MathUtils.degToRad(25);
const SPEED = 1.6; // m/s

export class Explorer {
  constructor(camera, dom, bounds) {
    this.camera = camera;
    this.bounds = bounds;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.active = false;
    this.drag = null;
    this.target = null;   // a spot on the floor to walk to (a tap)
    this.holding = false; // walking forward while a finger is held down
    this.stick = { x: 0, y: 0 }; // the on-screen joystick (touch): x right, y forward, each -1..1
    addEventListener('keydown', (e) => { if (this.active) { this.keys.add(e.code); this.target = null; } });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    // Drag to look (mouse or finger). On a touch screen, a tap walks to that spot on the floor
    // and a finger held still walks forward until it lifts.
    dom.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this.drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, touch: e.pointerType !== 'mouse' };
      clearTimeout(this.holdTimer);
      if (this.drag.touch) this.holdTimer = setTimeout(() => { if (this.drag && !this.drag.moved) { this.holding = true; this.target = null; } }, 350);
    });
    addEventListener('pointerup', (e) => {
      const d = this.drag;
      clearTimeout(this.holdTimer);
      if (this.active && d && d.touch && !d.moved && !this.holding && performance.now() - d.t0 < 350) this.walkTo(e.clientX, e.clientY, dom);
      this.drag = null; this.holding = false;
    });
    addEventListener('pointermove', (e) => {
      if (!this.active || !this.drag) return;
      if (Math.hypot(e.clientX - this.drag.x0, e.clientY - this.drag.y0) > 12) this.drag.moved = true;
      if (!this.drag.moved) return;
      this.look((e.clientX - this.drag.x) * -0.004, (e.clientY - this.drag.y) * -0.004);
      this.drag.x = e.clientX; this.drag.y = e.clientY;
    });
  }

  // Walk toward the point on the floor under a tap (if the tap is on the floor, within bounds).
  walkTo(cx, cy, dom) {
    const r = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (!hit) return;
    const b = this.bounds;
    this.target = { x: THREE.MathUtils.clamp(hit.x, b.minX, b.maxX), z: THREE.MathUtils.clamp(hit.z, b.minZ, b.maxZ) };
  }

  look(dYaw, dPitch) {
    this.yaw = THREE.MathUtils.clamp(this.yaw + dYaw, -YAW_LIMIT, YAW_LIMIT);
    this.pitch = THREE.MathUtils.clamp(this.pitch + dPitch, -PITCH_LIMIT, PITCH_LIMIT);
  }

  // Start from wherever the Watch camera was, pulled inside the walkable area.
  enter() {
    const b = this.bounds, p = this.camera.position;
    p.set(THREE.MathUtils.clamp(p.x, b.minX, b.maxX), EYE, THREE.MathUtils.clamp(p.z, b.minZ, b.maxZ));
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.yaw = 0;
    this.pitch = 0;
    this.look(Math.atan2(-dir.x, -dir.z), Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)));
    this.active = true;
  }

  exit() {
    this.active = false;
    this.keys.clear();
    this.target = null; this.holding = false; this.stick = { x: 0, y: 0 };
  }

  update(dt) {
    const k = this.keys;
    const fwd = THREE.MathUtils.clamp((k.has('KeyW') || k.has('ArrowUp') || this.holding ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) + this.stick.y, -1, 1);
    const side = THREE.MathUtils.clamp((k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + this.stick.x, -1, 1);
    if (this.stick.x || this.stick.y) this.target = null;
    const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
    if (turn) this.look(turn * 1.4 * dt, 0);
    const p = this.camera.position, b = this.bounds;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    p.x += (-sin * fwd + cos * side) * SPEED * dt;
    p.z += (-cos * fwd - sin * side) * SPEED * dt;
    if (this.target) {
      const dx = this.target.x - p.x, dz = this.target.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.05) this.target = null;
      else { const s = Math.min(d, SPEED * dt); p.x += (dx / d) * s; p.z += (dz / d) * s; }
    }
    p.x = THREE.MathUtils.clamp(p.x, b.minX, b.maxX);
    p.z = THREE.MathUtils.clamp(p.z, b.minZ, b.maxZ);
    p.y = EYE;
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  // The nearest hotspot in front of the camera and within reach, if any.
  facing(hotspots) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    let best = null;
    for (const h of hotspots) {
      const to = h.pos.clone().sub(this.camera.position);
      const d = to.length();
      if (d > 2.6) continue;
      const ang = dir.angleTo(to.normalize());
      if (ang < 0.45 && (!best || d < best.d)) best = { h, d };
    }
    return best?.h ?? null;
  }
}
