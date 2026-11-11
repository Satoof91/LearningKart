// The zoo: looping road, scenery, enclosures (habitats), kart, gate arch, pickups and confetti.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from './animals.js';
import { makeFriend } from './friends.js';
import { BIOMES } from './data.js';
import { canvasTexture, signTexture, bubbleTexture, FONT } from './text.js';
import { arDigits } from './data.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
export function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- materials ----------
const LAM = new Map();
export function lam(c) { let m = LAM.get(c); if (!m) { m = new THREE.MeshLambertMaterial({ color: c, flatShading: true }); LAM.set(c, m); } return m; }

// merge many static pieces into one mesh per color (few draw calls -> smooth on phones)
export class Batch {
  constructor(useToon) { this.map = new Map(); this.toon = useToon; }
  add(geo, color, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz)));
    if (!this.map.has(color)) this.map.set(color, []);
    this.map.get(color).push(g);
  }
  build(parent, { cast = true, receive = false } = {}) {
    const out = [];
    for (const [c, gs] of this.map) {
      const merged = mergeGeometries(gs);
      gs.forEach(g => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const m = new THREE.Mesh(merged, this.toon ? toon(c) : lam(c));
      m.castShadow = cast; m.receiveShadow = receive;
      parent.add(m); out.push(m);
    }
    this.map.clear();
    return out;
  }
}

// shared low-poly geometries
const G = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cone: new THREE.ConeGeometry(1, 1, 7),
  ico: new THREE.IcosahedronGeometry(1, 1),
  ico0: new THREE.IcosahedronGeometry(1, 0),
  dodec: new THREE.DodecahedronGeometry(1, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(1, 12, 9)
};

// ---------- props (added into a Batch) ----------
export const PROPS = {
  roundTree(b, x, z, s = 1, col = 0x52b947) { b.add(G.cyl6, 0x8a5a33, x, 1.6 * s, z, 0, 0, 0, 0.45 * s, 3.2 * s, 0.45 * s); b.add(G.ico, col, x, 4.4 * s, z, 0, x, 0, 2.4 * s, 2.2 * s, 2.4 * s); b.add(G.ico, col, x + 1.1 * s, 3.8 * s, z + 0.5 * s, 0, z, 0, 1.6 * s); },
  pine(b, x, z, s = 1, col = 0x2f9e44) { b.add(G.cyl6, 0x7a4a26, x, 0.9 * s, z, 0, 0, 0, 0.4 * s, 1.8 * s, 0.4 * s); b.add(G.cone, col, x, 3.2 * s, z, 0, 0, 0, 2.4 * s, 3.6 * s, 2.4 * s); b.add(G.cone, col, x, 5.2 * s, z, 0, 0.5, 0, 1.8 * s, 3 * s, 1.8 * s); },
  snowPine(b, x, z, s = 1) { PROPS.pine(b, x, z, s, 0x2b8a3e); b.add(G.cone, 0xffffff, x, 6.3 * s, z, 0, 0.3, 0, 0.9 * s, 1.2 * s, 0.9 * s); },
  acacia(b, x, z, s = 1) { b.add(G.cyl6, 0x8a5a33, x, 2.2 * s, z, 0, 0, 0.1, 0.35 * s, 4.4 * s, 0.35 * s); b.add(G.ico, 0x7cb342, x + 0.3 * s, 4.8 * s, z, 0, 0, 0, 3.6 * s, 0.9 * s, 2.8 * s); },
  palm(b, x, z, s = 1) {
    for (let k = 0; k < 5; k++) b.add(G.cyl6, k % 2 ? 0xb07d48 : 0x9c6b3c, x + k * 0.12 * s, (0.6 + k * 1.1) * s, z, 0, 0, -0.05, 0.38 * s, 1.15 * s, 0.38 * s);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; b.add(G.sph, 0x40a33a, x + 0.6 * s + Math.cos(a) * 1.7 * s, 5.8 * s, z + Math.sin(a) * 1.7 * s, 0, -a, 0.35, 2.1 * s, 0.22 * s, 0.6 * s); }
  },
  cactus(b, x, z, s = 1) { b.add(G.cyl, 0x52b788, x, 1.6 * s, z, 0, 0, 0, 0.5 * s, 3.2 * s, 0.5 * s); b.add(G.sph, 0x52b788, x, 3.2 * s, z, 0, 0, 0, 0.5 * s); b.add(G.cyl, 0x52b788, x + 0.75 * s, 1.9 * s, z, 0, 0, 0, 0.3 * s, 1.2 * s, 0.3 * s); b.add(G.cyl, 0x52b788, x + 0.5 * s, 1.4 * s, z, 0, 0, Math.PI / 2, 0.3 * s, 0.6 * s, 0.3 * s); b.add(G.sph, 0xff8fab, x, 3.6 * s, z, 0, 0, 0, 0.25 * s); },
  rock(b, x, z, s = 1, col = 0xadb5bd) { b.add(G.dodec, col, x, 0.5 * s, z, x, z, 0, 1.3 * s, 0.9 * s, 1.1 * s); },
  snowRock(b, x, z, s = 1) { PROPS.rock(b, x, z, s, 0xdee2e6); b.add(G.dodec, 0xffffff, x, 1.0 * s, z, 0, 1, 0, 0.9 * s, 0.35 * s, 0.8 * s); },
  grass(b, x, z, s = 1, col = 0xc9a227) { for (let k = 0; k < 4; k++) b.add(G.cone, col, x + (k - 1.5) * 0.25 * s, 0.5 * s, z + (k % 2) * 0.2, 0, 0, (k - 1.5) * 0.25, 0.15 * s, 1.1 * s, 0.15 * s); },
  reed(b, x, z, s = 1) { for (let k = 0; k < 4; k++) { b.add(G.cyl6, 0x5c8d3a, x + k * 0.3, 1.1 * s, z + (k % 2) * 0.3, 0, 0, 0, 0.06, 2.2 * s, 0.06); b.add(G.cyl6, 0x7f4f24, x + k * 0.3, 2.1 * s, z + (k % 2) * 0.3, 0, 0, 0, 0.14, 0.6 * s, 0.14); } },
  log(b, x, z, s = 1) { b.add(G.cyl, 0x8b5e34, x, 0.5 * s, z, 0, 0.6, Math.PI / 2, 0.5 * s, 3 * s, 0.5 * s); },
  mushroom(b, x, z, s = 1) { b.add(G.cyl6, 0xfff3e0, x, 0.4 * s, z, 0, 0, 0, 0.2 * s, 0.8 * s, 0.2 * s); b.add(G.sph, 0xe63946, x, 0.85 * s, z, 0, 0, 0, 0.6 * s, 0.35 * s, 0.6 * s); },
  hay(b, x, z, s = 1) { b.add(G.cyl, 0xf2c14e, x, 0.8 * s, z, 0, 0.4, Math.PI / 2, 0.8 * s, 1.6 * s, 0.8 * s); },
  flower(b, x, z, s = 1, col = 0xff6b9e) { b.add(G.cyl6, 0x4c9a2a, x, 0.4 * s, z, 0, 0, 0, 0.05, 0.8 * s, 0.05); b.add(G.ico0, col, x, 0.85 * s, z, 0, 0, 0, 0.25 * s); b.add(G.ico0, 0xffe066, x, 0.85 * s, z, 0, 0, 0, 0.11 * s); },
  bush(b, x, z, s = 1, col = 0x40a33a) { b.add(G.ico, col, x, 0.7 * s, z, 0, x, 0, 1.2 * s, 0.9 * s, 1.2 * s); b.add(G.ico, col, x + 0.8 * s, 0.5 * s, z + 0.3 * s, 0, z, 0, 0.8 * s); },
  snowman(b, x, z, s = 1) { b.add(G.sph, 0xffffff, x, 0.9 * s, z, 0, 0, 0, 0.9 * s); b.add(G.sph, 0xffffff, x, 2.1 * s, z, 0, 0, 0, 0.6 * s); b.add(G.cone, 0xff922b, x, 2.1 * s, z + 0.65 * s, Math.PI / 2, 0, 0, 0.1 * s, 0.5 * s, 0.1 * s); b.add(G.cyl, 0x343a40, x, 2.8 * s, z, 0, 0, 0, 0.45 * s, 0.5 * s, 0.45 * s); },
  birdhouse(b, x, z, s = 1) { b.add(G.cyl6, 0x8a5a33, x, 1.5 * s, z, 0, 0, 0, 0.12, 3 * s, 0.12); b.add(G.box, 0xffb703, x, 3.3 * s, z, 0, 0, 0, 1 * s, 1 * s, 1 * s); b.add(G.cone, 0xe63946, x, 4.1 * s, z, 0, Math.PI / 4, 0, 0.95 * s, 0.7 * s, 0.95 * s); },
  appleTree(b, x, z, s = 1) { PROPS.roundTree(b, x, z, s, 0x4caf50); for (let k = 0; k < 7; k++) { const a = k * 0.9; b.add(G.sph, 0xff3b3b, x + Math.cos(a) * 2.1 * s, (3.6 + (k % 3) * 0.7) * s, z + Math.sin(a) * 2.1 * s, 0, 0, 0, 0.32 * s); } },
  lamp(b, x, z) { b.add(G.cyl6, 0x495057, x, 2.5, z, 0, 0, 0, 0.15, 5, 0.15); b.add(G.sph, 0xfff3bf, x, 5.2, z, 0, 0, 0, 0.55); },
  balloons(b, x, z, s = 1) { const cols = [0xff4d6d, 0xffd60a, 0x4cc9f0, 0x80ed99, 0xc77dff]; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; const bx = x + Math.cos(a) * 0.8 * s, bz = z + Math.sin(a) * 0.8 * s, by = (5.5 + (k % 2) * 0.8) * s; b.add(G.cyl6, 0xf8f9fa, (x + bx) / 2, by / 2, (z + bz) / 2, 0, 0, 0, 0.02, by, 0.02); b.add(G.sph, cols[k], bx, by, bz, 0, 0, 0, 0.75 * s, 0.9 * s, 0.75 * s); } }
};
const BIOME_PROP = {
  acacia: PROPS.acacia, rock: PROPS.rock, grass: PROPS.grass, reed: PROPS.reed, pine: PROPS.pine, log: PROPS.log, mushroom: PROPS.mushroom,
  palm: PROPS.palm, cactus: PROPS.cactus, hay: PROPS.hay, round: PROPS.roundTree, flower: PROPS.flower, snowrock: PROPS.snowRock, snowman: PROPS.snowman,
  bush: PROPS.bush, birdhouse: PROPS.birdhouse, appletree: PROPS.appleTree, water: null
};

// ---------- track ----------
export const HALF_W = 8.5, CURB = 1.3, FENCE = 14, LANE = 6.4;
const CP = [[0, -160], [95, -150], [165, -95], [175, -15], [125, 40], [160, 110], [100, 170], [10, 150], [-60, 185], [-150, 150], [-180, 65], [-125, 5], [-175, -70], [-115, -145]];

export function buildTrack() {
  const curve = new THREE.CatmullRomCurve3(CP.map(([x, z]) => new V3(x, 0, z)), true, 'centripetal');
  const N = 1400;
  const pts = [], nor = [], hd = [];
  for (let i = 0; i < N; i++) {
    const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u).setY(0).normalize();
    pts.push(p); nor.push(new V3(t.z, 0, -t.x)); hd.push(Math.atan2(t.x, t.z));
  }
  const L = curve.getLength(), SP = L / N;
  const wrapU = u => ((u % L) + L) % L;
  const tmp = new V3(), tmpN = new V3();
  return {
    pts, nor, hd, N, L, SP, wrapU,
    // position at distance u along the road, lateral offset d (positive = left)
    pos(u, d = 0, out = new V3()) {
      const s = wrapU(u) / SP, i = Math.floor(s) % N, j = (i + 1) % N, f = s - Math.floor(s);
      out.lerpVectors(pts[i], pts[j], f);
      tmpN.lerpVectors(nor[i], nor[j], f).normalize();
      return out.addScaledVector(tmpN, d);
    },
    normal(u, out = new V3()) { const s = wrapU(u) / SP, i = Math.floor(s) % N, j = (i + 1) % N, f = s - Math.floor(s); return out.lerpVectors(nor[i], nor[j], f).normalize(); },
    heading(u) {
      const s = wrapU(u) / SP, i = Math.floor(s) % N, j = (i + 1) % N, f = s - Math.floor(s);
      let d = hd[j] - hd[i]; d = Math.atan2(Math.sin(d), Math.cos(d)); return hd[i] + d * f;
    },
    // signed shortest distance from a to b along the loop
    delta(a, b) { let d = wrapU(b) - wrapU(a); if (d > L / 2) d -= L; if (d < -L / 2) d += L; return d; },
    clearance(x, z, skipU, skipR) { // min distance from point to road centre line (optionally ignoring part of the loop)
      let m = 1e9;
      for (let i = 0; i < N; i += 2) {
        if (skipU != null && Math.abs(this.delta(skipU, i * SP)) < skipR) continue;
        const dx = x - pts[i].x, dz = z - pts[i].z, dd = dx * dx + dz * dz; if (dd < m) m = dd;
      }
      return Math.sqrt(m);
    }
  };
}

function ribbon(scene, T, offA, offB, y, colorFn, skip, mat) {
  const { N, pts, nor } = T;
  const pos = [], col = [], idx = [], nrm = [];
  for (let i = 0; i <= N; i++) {
    const j = i % N;
    const a = pts[j].clone().addScaledVector(nor[j], offA), b = pts[j].clone().addScaledVector(nor[j], offB);
    pos.push(a.x, y, a.z, b.x, y, b.z); nrm.push(0, 1, 0, 0, 1, 0);
    const c = colorFn(i); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  for (let i = 0; i < N; i++) { if (skip && skip(i)) continue; const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat || new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  m.receiveShadow = true; scene.add(m); return m;
}

// ---------- the static zoo ----------
export function buildZoo(scene, T) {
  let setBanner = () => {};
  const R = rng(4242);
  const C = h => new THREE.Color(h);
  // sky dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C(0x3fa9f5) }, mid: { value: C(0x9edcff) }, bot: { value: C(0xe8f8ff) } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying float h; void main(){ vec3 c = h > 0.15 ? mix(mid, top, smoothstep(0.15, 0.7, h)) : mix(bot, mid, smoothstep(-0.05, 0.15, h)); gl_FragColor = vec4(c,1.0); }'
  }));
  sky.renderOrder = -10; scene.add(sky);
  // ground
  const grassTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#7ccf5a'; g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 900; i++) { g.fillStyle = ['#72c650', '#86d864', '#6bbf4b', '#8fdc6c'][(r() * 4) | 0]; g.fillRect(r() * w, r() * h, 2 + r() * 3, 4 + r() * 6); }
  });
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(140, 140);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshLambertMaterial({ map: grassTex }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // road + rainbow curbs + sand verge
  const roadA = C(0x5d6475), roadB = C(0x646b7d);
  ribbon(scene, T, -HALF_W, HALF_W, 0.05, i => ((i / 7 | 0) % 2 ? roadA : roadB));
  ribbon(scene, T, -0.35, 0.35, 0.08, () => C(0xffffff), i => ((i / 6 | 0) % 2) === 1);
  const rainbow = [0xff595e, 0xff924c, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93].map(C);
  ribbon(scene, T, HALF_W, HALF_W + CURB, 0.07, i => rainbow[(i / 4 | 0) % 6]);
  ribbon(scene, T, -HALF_W - CURB, -HALF_W, 0.07, i => rainbow[(i / 4 | 0) % 6]);
  const sand = C(0xf3e2b3);
  ribbon(scene, T, HALF_W + CURB, FENCE - 0.5, 0.03, () => sand);
  ribbon(scene, T, -FENCE + 0.5, -HALF_W - CURB, 0.03, () => sand);

  const env = new Batch(false);
  // wooden fence along both sides
  const step = 4;
  for (let u = 0; u < T.L; u += step) {
    for (const s of [1, -1]) {
      const p = T.pos(u, s * FENCE), q = T.pos(u + step, s * FENCE);
      env.add(G.cyl6, 0x9c6644, p.x, 0.8, p.z, 0, 0, 0, 0.2, 1.6, 0.2);
      const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2, len = Math.hypot(q.x - p.x, q.z - p.z), ang = Math.atan2(q.x - p.x, q.z - p.z);
      env.add(G.box, 0xc68b59, mx, 1.25, mz, 0, ang, 0, 0.15, 0.22, len);
      env.add(G.box, 0xc68b59, mx, 0.6, mz, 0, ang, 0, 0.15, 0.22, len);
    }
  }
  // lamps + flowers along the verge
  for (let u = 20; u < T.L; u += 70) { const s = ((u / 70) | 0) % 2 ? 1 : -1; const p = T.pos(u, s * (FENCE + 1.6)); PROPS.lamp(env, p.x, p.z); }
  for (let i = 0; i < 520; i++) {
    const u = R() * T.L, s = R() < 0.5 ? 1 : -1, p = T.pos(u, s * (FENCE + 1 + R() * 3));
    PROPS.flower(env, p.x, p.z, 0.9 + R() * 0.6, [0xff6b9e, 0xffd60a, 0xffffff, 0xc77dff, 0xff924c][(R() * 5) | 0]);
  }

  // enclosure slots (filled per level with the animals the child already met)
  const slots = [];
  const SLOT_N = 14;
  for (let k = 0; k < SLOT_N; k++) {
    const u = (k + 0.5) / SLOT_N * T.L;
    if (u < 45 || u > T.L - 30) continue;
    for (const s of k % 2 ? [1, -1] : [-1, 1]) {
      const c = T.pos(u, s * (FENCE + 14.5));
      if (T.clearance(c.x, c.z) < FENCE + 12.5) continue;
      const roadP = T.pos(u, 0);
      slots.push({ u, side: s, x: c.x, z: c.z, face: Math.atan2(roadP.x - c.x, roadP.z - c.z) });
      break;
    }
  }
  const nearSlot = (x, z, r) => slots.some(s => (s.x - x) ** 2 + (s.z - z) ** 2 < r * r);

  // trees / bushes / rocks across the park (outside the road and enclosures)
  let placed = 0;
  for (let tries = 0; tries < 9000 && placed < 340; tries++) {
    const x = (R() - 0.5) * 760, z = (R() - 0.5) * 760;
    const cl = T.clearance(x, z);
    if (cl < FENCE + 5 || nearSlot(x, z, 17)) continue;
    if (x * x + z * z > 420 * 420) continue;
    const k = R(), s = 0.8 + R() * 0.7;
    if (k < 0.45) PROPS.roundTree(env, x, z, s, [0x52b947, 0x40a33a, 0x69c35a, 0x2f9e44][(R() * 4) | 0]);
    else if (k < 0.7) PROPS.pine(env, x, z, s);
    else if (k < 0.85) PROPS.bush(env, x, z, s);
    else if (k < 0.93) PROPS.rock(env, x, z, s);
    else PROPS.palm(env, x, z, s);
    placed++;
  }
  // entrance arch at the start
  const arch = new THREE.Group();
  {
    const b = new Batch(true);
    for (const s of [1, -1]) {
      b.add(G.box, 0xffb703, s * (FENCE - 1), 4.5, 0, 0, 0, 0, 2.4, 9, 2.4);
      b.add(G.box, 0xfb8500, s * (FENCE - 1), 9.3, 0, 0, 0, 0, 3, 0.8, 3);
      b.add(G.sph, 0xff4d6d, s * (FENCE - 1), 10.6, 0, 0, 0, 0, 1.2);
      PROPS.balloons(b, s * (FENCE + 2.5), 2, 1.1);
    }
    b.build(arch);
    // the banner text follows the interface language (redrawn by setBanner)
    const drawBanner = (g, w, h, text) => {
      const grd = g.createLinearGradient(0, 0, w, 0); ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].forEach((c, i) => grd.addColorStop(i / 4, c));
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(i * 37, (i % 3) * 70 + 20, 14, 0, TAU); g.fill(); }
      const ar = /[؀-ۿ]/.test(text);
      g.direction = ar ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${ar ? 120 : 104}px ${FONT}, sans-serif`;
      g.lineWidth = 16; g.lineJoin = 'round'; g.strokeStyle = '#3a0ca3'; g.strokeText(text, w / 2, h / 2 + (ar ? 12 : 8));
      g.fillStyle = '#fff'; g.fillText(text, w / 2, h / 2 + (ar ? 12 : 8));
    };
    const tex = canvasTexture(1024, 200, (g, w, h) => drawBanner(g, w, h, 'حديقة الحروف'));
    setBanner = text => { const c = tex.image; drawBanner(c.getContext('2d'), c.width, c.height, text); tex.needsUpdate = true; };
    const banner = new THREE.Mesh(new THREE.BoxGeometry(FENCE * 2 + 1, 3.6, 0.6), [lam(0x3a0ca3), lam(0x3a0ca3), lam(0x3a0ca3), lam(0x3a0ca3), new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ map: tex })]);
    banner.position.y = 8.4; banner.castShadow = true; arch.add(banner);
    const p = T.pos(8, 0); arch.position.set(p.x, 0, p.z); arch.rotation.y = T.heading(8) + Math.PI;
    scene.add(arch);
  }
  // distant hills + clouds
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * TAU + R() * 0.15, r = 520 + R() * 160, h = 60 + R() * 110, w = 100 + R() * 80;
    env.add(G.cone, [0x6cc04a, 0x5fb24f, 0x7fd15d][i % 3], Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r, 0, R() * 3, 0, w, h, w);
  }
  env.build(scene, { cast: false }); // scenery doesn't cast shadows: big saving on phones

  const clouds = new THREE.Group();
  const cb = new Batch(false);
  for (let i = 0; i < 18; i++) {
    const a = R() * TAU, r = 120 + R() * 380, y = 95 + R() * 60, n = 3 + ((R() * 3) | 0);
    for (let k = 0; k < n; k++) cb.add(G.ico, 0xffffff, Math.cos(a) * r + k * 13 - n * 6, y + R() * 4, Math.sin(a) * r + R() * 8, 0, 0, 0, 11 + R() * 7, 6 + R() * 3, 9 + R() * 4);
  }
  cb.build(clouds, { cast: false }); scene.add(clouds);
  return { slots, clouds, arch, setBanner };
}

// ---------- habitat (enclosure with animals + sign) ----------
export function makeHabitat(biomeName, animalIds, sign, opts = {}) {
  const R = opts.radius || 10.5;
  const biome = BIOMES[biomeName] || BIOMES.savanna;
  const group = new THREE.Group();
  const b = new Batch(false);
  const r = rng(opts.seed || 7);
  b.add(G.cyl, biome.ground, 0, 0.18, 0, 0, 0, 0, R, 0.36, R);
  // stone border + low fence
  const n = 26;
  for (let k = 0; k < n; k++) {
    const a = k / n * TAU, x = Math.sin(a) * (R + 0.4), z = Math.cos(a) * (R + 0.4);
    b.add(G.dodec, 0xced4da, x, 0.3, z, a, a * 2, 0, 0.75, 0.5, 0.75);
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.5) continue; // open front so the animal is easy to see
    b.add(G.cyl6, 0x9c6644, x, 1.0, z, 0, 0, 0, 0.14, 2.0, 0.14);
    const a2 = (k + 1) / n * TAU;
    if (Math.abs(Math.atan2(Math.sin(a2), Math.cos(a2))) < 0.5) continue;
    const x2 = Math.sin(a2) * (R + 0.4), z2 = Math.cos(a2) * (R + 0.4);
    b.add(G.box, 0xd4a373, (x + x2) / 2, 1.5, (z + z2) / 2, 0, Math.atan2(x2 - x, z2 - z), 0, 0.12, 0.2, Math.hypot(x2 - x, z2 - z));
  }
  // biome props in the back half
  const props = biome.props;
  if (props.includes('water')) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.48, R * 0.48, 0.1, 28), new THREE.MeshLambertMaterial({ color: 0x4dabf7 }));
    w.position.set(-R * 0.25, 0.4, -R * 0.3); w.receiveShadow = true; group.add(w);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.48, 0.2, 6, 28), lam(0xa5d8ff)); rim.rotation.x = Math.PI / 2; rim.position.copy(w.position); rim.position.y = 0.42; group.add(rim);
    for (let k = 0; k < 3; k++) { const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 10), lam(0x69db7c)); pad.position.set(-R * 0.25 + Math.cos(k * 2.1) * R * 0.28, 0.47, -R * 0.3 + Math.sin(k * 2.1) * R * 0.25); group.add(pad); }
  }
  for (let k = 0; k < 9; k++) {
    const name = props[k % props.length]; const f = BIOME_PROP[name];
    if (!f) continue;
    const a = Math.PI * (0.55 + r() * 0.9), d = R * (0.45 + r() * 0.42);
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (name === 'pine' && biomeName === 'snow') PROPS.snowPine(b, x, z, 0.75 + r() * 0.3);
    else f(b, x, z, ['acacia', 'pine', 'palm', 'round'].includes(name) ? 0.75 + r() * 0.3 : 0.8 + r() * 0.5);
  }
  b.build(group, { cast: true, receive: true });
  group.children.forEach(c => { c.receiveShadow = true; });

  // sign at the front facing the road
  let signMesh = null;
  if (sign) {
    const sb = new Batch(true);
    sb.add(G.cyl6, 0x8a5a33, -1.4, 1.7, 0, 0, 0, 0, 0.15, 3.4, 0.15);
    sb.add(G.cyl6, 0x8a5a33, 1.4, 1.7, 0, 0, 0, 0, 0.15, 3.4, 0.15);
    const sg = new THREE.Group(); sb.build(sg);
    signMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.3), new THREE.MeshLambertMaterial({ map: signTexture(sign.big, sign.word), transparent: true }));
    signMesh.position.set(0, 4.3, 0.12); signMesh.userData.ownTex = true; sg.add(signMesh);
    if (opts.signBack) { sg.position.set(-R * 0.5, 0, -R * 0.55); sg.rotation.y = 0.35; sg.scale.setScalar(1.25); }
    else { sg.position.set(R * 0.62, 0, R + 1.4); sg.rotation.y = -0.25; }
    group.add(sg);
  }

  // animals
  const animals = [];
  const cnt = animalIds.length;
  const sc = opts.animalScale || 1;
  animalIds.forEach((id, i) => {
    const a = makeFriend(id);
    let x = 0, z = 0;
    if (cnt > 1) {
      const cols = Math.min(cnt, 5), row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, cnt - row * cols);
      x = (col - (inRow - 1) / 2) * (R * 1.5 / Math.max(cols, 2)); z = row ? -R * 0.35 : R * 0.15;
    }
    a.root.position.set(x, 0.36, z);
    a.root.scale.multiplyScalar(sc);
    a.baseScale = a.root.scale.x;
    group.add(a.root); animals.push(a);
  });
  return { group, animals, signMesh, radius: R };
}

// ---------- kart ----------
// look: { body: 'classic' | 'racer' | 'jeep' | 'rocket', hat: 'helmet' | 'cap' | 'safari' | 'bunny' | 'crown', skin: 0-3,
//         driver: 'boy' | 'girl' | <animal id> }
// The returned `pilot` group is the co-pilot seat (an animal friend rides there); `driver` is the driver's
// seat, filled by the caller with the animal when the driver is an animal (the child figure is not built then).
export const SKINS = [0xffd6a5, 0xf1c27d, 0xc68642, 0x8d5524];
export function makeKart(colorHex, look = {}) {
  const body = look.body || 'classic', hat = look.hat || 'helmet', skin = SKINS[look.skin | 0] ?? SKINS[0];
  const root = new THREE.Group();
  const tilt = new THREE.Group(); root.add(tilt);
  const add = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0, par = tilt) => { const m = new THREE.Mesh(geo, toon(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; par.add(m); return m; };
  const col = new THREE.Color(colorHex).getHex();
  const dark = 0x2b2d42;
  const pilot = new THREE.Group(); tilt.add(pilot);
  let wheelScale = 1, flagAt = [-0.9, 2.2, -2.2], driverY = 0;
  if (body === 'racer') {
    // low and long, pointed nose, big rear wing
    add(new THREE.BoxGeometry(2.2, 0.55, 4.0), col, 0, 0.75, -0.1);
    add(new THREE.ConeGeometry(1.0, 1.6, 4), col, 0, 0.75, 2.6, Math.PI / 2, Math.PI / 4).scale.set(1.05, 1, 0.5);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.12, 0.12, 3.6), 0xffffff, s * 0.7, 1.04, 0);
    add(new THREE.BoxGeometry(3.0, 0.15, 0.8), dark, 0, 1.95, -2.15);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.15, 0.9, 0.3), dark, s * 0.8, 1.45, -2.1);
    add(new THREE.BoxGeometry(1.8, 0.7, 1.0), dark, 0, 1.25, -0.8);
    pilot.position.set(0.95, 1.05, -1.55); driverY = -0.15; flagAt = [-1.2, 1.9, -2.3];
  } else if (body === 'jeep') {
    // safari jeep: tall box, roll bar, spare wheel, big wheels
    add(new THREE.BoxGeometry(2.6, 1.0, 3.4), col, 0, 1.15, -0.1);
    add(new THREE.BoxGeometry(2.6, 0.5, 1.0), col, 0, 1.4, 1.8);
    add(new THREE.BoxGeometry(2.7, 0.3, 0.4), 0xffffff, 0, 0.85, 2.35);
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.16, 1.6, 0.16), dark, s * 1.15, 2.4, -1.3); add(new THREE.BoxGeometry(0.16, 1.6, 0.16), dark, s * 1.15, 2.4, 0.3); }
    add(new THREE.BoxGeometry(2.46, 0.16, 1.76), dark, 0, 3.2, -0.5);
    const spare = add(new THREE.TorusGeometry(0.5, 0.22, 8, 14), 0x222222, 0, 1.4, -1.95); spare.rotation.y = 0;
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.28, 10, 8), 0xfff3bf, s * 0.85, 1.45, 2.32);
    add(new THREE.BoxGeometry(2.0, 1.0, 1.1), dark, 0, 1.75, -0.8);
    wheelScale = 1.25; pilot.position.set(0, 1.65, -1.45); driverY = 0.3; flagAt = [-1.15, 3.2, -1.3];
  } else if (body === 'rocket') {
    // rocket kart: a tube with a nose cone, fins and a flame
    const tube = add(new THREE.CylinderGeometry(1.05, 1.15, 4.2, 16), col, 0, 1.1, -0.2, Math.PI / 2);
    tube.scale.set(1, 1, 0.78);
    add(new THREE.ConeGeometry(1.05, 1.5, 16), 0xffffff, 0, 1.1, 2.65, Math.PI / 2).scale.set(1, 1, 0.78);
    for (const [s, r] of [[1, 0], [-1, 0], [0, 1]]) add(new THREE.BoxGeometry(r ? 0.12 : 1.1, r ? 1.1 : 0.12, 1.0), 0xff4d6d, s * 0.95, 1.1 + r * 0.95, -2.1);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 12), new THREE.MeshBasicMaterial({ color: 0xffb703 })); flame.rotation.x = -Math.PI / 2; flame.position.set(0, 1.1, -3.0); tilt.add(flame);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 10), new THREE.MeshBasicMaterial({ color: 0xfff3bf })); core.rotation.x = -Math.PI / 2; core.position.set(0, 1.1, -2.8); tilt.add(core);
    for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(0.14, 8, 6), 0x9edcff, Math.cos(k) * 0.2 + (k - 1.5) * 0.45, 1.95, 1.2 - k * 0.05);
    add(new THREE.BoxGeometry(1.8, 0.8, 1.1), dark, 0, 1.7, -0.8);
    pilot.position.set(0, 1.95, -1.75); driverY = 0.15; flagAt = [-0.95, 2.0, -2.3];
  } else {
    add(new THREE.BoxGeometry(2.4, 0.75, 3.5), col, 0, 0.9, -0.1);
    add(new THREE.SphereGeometry(1, 14, 10), col, 0, 0.95, 1.7).scale.set(1.0, 0.45, 1.0);
    add(new THREE.BoxGeometry(2.7, 0.35, 0.5), 0xffffff, 0, 0.75, 2.85);
    add(new THREE.BoxGeometry(2.0, 1.0, 1.1), dark, 0, 1.4, -0.8);
    add(new THREE.BoxGeometry(2.9, 0.28, 0.9), col, 0, 2.05, -2.05);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.28, 0.9, 0.28), dark, s * 0.9, 1.5, -1.95);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.28, 10, 8), 0xfff3bf, s * 0.75, 1.0, 2.6);
    pilot.position.set(0, 2.2, -2.05);
  }
  // child driver (skin tone + hat), or an empty seat for an animal driver
  const drv = new THREE.Group(); drv.position.y = driverY; tilt.add(drv);
  const who = look.driver || 'boy', human = who === 'boy' || who === 'girl';
  const seat = new THREE.Group(); seat.position.set(0, 1.3, -0.45); drv.add(seat);
  const wheelOnly = () => add(new THREE.TorusGeometry(0.38, 0.08, 6, 14), dark, 0, 1.95, 0.55, -0.7, 0, 0, drv);
  if (!human) return finishKart(wheelOnly());
  add(new THREE.CylinderGeometry(0.6, 0.7, 1.1, 12), 0xffffff, 0, 1.85, -0.5, 0, 0, 0, drv);
  add(new THREE.SphereGeometry(0.78, 16, 12), skin, 0, 2.85, -0.35, 0, 0, 0, drv);
  if (who === 'girl') {
    // hair at the back, two pigtails with pink ties, longer lashes: shows under every hat
    const hair = 0x5a3825;
    add(new THREE.SphereGeometry(0.84, 16, 12, 0, TAU, 0, Math.PI * 0.62), hair, 0, 2.9, -0.47, -0.55, 0, 0, drv);
    for (const s of [-1, 1]) {
      add(new THREE.SphereGeometry(0.3, 10, 8), hair, s * 0.86, 2.55, -0.55, 0, 0, 0, drv).scale.set(0.9, 1.35, 0.9);
      add(new THREE.SphereGeometry(0.13, 8, 6), 0xff5c8a, s * 0.8, 2.92, -0.55, 0, 0, 0, drv);
    }
  }
  if (hat === 'helmet') {
    add(new THREE.SphereGeometry(0.86, 16, 12, 0, TAU, 0, Math.PI * 0.55), col, 0, 2.95, -0.42, -0.2, 0, 0, drv);
    add(new THREE.BoxGeometry(1.2, 0.18, 0.5), 0xffffff, 0, 3.25, 0.15, -0.3, 0, 0, drv);
  } else if (hat === 'cap') {
    add(new THREE.SphereGeometry(0.82, 16, 10, 0, TAU, 0, Math.PI * 0.5), 0x3da5ff, 0, 3.05, -0.4, -0.1, 0, 0, drv);
    add(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16, 1, false, -Math.PI / 2, Math.PI), 0x1c7ed6, 0, 3.08, 0.25, 0, 0, 0, drv).scale.set(1, 1, 1.3);
    add(new THREE.SphereGeometry(0.12, 8, 6), 0xffffff, 0, 3.86, -0.4, 0, 0, 0, drv);
  } else if (hat === 'safari') {
    add(new THREE.CylinderGeometry(1.25, 1.25, 0.08, 20), 0xd4a373, 0, 3.25, -0.38, -0.12, 0, 0, drv);
    add(new THREE.SphereGeometry(0.75, 16, 10, 0, TAU, 0, Math.PI * 0.5), 0xe9c46a, 0, 3.2, -0.4, -0.12, 0, 0, drv);
    add(new THREE.CylinderGeometry(0.76, 0.76, 0.14, 16), 0x6f4518, 0, 3.27, -0.4, -0.12, 0, 0, drv);
  } else if (hat === 'bunny') {
    for (const s of [-1, 1]) {
      const e = add(new THREE.SphereGeometry(0.22, 10, 8), 0xffffff, s * 0.35, 4.0, -0.45, 0, 0, -s * 0.18, drv); e.scale.set(1, 3.0, 0.6);
      const i = add(new THREE.SphereGeometry(0.12, 8, 6), 0xffafcc, s * 0.35, 4.0, -0.33, 0, 0, -s * 0.18, drv); i.scale.set(1, 3.4, 0.4);
    }
    add(new THREE.CylinderGeometry(0.82, 0.82, 0.12, 16), 0xff8fab, 0, 3.3, -0.38, -0.15, 0, 0, drv);
  } else if (hat === 'crown') {
    add(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 14, 1, true), 0xffd60a, 0, 3.55, -0.38, 0, 0, 0, drv).material.side = THREE.DoubleSide;
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; add(new THREE.ConeGeometry(0.13, 0.4, 6), 0xffd60a, Math.cos(a) * 0.6, 3.92, -0.38 + Math.sin(a) * 0.6, 0, 0, 0, drv); add(new THREE.SphereGeometry(0.07, 6, 6), [0xff4d6d, 0x3da5ff, 0x4cd964][k % 3], Math.cos(a) * 0.62, 3.55, -0.38 + Math.sin(a) * 0.62, 0, 0, 0, drv); }
  }
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x1b1b1b });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), eyeM); e.position.set(s * 0.28, 2.85, 0.38); e.scale.y = 1.3; drv.add(e); }
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff9eb5 })); c.position.set(s * 0.48, 2.65, 0.3); c.scale.set(1, 0.6, 0.4); drv.add(c); }
  const smileM = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x7a2e2e })); smileM.rotation.z = Math.PI; smileM.position.set(0, 2.62, 0.42); drv.add(smileM);
  if (who === 'girl') for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), eyeM); l.position.set(s * 0.36, 3.0, 0.42); l.rotation.z = s * 0.5; drv.add(l); }
  const wheel = wheelOnly();
  for (const s of [-1, 1]) { const arm = add(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 6), 0xffffff, s * 0.45, 2.05, 0.15, 1.1, 0, -s * 0.3, drv); arm.castShadow = false; }
  return finishKart(wheel);
  function finishKart(wheel) {
  const flag = new THREE.Group(); flag.position.set(...flagAt); tilt.add(flag);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 5), toon(0xdee2e6)); pole.position.y = 1.3; flag.add(pole);
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 3), toon(0xffd60a)); fl.rotation.z = -Math.PI / 2; fl.position.set(0.55, 2.3, 0); flag.add(fl);
  const wheels = [];
  for (const [x, z, r0, front] of [[-1.4, 1.6, 0.6, true], [1.4, 1.6, 0.6, true], [-1.45, -1.35, 0.75, false], [1.45, -1.35, 0.75, false]]) {
    const r = r0 * wheelScale;
    const steer = new THREE.Group(); steer.position.set(x * (wheelScale > 1 ? 1.06 : 1), r, z);
    const spin = new THREE.Group(); steer.add(spin);
    const tg = new THREE.CylinderGeometry(r, r, 0.65, 14); tg.rotateZ(Math.PI / 2);
    const t = new THREE.Mesh(tg, toon(0x222222)); t.castShadow = true; spin.add(t);
    const hg = new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.68, 8); hg.rotateZ(Math.PI / 2);
    spin.add(new THREE.Mesh(hg, toon(0xffd60a)));
    tilt.add(steer); wheels.push({ steer, spin, r, front });
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5, 6.2), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.12; root.add(shadow);
  return { root, tilt, wheels, wheel, flag: fl, pilot, driver: seat, driverId: human ? '' : who };
  }
}
let BLOB = null;
export function blobTex() { if (!BLOB) BLOB = canvasTexture(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 4, 32, 32, 30); r.addColorStop(0, 'rgba(0,0,0,.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }); return BLOB; }

// ---------- rainbow gate arch ----------
export function makeArch(big, word) {
  const g = new THREE.Group();
  const cols = [0xff595e, 0xff924c, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93];
  cols.forEach((c, i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(FENCE - 2.5 - i * 0.55, 0.32, 8, 40, Math.PI), toon(c));
    t.castShadow = true; g.add(t);
  });
  const b = new Batch(true);
  for (const s of [1, -1]) { b.add(G.cyl, 0xffffff, s * (FENCE - 4), 0.4, 0, 0, 0, 0, 2.2, 0.8, 2.2); PROPS.balloons(b, s * (FENCE + 1), 0, 1.2); }
  b.build(g);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.8), new THREE.MeshLambertMaterial({ map: signTexture(big, word, '#fffdf0'), side: THREE.DoubleSide, transparent: true }));
  sign.position.set(0, FENCE - 4.2, 0.2); sign.userData.ownTex = true; g.add(sign);
  return { group: g, sign };
}

// ---------- pickups ----------
export function makeApple() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), toon(0xff3b3b)); body.scale.set(1, 0.92, 1); body.castShadow = true; g.add(body);
  const hi = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); hi.position.set(-0.45, 0.4, 0.62); g.add(hi);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.6, 5), toon(0x6b3e1a)); stem.position.y = 1.0; stem.rotation.z = 0.2; g.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), toon(0x51cf66)); leaf.scale.set(1, 0.25, 0.55); leaf.position.set(0.35, 1.1, 0); leaf.rotation.z = 0.5; g.add(leaf);
  return g;
}
let STAR_GEO = null;
export function makeStar() {
  if (!STAR_GEO) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.45 : 1, a = i / 10 * TAU + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
    STAR_GEO = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 1 });
    STAR_GEO.center();
  }
  const m = new THREE.Mesh(STAR_GEO, toon(0xffd60a)); m.castShadow = true;
  return m;
}
let PAD_TEX = null;
export function makeBoostPad() {
  if (!PAD_TEX) PAD_TEX = canvasTexture(128, 192, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0); ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].forEach((c, i) => grd.addColorStop(i / 4, c));
    g.fillStyle = grd; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.95)';
    for (let k = 0; k < 3; k++) { const y = 18 + k * 56; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w - 14, y + 40); g.lineTo(w - 40, y + 40); g.lineTo(w / 2, y + 14); g.lineTo(40, y + 40); g.lineTo(14, y + 40); g.closePath(); g.fill(); }
  });
  const geo = new THREE.PlaneGeometry(5, 7.5); geo.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: PAD_TEX, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
}
let GLOW = null;
// help halo: a ring with a hollow centre, drawn behind the bubble, so it never washes out the letter
export function glowTex() { if (!GLOW) GLOW = canvasTexture(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 30, 64, 64, 63); r.addColorStop(0, 'rgba(255,214,10,0)'); r.addColorStop(0.35, 'rgba(255,214,10,.95)'); r.addColorStop(0.6, 'rgba(255,190,0,.5)'); r.addColorStop(1, 'rgba(255,170,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }); return GLOW; }

// ---------- confetti ----------
export class Confetti {
  constructor(scene, max = 260) {
    const geo = new THREE.PlaneGeometry(0.45, 0.7);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), max);
    this.mesh.frustumCulled = false; this.mesh.count = 0; scene.add(this.mesh);
    this.p = []; this.max = max; this.d = new THREE.Object3D(); this.c = new THREE.Color();
    this.cols = [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xff70a6, 0xffffff];
  }
  burst(pos, n = 40, power = 12, cols, size = 1) {
    for (let i = 0; i < n; i++) {
      if (this.p.length >= this.max) this.p.shift();
      const a = Math.random() * TAU, up = 0.5 + Math.random();
      this.p.push({ size, x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * power * (0.3 + Math.random() * 0.7), vy: up * power, vz: Math.sin(a) * power * (0.3 + Math.random() * 0.7), r: Math.random() * TAU, vr: (Math.random() - 0.5) * 14, life: 1.6 + Math.random() * 1.2, col: (cols || this.cols)[(Math.random() * (cols || this.cols).length) | 0] });
    }
  }
  update(dt) {
    const d = this.d; let n = 0;
    this.p = this.p.filter(q => (q.life -= dt) > 0 && q.y > -0.5);
    for (const q of this.p) {
      q.vy -= 14 * dt; q.vx *= 0.98; q.vz *= 0.98; if (q.vy < -5) q.vy = -5;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.r += q.vr * dt;
      d.position.set(q.x, q.y, q.z); d.rotation.set(q.r, q.r * 0.7, q.r * 1.3); const s = Math.min(1, q.life * 2) * q.size; d.scale.set(s, s, s); d.updateMatrix();
      this.mesh.setMatrixAt(n, d.matrix); this.mesh.setColorAt(n, this.c.setHex(q.col)); n++;
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ---------- apple table for the number levels: n apples, each with its count bubble ----------
// digits: how numbers are written on the tags; ltr: count left-to-right (English) instead of right-to-left (Arabic)
export function makeAppleTable(n, digits = arDigits, ltr = false) {
  const g = new THREE.Group();
  // more than 6 apples: two rows, so the whole count stays in view next to the card
  const rows = n > 6 ? 2 : 1, cols = Math.max(1, Math.ceil(n / rows)), sp = n > 5 ? 1.9 : 2.3, as = n > 5 ? 0.9 : 1.15;
  const W = Math.max(cols * sp + 1.8, 6), D = rows * sp * 1.25 + 1.8, top = 1.9;
  const b = new Batch(true);
  b.add(G.box, 0xc68b59, 0, top, 0, 0, 0, 0, W, 0.45, D);
  b.add(G.box, 0xfff3e0, 0, top + 0.24, 0, 0, 0, 0, W - 0.5, 0.05, D - 0.5);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b.add(G.cyl6, 0x8a5a33, x * (W / 2 - 0.5), top / 2, z * (D / 2 - 0.5), 0, 0, 0, 0.22, top, 0.22);
  if (n === 0) {
    // an empty basket: zero = nothing inside
    b.add(G.cyl, 0xd4a373, 0, top + 0.9, 0, 0, 0, 0, 1.8, 1.4, 1.8);
    b.add(G.cyl, 0x7f5539, 0, top + 1.62, 0, 0, 0, 0, 1.55, 0.06, 1.55);
    const h = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 8, 24, Math.PI), toon(0xb08968)); h.position.set(0, top + 1.6, 0); h.castShadow = true; g.add(h);
  }
  b.build(g, { cast: true, receive: true });
  const apples = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
    // count from right to left (Arabic reading order)
    const x = (ltr ? c - (inRow - 1) / 2 : (inRow - 1) / 2 - c) * sp, z = rows === 1 ? 0 : (r === 0 ? sp * 0.62 : -sp * 0.62);
    const root = new THREE.Group(); root.position.set(x, top + 0.3 + as, z);
    const a = makeApple(); a.scale.setScalar(as); root.add(a);
    const mat = new THREE.SpriteMaterial({ map: bubbleTexture(digits(i + 1), 0xff922b) });
    const tag = new THREE.Sprite(mat); tag.scale.set(1.45 * as / 1.15 + 0.2, 1.45 * as / 1.15 + 0.2, 1); tag.position.y = 2.1 * as / 1.15 + 0.1 + (r > 0 ? 1.5 : 0); root.add(tag); // back-row tags float higher so no number hides another
    root.visible = false; root.scale.setScalar(0.01);
    g.add(root);
    apples.push({ root, apple: a, baseScale: 1, ph: i * 0.7 });
  }
  return { group: g, apples };
}
