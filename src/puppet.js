// A toy-theater puppet: a paper cutout that slides on the floor, hops when it
// moves, and turns partly toward the camera so its flatness never shows edge-on.
// Poses are whole-figure swaps for now; swappable parts come with the master drawings.
import * as THREE from 'three';
import { paperFlat } from './stage.js';

const MAX_TURN = 0.6; // radians the cutout may turn toward the camera
const STEP = 0.4; // one step, as a fraction of the figure's height

export class Puppet {
  // poses: { name: { tex, aspect, height?, facesLeft, hand? } }
  // hand: [u, v], where the near hand is drawn, as fractions of the image from its top left.
  constructor(poses, height) {
    this.root = new THREE.Group();
    this.height = height;
    this.poses = {};
    for (const [name, p] of Object.entries(poses)) {
      const h = p.height ?? height;
      const flat = paperFlat(p.tex, h * p.aspect, h);
      flat.visible = false;
      flat.userData.facesLeft = p.facesLeft;
      flat.userData.offsetX = p.offsetX ?? 0; // shifts a pose so its body lines up with the others
      flat.position.y = -(p.drop ?? 0) * h; // drop: fraction of the drawing below the feet (a tail hanging over a ledge)
      flat.userData.size = [h * p.aspect, h];
      flat.userData.hand = p.hand;
      this.root.add(flat);
      this.poses[name] = flat;
    }
    this.pose = null;
  }

  // state: { pose, x, z, visible, moving, dir (+1 right / -1 left), sink (0..1), phase,
  //          y (lift, metres), scale (1 = normal size), tilt (radians),
  //          dist (metres walked along the current leg, from track.js),
  //          float (true: swimming; bobs on the water instead of walking or hopping),
  //          idle (seconds: standing-still life, a gentle rock and a bounce on the toes) }
  apply(s, camera) {
    this.root.visible = s.visible !== false;
    if (!this.root.visible) return;
    // Walking (any speed): the two step drawings alternate once per step, and the step
    // count comes from the distance covered, so the feet keep pace with the ground at any
    // speed or size. Without walk drawings, the standing pose glides. (The composed running
    // poses are retired: their legs read wrongly in motion. Owner, 2026-10-10.)
    let pose = s.pose;
    const walking = pose === 'stand' && s.moving && !s.float;
    const steps = walking ? (s.dist !== undefined ? s.dist / (STEP * this.height * (s.scale ?? 1)) : s.phase) : 0;
    // With only one step drawing, it is held for the whole walk: swapping it with the standing
    // drawing each step made the engraved figures jump (owner, 2026-10-15).
    if (walking && this.poses.walk_a) pose = this.poses.walk_b && Math.floor(steps) % 2 ? 'walk_b' : 'walk_a';
    if (pose !== this.pose) {
      if (this.pose) this.poses[this.pose].visible = false;
      this.poses[pose].visible = true;
      this.pose = pose;
    }
    const flat = this.poses[pose];
    // Figures glide without bobbing: no rise mid-step, no rocking, no hop (owner, 2026-10-15).
    // Only a swimmer (float) still bobs on the water.
    const hop = s.float ? Math.sin((s.phase ?? 0) * Math.PI * 2) * 0.03 * this.height : 0;
    const rock = s.float ? Math.sin((s.phase ?? 0) * Math.PI) * 0.04 : 0;
    const bounce = 0;
    // Standing still means still: no idle sway (owner, 2026-10-15). `idle` is ignored.
    const scale = s.scale ?? 1;
    this.root.scale.setScalar(scale);
    this.root.position.set(s.x, (s.y ?? 0) + (hop + bounce) * scale - (s.sink ?? 0) * this.height * scale * 1.1, s.z);
    flat.rotation.z = rock + (s.tilt ?? 0);
    // Mirror so the figure faces its direction of travel.
    const facingLeft = (s.dir ?? -1) < 0;
    flat.scale.x = facingLeft === flat.userData.facesLeft ? 1 : -1;
    flat.position.x = flat.userData.offsetX * flat.scale.x;
    // Turn toward the camera, within limits.
    const toCam = Math.atan2(camera.position.x - s.x, camera.position.z - s.z);
    this.root.rotation.y = THREE.MathUtils.clamp(toCam, -MAX_TURN, MAX_TURN);
  }

  // World position of the hand drawn in the current pose, just in front of the card,
  // so a carried prop follows the drawing through mirroring, tilt, turn and scale.
  handPoint(out = new THREE.Vector3()) {
    const flat = this.poses[this.pose];
    return this.point(...(flat?.userData.hand ?? [0.5, 0.55]), out);
  }

  // World position of a point drawn in the current pose ([u, v] as fractions of the image
  // from its top left), just in front of the card: e.g. her eyes, for tears.
  point(u, v, out = new THREE.Vector3()) {
    const flat = this.poses[this.pose];
    if (!flat) return out.copy(this.root.position); // not shown yet
    const [w, h] = flat?.userData.size ?? [0, this.height];
    this.root.updateMatrixWorld(true);
    return flat.localToWorld(out.set((u - 0.5) * w, (1 - v) * h, 0.03));
  }
}

// Things a figure carries sit at the hand drawn in its current pose, in front of its card,
// turned with it toward the camera. `drop` lowers a bottom-anchored prop into the grip.
const held = new THREE.Vector3();
export function carry(obj, puppet, { drop = 0, tilt = 0 } = {}) {
  puppet.handPoint(held);
  obj.position.set(held.x, held.y - drop * puppet.root.scale.y, held.z);
  obj.rotation.set(0, puppet.root.rotation.y, tilt);
}
