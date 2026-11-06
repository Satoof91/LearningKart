// Low-poly cartoon animals built from primitives (no external models, fully offline).
// Every animal faces +Z, stands on y = 0 and exposes update(t, mode) with mode 'idle' | 'happy'.
import * as THREE from 'three';

const TAU = Math.PI * 2;

// ---------- materials / geometry caches ----------
let GRAD = null;
function gradMap() {
  if (GRAD) return GRAD;
  GRAD = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;
  return GRAD;
}
const MATS = new Map();
export function toon(color, map) {
  const key = color + '|' + (map ? map.uuid : '');
  let m = MATS.get(key);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: gradMap(), map: map || null }); MATS.set(key, m); }
  return m;
}
const BASIC = new Map();
const basic = c => { let m = BASIC.get(c); if (!m) { m = new THREE.MeshBasicMaterial({ color: c }); BASIC.set(c, m); } return m; };

const SPH = new THREE.SphereGeometry(1, 18, 14);
const SPH_LO = new THREE.SphereGeometry(1, 10, 8);
const GEO = new Map();
function cyl(rt, rb, h, seg = 10) { const k = `c${rt}_${rb}_${h}_${seg}`; let g = GEO.get(k); if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg); GEO.set(k, g); } return g; }
function cone(r, h, seg = 10) { const k = `k${r}_${h}_${seg}`; let g = GEO.get(k); if (!g) { g = new THREE.ConeGeometry(r, h, seg); GEO.set(k, g); } return g; }

// ---------- procedural fur textures ----------
const TEX = new Map();
function canvasTex(key, w, h, draw) {
  let t = TEX.get(key); if (t) return t;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  TEX.set(key, t); return t;
}
const hex = n => '#' + n.toString(16).padStart(6, '0');
function stripes(base, stripe, n = 14) {
  return canvasTex(`st${base}_${stripe}`, 256, 128, (g, w, h) => {
    g.fillStyle = hex(base); g.fillRect(0, 0, w, h); g.fillStyle = hex(stripe);
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * w / n; g.beginPath(); g.moveTo(x - 4, 0);
      for (let y = 0; y <= h; y += 8) g.lineTo(x + Math.sin(y * 0.09 + i) * 5 - 4, y);
      for (let y = h; y >= 0; y -= 8) g.lineTo(x + Math.sin(y * 0.09 + i) * 5 + 4 + (y > h * 0.3 && y < h * 0.7 ? 3 : 0), y);
      g.fill();
    }
  });
}
function spots(base, spot, n = 40, size = 9, seed = 3) {
  return canvasTex(`sp${base}_${spot}_${n}`, 256, 128, (g, w, h) => {
    g.fillStyle = hex(base); g.fillRect(0, 0, w, h); g.fillStyle = hex(spot);
    let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = 10 + r() * (h - 20), rr = size * (0.6 + r() * 0.7);
      g.beginPath(); g.ellipse(x, y, rr * 1.2, rr, r() * 3, 0, TAU); g.fill();
    }
  });
}
function shellTex() {
  return canvasTex('shell', 256, 128, (g, w, h) => {
    g.fillStyle = '#3f8f3a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c9e86b'; g.lineWidth = 5; g.fillStyle = '#5aab47';
    const R = 18;
    for (let row = 0; row < 5; row++) for (let col = 0; col < 9; col++) {
      const cx = col * R * 1.75 + (row % 2) * R * 0.87, cy = row * R * 1.5 + 6;
      g.beginPath();
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; g.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95); }
      g.closePath(); g.fill(); g.stroke();
    }
  });
}

// ---------- building helpers ----------
function sph(parent, color, r, x, y, z, sx = 1, sy = 1, sz = 1, map, lo) {
  const m = new THREE.Mesh(lo ? SPH_LO : SPH, typeof color === 'object' ? color : toon(color, map));
  m.scale.set(r * sx, r * sy, r * sz); m.position.set(x, y, z); m.castShadow = true;
  parent.add(m); return m;
}
function mesh(parent, geo, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, typeof color === 'object' ? color : toon(color));
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m;
}
function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
// a limb hanging down from a pivot (so rotating the pivot swings it)
function limb(parent, color, rt, rb, len, x, y, z, foot, footR) {
  const g = group(parent, x, y, z);
  mesh(g, cyl(rt, rb, len), color, 0, -len / 2, 0);
  if (foot != null) { const f = footR || rb * 1.25; sph(g, foot, f, 0, -len + f * 0.25, f * 0.2, 1, 0.65, 1.25); }
  return g;
}
// big cute eyes; returns the eye groups (scaled on y to blink)
function eyes(parent, { r = 0.22, x = 0.3, y = 0.15, z = 0.7, iris = 0x1b1b1b, side = 0 } = {}) {
  const out = [];
  for (const s of [-1, 1]) {
    const g = group(parent, s * x, y, z);
    if (side) g.rotation.y = s * side;
    sph(g, 0xffffff, r, 0, 0, 0, 1, 1.08, 0.7);
    sph(g, basic(iris), r * 0.62, 0, -r * 0.05, r * 0.42, 1, 1.1, 0.6);
    sph(g, basic(0xffffff), r * 0.2, r * 0.22, r * 0.25, r * 0.75, 1, 1, 0.5, null, true);
    out.push(g);
  }
  return out;
}
function cheeks(parent, x, y, z, r = 0.14) { for (const s of [-1, 1]) sph(parent, 0xff9eb5, r, s * x, y, z, 1, 0.6, 0.4, null, true); }
function smile(parent, y, z, w = 0.18, color = 0x3b1f1f) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(w, w * 0.18, 6, 14, Math.PI), basic(color));
  m.position.set(0, y, z); m.rotation.z = Math.PI; parent.add(m); return m;
}

// ---------- animal class ----------
class Animal {
  constructor(id) {
    this.id = id; this.root = new THREE.Group(); this.root.name = 'animal:' + id;
    this.inner = group(this.root); // bounces / hops
    this.body = null; this.head = null; this.tail = null; this.legs = []; this.wings = []; this.ears = []; this.eyes = []; this.arms = [];
    this.extra = []; // [{obj, fn(t, happy)}]
    this.phase = Math.random() * 10; this.height = 4; this.hop = 0; this.kind = 'quad';
    this.blinkT = 2 + Math.random() * 3;
  }
  update(t, mode = 'idle', dt = 0.016) {
    const p = t + this.phase, happy = mode === 'happy';
    // blink
    this.blinkT -= dt;
    const blink = this.blinkT < 0.12 && this.blinkT > 0 ? 0.12 : 1;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3.5;
    for (const e of this.eyes) e.scale.y = blink;
    if (this.body) this.body.scale.y = 1 + Math.sin(p * 2.2) * 0.025;
    if (this.head) {
      this.head.rotation.y = happy ? Math.sin(p * 4) * 0.25 : Math.sin(p * 0.6) * 0.4;
      this.head.rotation.x = happy ? -0.15 + Math.sin(p * 8) * 0.12 : Math.sin(p * 1.3) * 0.07;
    }
    if (this.tail) { this.tail.rotation.y = Math.sin(p * (happy ? 14 : 5)) * (happy ? 0.7 : 0.35); }
    for (let i = 0; i < this.ears.length; i++) this.ears[i].rotation.z = (i ? -1 : 1) * Math.max(0, Math.sin(p * 1.7 + i) - 0.85) * 2.5;
    // wings
    for (let i = 0; i < this.wings.length; i++) {
      const s = i ? -1 : 1;
      this.wings[i].rotation.z = s * (happy ? 0.3 + Math.sin(p * 22) * 0.9 : 0.05 + Math.max(0, Math.sin(p * 0.9) - 0.8) * Math.sin(p * 30) * 2);
    }
    for (let i = 0; i < this.arms.length; i++) {
      const s = i ? -1 : 1;
      this.arms[i].rotation.z = happy ? s * (2.4 + Math.sin(p * 10 + i) * 0.4) : s * (0.15 + Math.sin(p * 1.4 + i) * 0.08);
      this.arms[i].rotation.x = happy ? 0 : Math.sin(p * 1.1 + i) * 0.15;
    }
    // body motion
    let y = 0;
    if (happy) {
      y = Math.abs(Math.sin(p * 5.5)) * (this.kind === 'bird' ? 1.0 : this.height * 0.22);
      this.inner.rotation.y = Math.sin(p * 2) * 0.3;
      for (let i = 0; i < this.legs.length; i++) this.legs[i].rotation.x = Math.sin(p * 11 + i * Math.PI) * 0.5;
    } else {
      this.inner.rotation.y *= 0.9;
      if (this.kind === 'hopper') { const h = Math.max(0, Math.sin(p * 1.6)); y = h > 0.6 ? (h - 0.6) * this.height * 0.5 : 0; }
      for (let i = 0; i < this.legs.length; i++) this.legs[i].rotation.x *= 0.85;
    }
    this.inner.position.y = y;
    for (const x of this.extra) x.fn(p, happy, x.obj);
  }
}

// ---------- quadruped template ----------
function quad(id, o) {
  const a = new Animal(id);
  const R = o.bodyR || 1, L = o.bodyL || 1.6, Y = o.bodyY || 2;
  const col = o.color, bodyMap = o.map || null;
  a.body = group(a.inner, 0, Y, 0);
  sph(a.body, col, R, 0, 0, 0, 1, o.bodySy || 0.92, L / R, bodyMap);
  if (o.belly != null) sph(a.body, o.belly, R * 0.82, 0, -R * 0.22, 0.05, 1, 0.8, L / R * 0.92);
  // legs
  const hipY = Y - R * 0.35;
  const lr = o.legR || 0.26;
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    a.legs.push(limb(a.inner, o.legColor ?? col, lr, lr * 0.85, hipY, sx * R * 0.55, hipY, sz * L * 0.62, o.foot ?? 0x4a3728, lr * 1.25));
  }
  // neck + head
  const tilt = o.neckTilt ?? 0.6, nl = o.neckL ?? 0.6, nr = o.neckR || R * 0.42;
  const nb = new THREE.Vector3(0, Y + R * 0.35, L * 0.72);
  if (nl > 0.05) {
    const neck = group(a.inner, nb.x, nb.y, nb.z); neck.rotation.x = tilt;
    mesh(neck, cyl(nr * 0.85, nr, nl + nr), o.neckColor ?? col, 0, nl / 2, 0).material = toon(o.neckColor ?? col, o.neckMap || bodyMap);
    if (o.mane === 'strip') for (let k = 0; k < 6; k++) mesh(neck, new THREE.BoxGeometry(0.16, 0.35, 0.35), o.maneColor, 0, k / 5 * nl + 0.1, -nr * 0.8);
  }
  const hr = o.headR || 0.7;
  const hp = nb.clone().add(new THREE.Vector3(0, Math.cos(tilt) * nl + hr * 0.3, Math.sin(tilt) * nl + hr * 0.2));
  a.head = group(a.inner, hp.x, hp.y, hp.z);
  const H = a.head;
  sph(H, o.headColor ?? col, hr, 0, 0, 0, 1, o.headSy || 0.95, o.headSz || 1.05);
  // snout
  const sl = o.snoutL ?? 0.55, sr = o.snoutR ?? hr * 0.55;
  if (sl > 0) {
    sph(H, o.snoutColor ?? o.belly ?? col, sr, 0, -hr * 0.28, hr * 0.62 + sl * 0.4, 1.05, 0.8, Math.max(1, sl / sr));
    sph(H, basic(o.nose ?? 0x2b1d1d), sr * 0.32, 0, -hr * 0.12, hr * 0.62 + sl * 0.4 + sr * Math.max(1, sl / sr) * 0.92, 1.25, 0.85, 0.8);
    smile(H, -hr * 0.45, hr * 0.62 + sl * 0.4 + sr * Math.max(1, sl / sr) * 0.7, sr * 0.35);
  }
  a.eyes = eyes(H, { r: hr * (o.eyeR || 0.3), x: hr * 0.42, y: hr * 0.22, z: hr * 0.72 });
  if (o.cheeks !== false) cheeks(H, hr * 0.62, -hr * 0.15, hr * 0.62, hr * 0.16);
  // ears
  const ec = o.earColor ?? col, ei = o.earInner ?? 0xffc2cf;
  for (const s of [1, -1]) {
    const e = group(H, s * hr * 0.6, hr * 0.62, -hr * 0.1);
    const type = o.ears || 'round';
    if (type === 'round') { sph(e, ec, hr * 0.32, 0, hr * 0.1, 0, 1, 1, 0.45); sph(e, ei, hr * 0.2, 0, hr * 0.1, hr * 0.08, 1, 1, 0.3); }
    else if (type === 'pointy') { e.rotation.z = -s * 0.35; mesh(e, cone(hr * 0.3, hr * 0.85, 8), ec, 0, hr * 0.38, 0); mesh(e, cone(hr * 0.17, hr * 0.55, 8), ei, 0, hr * 0.32, hr * 0.09); }
    else if (type === 'long') { e.rotation.z = -s * 0.25; sph(e, ec, hr * 0.2, 0, hr * 0.45, 0, 1, 2.6, 0.6); sph(e, ei, hr * 0.12, 0, hr * 0.45, hr * 0.06, 1, 2.3, 0.4); }
    else if (type === 'side') { e.position.set(s * hr * 0.92, hr * 0.25, -hr * 0.1); e.rotation.z = -s * 1.1; sph(e, ec, hr * 0.2, 0, hr * 0.3, 0, 1, 1.9, 0.55); sph(e, ei, hr * 0.12, 0, hr * 0.3, hr * 0.07, 1, 1.6, 0.4); }
    else if (type === 'floppy') { e.position.set(s * hr * 0.85, hr * 0.15, -hr * 0.05); e.rotation.z = s * 0.25; sph(e, ec, hr * 0.3, 0, -hr * 0.35, 0, 0.55, 1.4, 0.9); }
    else if (type === 'elephant') { e.position.set(s * hr * 0.95, 0, -hr * 0.2); e.rotation.y = s * 0.5; sph(e, ec, hr * 0.95, 0, 0, 0, 0.18, 1.05, 0.95); sph(e, ei, hr * 0.7, s * 0.06, 0, 0.02, 0.12, 0.95, 0.8); }
    a.ears.push(e);
  }
  // tail
  if (o.tail) {
    const t = group(a.inner, 0, Y + R * 0.25, -L * 0.95);
    const tc = o.tailColor ?? col, ty = o.tail;
    const tl = o.tailL || 1.3;
    const inner = group(t); inner.rotation.x = o.tailUp ?? -0.9;
    if (ty === 'thin' || ty === 'tuft') {
      const m = mesh(inner, cyl(0.07, 0.11, tl), tc, 0, 0, -tl / 2); m.rotation.x = Math.PI / 2;
      if (ty === 'tuft') sph(inner, o.tuftColor ?? 0x7a4a1f, 0.24, 0, 0, -tl, 1, 1, 1.4);
    } else if (ty === 'bushy') {
      sph(inner, tc, 0.45, 0, 0, -tl * 0.5, 0.9, 0.9, tl * 1.25); if (o.tipColor != null) sph(inner, o.tipColor, 0.3, 0, 0, -tl * 1.05, 1, 1, 1.1);
    } else if (ty === 'puff') { sph(inner, tc, 0.32, 0, 0, -0.15); }
    else if (ty === 'hair') { const m = mesh(inner, cone(0.35, tl, 8), tc, 0, 0, -tl / 2); m.rotation.x = -Math.PI / 2; }
    else if (ty === 'short') { const m = mesh(inner, cone(0.18, tl, 8), tc, 0, 0, -tl / 2); m.rotation.x = -Math.PI / 2; }
    a.tail = t;
  }
  a.height = hp.y + hr;
  return a;
}

// ---------- birds ----------
function bird(id, o) {
  const a = new Animal(id); a.kind = 'bird';
  const R = o.bodyR || 0.9, Y = o.bodyY || 1.4;
  a.body = group(a.inner, 0, Y, 0);
  sph(a.body, o.color, R, 0, 0, 0, 0.95, 0.95, 1.2);
  if (o.belly != null) sph(a.body, o.belly, R * 0.8, 0, -R * 0.15, R * 0.3, 0.9, 0.9, 0.9);
  for (const s of [1, -1]) a.legs.push(limb(a.inner, o.legColor ?? 0xf59f00, 0.07, 0.07, Y - R * 0.6, s * R * 0.35, Y - R * 0.6, 0.05, o.legColor ?? 0xf59f00, 0.16));
  // wings
  for (const s of [1, -1]) {
    const w = group(a.body, s * R * 0.85, R * 0.25, -R * 0.05);
    sph(w, o.wing ?? o.color, R * 0.55, s * R * 0.12, -R * 0.35, -R * 0.1, 0.32, 0.95, 1.25);
    if (o.wingStripe != null) for (let k = 0; k < 3; k++) sph(w, o.wingStripe, R * 0.16, s * R * 0.22, -R * 0.4 + k * 0.05, -R * 0.5 + k * R * 0.35, 0.4, 0.6, 1.2, null, true);
    a.wings.push(w);
  }
  // tail
  const t = group(a.body, 0, R * 0.1, -R * 1.05);
  if (o.fan) {
    // peacock fan
    const fan = group(t, 0, R * 0.5, -0.1); fan.rotation.x = -0.25;
    const n = 15;
    for (let k = 0; k < n; k++) {
      const ang = (k / (n - 1) - 0.5) * 2.4;
      const f = group(fan); f.rotation.z = ang;
      sph(f, 0x2b9348, 0.32, 0, 2.1, 0, 0.8, 2.6, 0.18);
      sph(f, 0x1e6091, 0.34, 0, 3.3, 0.06, 1, 1.15, 0.2);
      sph(f, 0x55a630, 0.24, 0, 3.3, 0.1, 1, 1.15, 0.2, null, true);
      sph(f, basic(0x0b1d51), 0.13, 0, 3.3, 0.14, 1, 1.15, 0.3, null, true);
    }
    a.extra.push({ obj: fan, fn: (p, happy, obj) => { obj.scale.setScalar(happy ? 1.05 + Math.sin(p * 9) * 0.05 : 1 + Math.sin(p * 0.7) * 0.03); } });
  } else {
    sph(t, o.tailColor ?? o.wing ?? o.color, R * 0.45, 0, 0, -R * 0.3, 0.9, 0.25, 1.3);
  }
  a.tail = t;
  // neck/head
  const hr = o.headR || R * 0.7;
  a.head = group(a.inner, 0, Y + R * (o.neckUp || 0.85) + hr * 0.4, R * 0.65);
  const H = a.head;
  if (o.neckUp > 1.2) mesh(a.inner, cyl(R * 0.3, R * 0.42, R * o.neckUp), o.headColor ?? o.color, 0, Y + R * o.neckUp * 0.5, R * 0.55, 0.15);
  sph(H, o.headColor ?? o.color, hr, 0, 0, 0);
  if (o.face != null) sph(H, o.face, hr * 0.75, 0, -hr * 0.05, hr * 0.38, 1, 0.9, 0.7);
  if (o.bill === 'duck') {
    sph(H, 0xff922b, hr * 0.5, 0, -hr * 0.22, hr * 1.0, 1.15, 0.38, 1.1);
  } else {
    const b = mesh(H, cone(hr * 0.26, hr * (o.beakL || 0.75), 8), o.beak ?? 0xffa94d, 0, -hr * 0.12, hr * 1.1, Math.PI / 2 + (o.hook ? 0.35 : 0), 0, 0);
    b.scale.y = 1;
  }
  a.eyes = eyes(H, { r: hr * 0.3, x: hr * 0.45, y: hr * 0.2, z: hr * 0.72 });
  cheeks(H, hr * 0.6, -hr * 0.2, hr * 0.62, hr * 0.15);
  if (o.crest === 'hoopoe') {
    const c = group(H, 0, hr * 0.7, -hr * 0.1);
    for (let k = 0; k < 7; k++) {
      const f = group(c); f.rotation.x = -0.9 + k * 0.28;
      sph(f, 0xf08c00, hr * 0.17, 0, hr * 0.7, 0, 0.7, 2.6, 0.5);
      sph(f, basic(0x111111), hr * 0.1, 0, hr * 1.12, 0, 0.8, 1, 0.5, null, true);
    }
    a.extra.push({ obj: c, fn: (p, happy, obj) => { obj.scale.y = happy ? 1.1 + Math.sin(p * 10) * 0.15 : 0.9 + Math.max(0, Math.sin(p * 0.8) - 0.5); } });
  }
  if (o.crest === 'peacock') for (let k = -1; k <= 1; k++) { mesh(H, cyl(0.03, 0.03, hr * 0.7, 5), 0x1e6091, k * 0.12, hr * 1.2, -0.05); sph(H, 0x1e6091, 0.11, k * 0.12, hr * 1.55, -0.05, 1, 1, 1, null, true); }
  if (o.brow) for (const s of [1, -1]) mesh(H, new THREE.BoxGeometry(hr * 0.42, hr * 0.1, hr * 0.12), o.brow, s * hr * 0.45, hr * 0.52, hr * 0.72, 0, 0, s * 0.25);
  a.height = Y + R + hr * 2;
  return a;
}

// ---------- upright (primates, kangaroo) ----------
function upright(id, o) {
  const a = new Animal(id); a.kind = o.hopper ? 'hopper' : 'upright';
  const R = o.bodyR || 0.95, Y = o.bodyY || 1.9;
  a.body = group(a.inner, 0, Y, 0);
  a.body.rotation.x = o.lean || 0;
  sph(a.body, o.color, R, 0, 0, 0, 1, 1.25, 0.9);
  if (o.belly != null) sph(a.body, o.belly, R * 0.75, 0, -R * 0.1, R * 0.32, 0.95, 1.15, 0.7);
  // legs / feet
  if (o.hopper) {
    for (const s of [1, -1]) {
      const l = group(a.inner, s * R * 0.6, Y - R * 0.7, 0);
      sph(l, o.color, R * 0.55, 0, 0, 0, 0.8, 1.2, 1.2);
      sph(l, o.color, R * 0.3, 0, -Y + R * 0.95, R * 0.45, 0.9, 0.5, 2.3);
      a.legs.push(l);
    }
  } else {
    for (const s of [1, -1]) a.legs.push(limb(a.inner, o.color, 0.28, 0.24, Y - R * 0.8, s * R * 0.5, Y - R * 0.8, 0, o.hand ?? o.face, 0.34));
  }
  // arms
  const armL = o.armL || 1.6;
  for (const s of [1, -1]) a.arms.push(limb(a.body, o.color, 0.22, 0.2, armL, s * R * 0.95, R * 0.75, 0.1, o.hand ?? o.face, 0.26));
  // head
  const hr = o.headR || 0.8;
  a.head = group(a.inner, 0, Y + R * 1.2 + hr * 0.75, o.headZ || 0.1);
  const H = a.head;
  sph(H, o.color, hr, 0, 0, 0);
  if (o.face != null) {
    sph(H, o.face, hr * 0.78, 0, -hr * 0.05, hr * 0.38, 1.05, 0.95, 0.75);
    sph(H, o.face, hr * 0.45, 0, -hr * 0.38, hr * 0.78, 1.25, 0.8, 0.8);
  }
  if (o.snoutL) { sph(H, o.color, hr * 0.42, 0, -hr * 0.2, hr * 0.85, 0.9, 0.8, 1.5); sph(H, basic(0x222222), hr * 0.14, 0, -hr * 0.05, hr * 1.45, 1.3, 0.9, 1); }
  else sph(H, basic(0x3b2b2b), hr * 0.1, 0, -hr * 0.28, hr * 1.1, 1.4, 0.8, 0.6);
  smile(H, -hr * 0.52, hr * (o.snoutL ? 1.1 : 1.08), hr * 0.18);
  a.eyes = eyes(H, { r: hr * 0.26, x: hr * 0.36, y: hr * 0.16, z: hr * 0.76 });
  cheeks(H, hr * 0.62, -hr * 0.25, hr * 0.62, hr * 0.15);
  for (const s of [1, -1]) {
    const e = group(H, s * hr * (o.longEars ? 0.45 : 0.98), o.longEars ? hr * 0.75 : hr * 0.05, -hr * 0.05);
    if (o.longEars) { e.rotation.z = -s * 0.2; sph(e, o.color, hr * 0.22, 0, hr * 0.5, 0, 1, 2.6, 0.55); sph(e, 0xffc2cf, hr * 0.13, 0, hr * 0.5, hr * 0.06, 1, 2.3, 0.4); }
    else { sph(e, o.color, hr * 0.33, 0, 0, 0, 0.5, 1, 1); sph(e, o.face ?? 0xffc2cf, hr * 0.22, s * 0.05, 0, 0.03, 0.4, 0.95, 0.9); }
    a.ears.push(e);
  }
  // tails
  if (o.tail === 'curl') {
    const t = group(a.inner, 0, Y - R * 0.6, -R * 0.75);
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.13, 8, 20, Math.PI * 1.6), toon(o.color));
    m.rotation.y = Math.PI / 2; m.position.set(0, 0.7, -0.6); m.castShadow = true; t.add(m);
    a.tail = t;
  } else if (o.tail === 'kangaroo') {
    const t = group(a.inner, 0, Y - R * 0.6, -R * 0.6);
    const m = mesh(t, cone(0.42, 2.8, 10), o.color, 0, -0.75, -1.2, -Math.PI / 2 - 0.45); m.scale.set(1, 1, 0.8);
    a.tail = t;
  }
  if (o.joey) {
    const j = group(a.body, 0, -R * 0.35, R * 0.78);
    sph(j, o.belly, R * 0.36, 0, -R * 0.2, 0, 1.1, 0.6, 0.5);
    const jh = group(j, 0, R * 0.12, 0.05);
    sph(jh, o.color, 0.27, 0, 0, 0);
    sph(jh, o.color, 0.13, 0, -0.05, 0.23, 0.9, 0.8, 1.3);
    eyes(jh, { r: 0.08, x: 0.11, y: 0.06, z: 0.2 });
    for (const s of [1, -1]) sph(jh, o.color, 0.07, s * 0.12, 0.3, 0, 1, 2.2, 0.5);
    a.extra.push({ obj: jh, fn: (p, happy, obj) => { obj.position.y = R * 0.12 + Math.max(0, Math.sin(p * 0.8)) * 0.18; obj.rotation.y = Math.sin(p * 1.6) * 0.5; } });
  }
  a.height = Y + R * 1.2 + hr * 2;
  return a;
}

// ---------- specials ----------
function crocodile() {
  const a = new Animal('crocodile'); a.kind = 'low';
  const G = 0x52b788, D = 0x2d6a4f, Bel = 0xd8f3dc;
  a.body = group(a.inner, 0, 0.75, 0);
  sph(a.body, G, 0.85, 0, 0, 0, 1.15, 0.6, 2.2);
  sph(a.body, Bel, 0.75, 0, -0.18, 0, 1.05, 0.45, 2.0);
  for (let k = 0; k < 6; k++) mesh(a.body, cone(0.16, 0.35, 5), D, 0, 0.5, -1.4 + k * 0.55);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const l = group(a.inner, sx * 0.85, 0.55, sz * 1.1); l.rotation.z = sx * 0.6;
    mesh(l, cyl(0.2, 0.18, 0.7), G, 0, -0.3, 0); sph(l, D, 0.24, 0, -0.62, 0.12, 1, 0.5, 1.4);
    a.legs.push(l);
  }
  // tail segments
  const t = group(a.inner, 0, 0.75, -1.7); a.tail = t;
  let par = t;
  for (let k = 0; k < 3; k++) {
    const seg = group(par, 0, 0, k === 0 ? 0 : -0.9);
    sph(seg, G, 0.55 - k * 0.14, 0, -0.05 * k, -0.45, 0.9, 0.55, 1.15);
    mesh(seg, cone(0.12, 0.28, 5), D, 0, 0.32 - k * 0.08, -0.45);
    par = seg;
  }
  const H = a.head = group(a.inner, 0, 0.95, 1.85);
  sph(H, G, 0.7, 0, 0, 0, 1, 0.65, 1);
  sph(H, G, 0.5, 0, -0.12, 0.95, 1, 0.42, 1.5);
  sph(H, Bel, 0.45, 0, -0.3, 0.9, 0.95, 0.2, 1.4);
  for (let k = 0; k < 5; k++) for (const s of [1, -1]) mesh(H, cone(0.05, 0.14, 4), 0xffffff, s * 0.38, -0.33, 0.45 + k * 0.28, Math.PI);
  for (const s of [1, -1]) sph(H, basic(0x1b4332), 0.05, s * 0.15, 0.07, 1.68, 1, 1, 1, null, true);
  for (const s of [1, -1]) sph(H, G, 0.3, s * 0.3, 0.38, 0.15, 1, 0.8, 1);
  a.eyes = eyes(H, { r: 0.22, x: 0.3, y: 0.5, z: 0.28, iris: 0x2b2b00 });
  cheeks(H, 0.55, -0.05, 0.5, 0.12);
  a.extra.push({ obj: H, fn: (p, happy, obj) => { obj.rotation.x = happy ? -0.25 - Math.abs(Math.sin(p * 9)) * 0.25 : -Math.max(0, Math.sin(p * 0.7) - 0.7) * 1.2; } });
  a.height = 2; return a;
}
function turtle() {
  const a = new Animal('turtle'); a.kind = 'low';
  const S = 0x74c69d;
  a.body = group(a.inner, 0, 0.75, 0);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 12, 0, TAU, 0, Math.PI / 2), toon(0xffffff, shellTex()));
  shell.scale.set(1, 0.85, 1.15); shell.castShadow = true; a.body.add(shell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.12, 6, 24), toon(0xc9e86b)); rim.rotation.x = Math.PI / 2; rim.scale.set(1, 1.15, 1); a.body.add(rim);
  sph(a.body, 0xe9d8a6, 1.2, 0, -0.05, 0, 1, 0.2, 1.12);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) a.legs.push(limb(a.inner, S, 0.26, 0.24, 0.55, sx * 0.85, 0.55, sz * 0.85, S, 0.3));
  const H = a.head = group(a.inner, 0, 1.0, 1.6);
  mesh(a.inner, cyl(0.28, 0.32, 0.8), S, 0, 0.8, 1.25, 1.2);
  sph(H, S, 0.55, 0, 0, 0, 1, 0.9, 1.1);
  a.eyes = eyes(H, { r: 0.18, x: 0.25, y: 0.12, z: 0.42 });
  smile(H, -0.18, 0.56, 0.14); cheeks(H, 0.38, -0.08, 0.4, 0.1);
  const t = group(a.inner, 0, 0.7, -1.45); mesh(t, cone(0.15, 0.45, 6), S, 0, 0, -0.15, -Math.PI / 2); a.tail = t;
  a.height = 2.2; return a;
}
function frog() {
  const a = new Animal('frog'); a.kind = 'hopper';
  const G = 0x80ed99, D = 0x38b000, Bel = 0xf1faee;
  a.body = group(a.inner, 0, 1.0, 0);
  sph(a.body, G, 1.1, 0, 0, 0, 1.15, 0.8, 1.0);
  sph(a.body, Bel, 0.9, 0, -0.2, 0.35, 1.05, 0.7, 0.75);
  for (let k = 0; k < 4; k++) sph(a.body, D, 0.16, (k % 2 ? 1 : -1) * 0.45, 0.65, -0.3 + k * 0.15, 1, 0.4, 1, null, true);
  for (const s of [1, -1]) {
    const back = group(a.inner, s * 0.95, 0.55, -0.35);
    sph(back, G, 0.55, 0, 0, 0, 0.7, 0.6, 1.25);
    sph(back, D, 0.3, s * 0.1, -0.45, 0.55, 1.1, 0.35, 1.6);
    a.legs.push(back);
    const front = limb(a.inner, G, 0.16, 0.14, 0.7, s * 0.6, 0.7, 0.75, D, 0.22); a.legs.push(front);
  }
  // eyes on top
  const H = a.head = group(a.inner, 0, 1.45, 0.45);
  for (const s of [1, -1]) sph(H, G, 0.42, s * 0.48, 0.25, 0, 1, 1, 1);
  a.eyes = eyes(H, { r: 0.34, x: 0.48, y: 0.32, z: 0.18 });
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 20, Math.PI), basic(0x1b4332)); m.rotation.z = Math.PI; m.position.set(0, -0.15, 0.95); m.scale.set(1, 0.5, 1); H.add(m);
  cheeks(H, 0.75, -0.2, 0.75, 0.16);
  a.height = 2.4; return a;
}
function elephant() {
  const a = quad('elephant', { color: 0xa5b4c8, bodyR: 1.7, bodyL: 2.2, bodyY: 2.9, legR: 0.55, foot: 0xd0d8e4, neckL: 0, neckTilt: 0.2, headR: 1.3, snoutL: 0, ears: 'elephant', earInner: 0xf7c6d0, tail: 'thin', tailL: 1.0, tuftColor: 0x5c677d, cheeks: true });
  const H = a.head;
  // trunk
  let par = group(H, 0, -0.3, 1.25); const segs = [];
  for (let k = 0; k < 6; k++) {
    const r = 0.36 - k * 0.04;
    const seg = group(par, 0, k === 0 ? 0 : -0.42, 0); seg.rotation.x = -0.12;
    mesh(seg, cyl(r, r - 0.03, 0.48), 0x97a6bb, 0, -0.2, 0); segs.push(seg); par = seg;
  }
  sph(par, 0x8d99ae, 0.22, 0, -0.45, 0, 1, 0.6, 1);
  for (const s of [1, -1]) mesh(H, cone(0.13, 0.75, 8), 0xfffbf0, s * 0.45, -0.6, 0.95, 2.2);
  a.extra.push({ obj: segs, fn: (p, happy, obj) => { obj.forEach((s, i) => { s.rotation.x = happy ? -0.5 - i * 0.04 + Math.sin(p * 8) * 0.1 : -0.12 + Math.sin(p * 1.4 - i * 0.5) * 0.08; s.rotation.z = Math.sin(p * 0.9 - i * 0.4) * 0.08; }); } });
  a.height = 6; return a;
}

// ---------- catalogue ----------
const BUILDERS = {
  lion: () => {
    const a = quad('lion', { color: 0xf2b84b, belly: 0xffe1a8, bodyR: 1.15, bodyL: 1.7, bodyY: 2.1, neckL: 0.25, headR: 0.95, snoutL: 0.35, snoutColor: 0xffe8c2, ears: 'round', earColor: 0xe09f3e, tail: 'tuft', tailL: 1.5, tailUp: -0.4, tuftColor: 0xb5651d });
    const H = a.head;
    sph(H, 0xc56a1c, 1.2, 0, 0.05, -0.45, 1.1, 1.1, 0.7);
    for (let k = 0; k < 12; k++) { const t = k / 12 * TAU; sph(H, k % 2 ? 0xd9822b : 0xb5651d, 0.42, Math.cos(t) * 1.0, Math.sin(t) * 1.0 + 0.05, -0.15, 1, 1, 0.75, null, true); }
    return a;
  },
  duck: () => bird('duck', { color: 0xfff3b0, belly: 0xffffff, wing: 0xffe066, headColor: 0xffe066, bodyR: 1.05, bodyY: 1.3, bill: 'duck', tailColor: 0xffe066, neckUp: 0.8 }),
  crocodile,
  fox: () => quad('fox', { color: 0xf3722c, belly: 0xffffff, bodyR: 0.8, bodyL: 1.25, bodyY: 1.45, legR: 0.18, legColor: 0x5a2d0c, foot: 0x3b1f0b, neckL: 0.35, headR: 0.72, snoutL: 0.65, snoutR: 0.32, snoutColor: 0xffffff, ears: 'pointy', earInner: 0x3b1f0b, tail: 'bushy', tailL: 1.6, tailUp: 0.15, tipColor: 0xffffff }),
  camel: () => {
    const a = quad('camel', { color: 0xd4a373, belly: 0xe9c89b, bodyR: 1.2, bodyL: 1.7, bodyY: 3.0, legR: 0.26, foot: 0xa47148, neckL: 1.9, neckTilt: 0.85, neckR: 0.42, headR: 0.62, snoutL: 0.7, snoutR: 0.36, snoutColor: 0xe9c89b, ears: 'side', earInner: 0xb08968, tail: 'thin', tailL: 1.0, tuftColor: 0x7f5539 });
    sph(a.body, 0xc6905e, 0.85, 0, 1.0, 0.1, 1, 0.9, 1.1);
    return a;
  },
  horse: () => quad('horse', { color: 0xa0522d, belly: 0xc77d4f, bodyR: 1.05, bodyL: 1.75, bodyY: 2.8, legR: 0.24, foot: 0x2b1d14, neckL: 1.2, neckTilt: 0.45, neckR: 0.42, headR: 0.62, snoutL: 0.9, snoutR: 0.38, snoutColor: 0xf1d2b6, ears: 'pointy', earInner: 0x5c3b2a, tail: 'hair', tailL: 1.8, tailUp: -1.1, tailColor: 0x3b2416, mane: 'strip', maneColor: 0x3b2416 }),
  sheep: () => {
    const a = quad('sheep', { color: 0xfdfdfd, bodyR: 1.15, bodyL: 1.4, bodyY: 1.85, legR: 0.18, legColor: 0x3d3d3d, foot: 0x222222, neckL: 0.25, headR: 0.7, headColor: 0x4a4a4a, snoutL: 0.3, snoutColor: 0x5a5a5a, nose: 0x111111, ears: 'side', earColor: 0x4a4a4a, earInner: 0xff9eb5, tail: 'puff' });
    for (let k = 0; k < 22; k++) { const t = k * 2.4, y = Math.sin(k * 1.7) * 0.6; sph(a.body, 0xffffff, 0.5, Math.cos(t) * 1.0, y + 0.2, Math.sin(t) * 1.3, 1, 1, 1, null, true); }
    for (let k = 0; k < 5; k++) sph(a.head, 0xffffff, 0.28, (k - 2) * 0.18, 0.62, -0.05 + (k % 2) * 0.1, 1, 1, 1, null, true);
    return a;
  },
  bear: () => quad('bear', { color: 0x8b5a2b, belly: 0xc49a6c, bodyR: 1.35, bodyL: 1.55, bodyY: 1.95, legR: 0.4, foot: 0x5c3a1a, neckL: 0.15, headR: 1.0, snoutL: 0.45, snoutR: 0.45, snoutColor: 0xd9b48f, ears: 'round', earInner: 0xd9b48f, tail: 'puff' }),
  wolf: () => quad('wolf', { color: 0x8d99ae, belly: 0xedf2f4, bodyR: 0.9, bodyL: 1.4, bodyY: 1.75, legR: 0.2, foot: 0x5c677d, neckL: 0.4, headR: 0.75, snoutL: 0.7, snoutR: 0.34, snoutColor: 0xedf2f4, ears: 'pointy', earInner: 0x5c677d, tail: 'bushy', tailL: 1.5, tailUp: -0.3, tipColor: 0x5c677d }),
  reindeer: () => {
    const a = quad('reindeer', { color: 0x9c6644, belly: 0xede0d4, bodyR: 1.0, bodyL: 1.5, bodyY: 2.4, legR: 0.2, foot: 0x3b2416, neckL: 0.9, neckTilt: 0.4, neckR: 0.38, headR: 0.62, snoutL: 0.55, snoutR: 0.32, snoutColor: 0xede0d4, nose: 0xe63946, ears: 'side', earInner: 0xe6ccb2, tail: 'puff', tailColor: 0xffffff });
    for (const s of [1, -1]) {
      const an = group(a.head, s * 0.3, 0.5, -0.05); an.rotation.z = -s * 0.35;
      mesh(an, cyl(0.06, 0.08, 1.3, 6), 0x7f5539, 0, 0.65, 0);
      for (let k = 0; k < 3; k++) { const br = group(an, 0, 0.35 + k * 0.35, 0); br.rotation.set(0.7, 0, -s * 0.6); mesh(br, cyl(0.04, 0.06, 0.55, 5), 0x7f5539, 0, 0.27, 0); }
    }
    return a;
  },
  giraffe: () => {
    const sp = spots(0xffd166, 0xc2721e, 46, 10, 7);
    const a = quad('giraffe', { color: 0xffd166, map: sp, neckMap: sp, belly: null, bodyR: 1.1, bodyL: 1.4, bodyY: 3.6, legR: 0.22, foot: 0x6b3e1a, neckL: 3.2, neckTilt: 0.3, neckR: 0.38, headR: 0.62, snoutL: 0.6, snoutR: 0.34, snoutColor: 0xffe8a3, ears: 'side', earInner: 0xffb703, tail: 'tuft', tailL: 1.2, tuftColor: 0x6b3e1a });
    for (const s of [1, -1]) { mesh(a.head, cyl(0.07, 0.08, 0.5, 6), 0xd08c3f, s * 0.22, 0.75, -0.1); sph(a.head, 0x6b3e1a, 0.12, s * 0.22, 1.0, -0.1); }
    return a;
  },
  turtle,
  chimp: () => upright('chimp', { color: 0x4a3426, face: 0xe7c8a0, belly: 0x6b4c3b, bodyR: 0.95, bodyY: 1.9, headR: 0.82, armL: 1.9, lean: 0.12 }),
  falcon: () => bird('falcon', { color: 0x8d6e63, belly: 0xf5ebe0, wing: 0x6d4c41, wingStripe: 0x3e2723, headColor: 0x5d4037, face: 0xfff3e0, beak: 0xffc107, hook: true, beakL: 0.6, bodyR: 1.0, bodyY: 1.55, brow: 0x3e2723, tailColor: 0x6d4c41 }),
  frog,
  peacock: () => bird('peacock', { color: 0x1e6091, belly: 0x168aad, wing: 0x99582a, headColor: 0x1a759f, beak: 0xe9c46a, bodyR: 0.95, bodyY: 1.6, neckUp: 1.6, fan: true, crest: 'peacock' }),
  deer: () => {
    const sp = spots(0xc68b59, 0xfff4e0, 30, 6, 11);
    const a = quad('deer', { color: 0xc68b59, map: sp, belly: 0xfff4e0, bodyR: 0.85, bodyL: 1.3, bodyY: 2.1, legR: 0.16, foot: 0x3b2416, neckL: 0.8, neckTilt: 0.35, neckR: 0.3, headR: 0.6, snoutL: 0.5, snoutR: 0.28, snoutColor: 0xfff4e0, ears: 'side', earInner: 0xffc8a8, tail: 'puff', tailColor: 0xffffff });
    for (const s of [1, -1]) { const h = mesh(a.head, cone(0.07, 0.7, 6), 0x3b2416, s * 0.22, 0.85, -0.1, -0.25, 0, -s * 0.12); h.castShadow = true; }
    return a;
  },
  sparrow: () => {
    const a = bird('sparrow', { color: 0xc58b52, belly: 0xf1e3cf, wing: 0x8a5a2b, wingStripe: 0xfff1d6, headColor: 0x9a6a3c, face: 0xd9d4ce, beak: 0x3d3d3d, beakL: 0.45, bodyR: 0.8, bodyY: 1.15 });
    sph(a.head, basic(0x222222), 0.22, 0, -0.42, 0.42, 1.2, 0.7, 0.6);
    sph(a.head, 0x6b3e1a, 0.4, 0, 0.32, -0.05, 1.05, 0.55, 1.1);
    return a;
  },
  gazelle: () => {
    const a = quad('gazelle', { color: 0xe0a96d, belly: 0xffffff, bodyR: 0.85, bodyL: 1.35, bodyY: 2.2, legR: 0.15, foot: 0x2b1d14, neckL: 0.9, neckTilt: 0.35, neckR: 0.3, headR: 0.58, snoutL: 0.5, snoutR: 0.27, snoutColor: 0xffffff, ears: 'side', earInner: 0xffd6b0, tail: 'short', tailL: 0.5, tailColor: 0x2b1d14 });
    sph(a.body, 0x6f4518, 0.86, 0, -0.18, 0, 1.01, 0.12, 1.5, null, true);
    for (const s of [1, -1]) {
      const h = group(a.head, s * 0.2, 0.5, -0.1); h.rotation.set(-0.5, 0, -s * 0.1);
      mesh(h, cyl(0.05, 0.08, 0.7, 6), 0x2b1d14, 0, 0.35, 0);
      const h2 = group(h, 0, 0.7, 0); h2.rotation.x = 0.8; mesh(h2, cone(0.05, 0.6, 6), 0x2b1d14, 0, 0.3, 0);
    }
    return a;
  },
  elephant,
  monkey: () => upright('monkey', { color: 0xa0522d, face: 0xf4d1ae, belly: 0xe7b98b, bodyR: 0.75, bodyY: 1.5, headR: 0.75, armL: 1.4, tail: 'curl' }),
  kangaroo: () => upright('kangaroo', { color: 0xc8875a, belly: 0xf0d2b0, bodyR: 1.05, bodyY: 2.4, headR: 0.6, headZ: 0.35, snoutL: true, longEars: true, armL: 0.9, lean: 0.25, hopper: true, tail: 'kangaroo', joey: true, hand: 0x9c6644 }),
  llama: () => {
    const a = quad('llama', { color: 0xfff1e6, belly: 0xffffff, bodyR: 1.05, bodyL: 1.4, bodyY: 2.5, legR: 0.22, foot: 0x6c584c, neckL: 1.7, neckTilt: 0.1, neckR: 0.42, headR: 0.6, snoutL: 0.45, snoutR: 0.33, snoutColor: 0xf5e1d0, ears: 'long', earInner: 0xd6b8a8, tail: 'puff' });
    // colorful blanket
    sph(a.body, 0xff6b6b, 1.07, 0, 0.1, 0, 1, 0.75, 0.75, stripes(0xff6b6b, 0xffd166, 10));
    for (let k = 0; k < 4; k++) sph(a.head, 0xffffff, 0.22, (k - 1.5) * 0.18, 0.55, 0, 1, 1, 1, null, true);
    return a;
  },
  goat: () => {
    const a = quad('goat', { color: 0xf8f9fa, belly: 0xe9ecef, bodyR: 0.95, bodyL: 1.3, bodyY: 1.95, legR: 0.18, foot: 0x495057, neckL: 0.55, neckTilt: 0.45, headR: 0.6, snoutL: 0.45, snoutR: 0.3, snoutColor: 0xdee2e6, ears: 'side', earInner: 0xffc2cf, tail: 'short', tailL: 0.4, tailUp: 0.9 });
    for (const s of [1, -1]) {
      const h = group(a.head, s * 0.22, 0.45, -0.05); h.rotation.set(-0.7, 0, -s * 0.2);
      mesh(h, cyl(0.05, 0.1, 0.55, 6), 0x8d6e63, 0, 0.27, 0);
      const h2 = group(h, 0, 0.55, 0); h2.rotation.x = -1.1; mesh(h2, cone(0.05, 0.45, 6), 0x8d6e63, 0, 0.22, 0);
    }
    mesh(a.head, cone(0.12, 0.5, 6), 0xdee2e6, 0, -0.75, 0.75, Math.PI);
    return a;
  },
  tiger: () => {
    const st = stripes(0xf77f00, 0x1b1b1b, 16);
    return quad('tiger', { color: 0xf77f00, map: st, belly: 0xffffff, bodyR: 1.1, bodyL: 1.75, bodyY: 2.0, legR: 0.3, foot: 0xffffff, neckL: 0.25, headR: 0.95, headColor: 0xf77f00, snoutL: 0.35, snoutColor: 0xffffff, ears: 'round', earInner: 0x1b1b1b, tail: 'thin', tailL: 1.8, tailUp: -0.2, tailColor: 0xf77f00 });
  },
  hoopoe: () => bird('hoopoe', { color: 0xe9a15b, belly: 0xf7d6a8, wing: 0x1b1b1b, wingStripe: 0xffffff, headColor: 0xf08c00, beak: 0x343a40, beakL: 1.1, bodyR: 0.9, bodyY: 1.3, crest: 'hoopoe', tailColor: 0x1b1b1b }),
  rhino: () => {
    const a = quad('rhino', { color: 0x9aa5b1, belly: 0xb8c2cc, bodyR: 1.45, bodyL: 2.0, bodyY: 2.1, legR: 0.45, foot: 0x6c757d, neckL: 0.1, neckTilt: 0.9, headR: 0.95, snoutL: 0.9, snoutR: 0.55, snoutColor: 0xb8c2cc, ears: 'pointy', earInner: 0xd6a2ad, tail: 'thin', tailL: 0.8, tuftColor: 0x495057 });
    mesh(a.head, cone(0.3, 1.0, 8), 0xf1ece2, 0, 0.35, 1.45, 0.35);
    mesh(a.head, cone(0.18, 0.5, 8), 0xf1ece2, 0, 0.35, 0.95, 0.2);
    return a;
  },
  dove: () => bird('dove', { color: 0xf1f3f5, belly: 0xffffff, wing: 0xdee2e6, wingStripe: 0xadb5bd, headColor: 0xe9ecef, beak: 0xff8787, beakL: 0.45, bodyR: 0.9, bodyY: 1.25, legColor: 0xff8787 }),
  // ---- animals for the English alphabet ----
  iguana: () => lizard('iguana', { color: 0x52b788, belly: 0xb7e4c7, dark: 0x2d6a4f, spikes: true, dewlap: 0xf4a261 }),
  newt: () => lizard('newt', { color: 0xff8c42, belly: 0xffd166, dark: 0x9d4400, map: spots(0xff8c42, 0x6a2c00, 26, 6, 21) }),
  jaguar: () => quad('jaguar', { color: 0xf4a261, map: spots(0xf4a261, 0x3d2b1f, 60, 8, 5), belly: 0xfff3e0, bodyR: 1.05, bodyL: 1.7, bodyY: 1.9, legR: 0.28, foot: 0xfff3e0, neckL: 0.25, headR: 0.9, headColor: 0xf4a261, snoutL: 0.35, snoutColor: 0xfff3e0, ears: 'round', earInner: 0x3d2b1f, tail: 'thin', tailL: 1.8, tailUp: -0.2, tailColor: 0xe76f51 }),
  zebra: () => {
    const st = stripes(0xffffff, 0x1b1b1b, 18);
    return quad('zebra', { color: 0xffffff, map: st, neckMap: st, belly: null, bodyR: 1.0, bodyL: 1.65, bodyY: 2.6, legR: 0.22, foot: 0x1b1b1b, neckL: 1.1, neckTilt: 0.45, neckR: 0.4, headR: 0.6, snoutL: 0.85, snoutR: 0.36, snoutColor: 0x343a40, nose: 0x111111, ears: 'pointy', earInner: 0x1b1b1b, tail: 'tuft', tailL: 1.4, tailUp: -1.1, tailColor: 0xffffff, tuftColor: 0x1b1b1b, mane: 'strip', maneColor: 0x1b1b1b });
  },
  unicorn: () => {
    const a = quad('unicorn', { color: 0xfdf6ff, belly: 0xffffff, bodyR: 1.0, bodyL: 1.7, bodyY: 2.7, legR: 0.23, foot: 0xffd166, neckL: 1.15, neckTilt: 0.45, neckR: 0.41, headR: 0.62, snoutL: 0.85, snoutR: 0.37, snoutColor: 0xffe5ec, ears: 'pointy', earInner: 0xffafcc, tail: 'hair', tailL: 1.9, tailUp: -1.0, tailColor: 0xc77dff, mane: 'strip', maneColor: 0xff70a6 });
    const horn = group(a.head, 0, 0.55, 0.3); horn.rotation.x = 0.45;
    mesh(horn, cone(0.13, 0.95, 10), 0xffd166, 0, 0.45, 0);
    for (let k = 0; k < 3; k++) mesh(horn, cyl(0.1 - k * 0.025, 0.11 - k * 0.025, 0.05, 10), 0xfff3b0, 0, 0.15 + k * 0.25, 0);
    return a;
  },
  ox: () => {
    const a = quad('ox', { color: 0x8d5524, belly: 0xc68b59, bodyR: 1.3, bodyL: 1.8, bodyY: 2.1, legR: 0.34, foot: 0x3b2416, neckL: 0.2, neckTilt: 0.9, headR: 0.85, snoutL: 0.4, snoutR: 0.45, snoutColor: 0xe6ccb2, nose: 0x5c3b2a, ears: 'side', earInner: 0xd4a373, tail: 'tuft', tailL: 1.3, tailUp: -1.2, tuftColor: 0x3b2416 });
    for (const s of [1, -1]) {
      const h = group(a.head, s * 0.55, 0.45, -0.05); h.rotation.z = -s * 1.25;
      mesh(h, cyl(0.07, 0.14, 0.7, 8), 0xf1e3c8, 0, 0.35, 0);
      const t = group(h, 0, 0.7, 0); t.rotation.z = s * 1.1; mesh(t, cone(0.07, 0.4, 8), 0xf1e3c8, 0, 0.2, 0);
    }
    return a;
  },
  yak: () => {
    const a = quad('yak', { color: 0x3d2b1f, belly: 0x5c4033, bodyR: 1.35, bodyL: 1.6, bodyY: 2.0, legR: 0.33, legColor: 0x2b1d14, foot: 0x1b1b1b, neckL: 0.15, neckTilt: 0.9, headR: 0.8, snoutL: 0.35, snoutR: 0.4, snoutColor: 0x6f4e37, ears: 'side', earInner: 0x6f4e37, tail: 'hair', tailL: 1.3, tailUp: -1.2, tailColor: 0x2b1d14 });
    // long shaggy coat hanging down
    for (let k = 0; k < 16; k++) { const t = k / 16 * TAU; sph(a.body, 0x4a3426, 0.42, Math.cos(t) * 1.15, -0.9, Math.sin(t) * 1.45, 0.9, 1.5, 0.9, null, true); }
    sph(a.head, 0x4a3426, 0.55, 0, 0.55, -0.1, 1.3, 0.6, 1);
    for (const s of [1, -1]) {
      const h = group(a.head, s * 0.5, 0.5, -0.05); h.rotation.z = -s * 1.0;
      mesh(h, cyl(0.06, 0.12, 0.6, 8), 0xf1e3c8, 0, 0.3, 0);
      const t = group(h, 0, 0.6, 0); t.rotation.z = s * 1.3; mesh(t, cone(0.06, 0.45, 8), 0xf1e3c8, 0, 0.22, 0);
    }
    return a;
  },
  owl: () => {
    const a = bird('owl', { color: 0x8d6e63, belly: 0xefebe9, wing: 0x6d4c41, wingStripe: 0xd7ccc8, headColor: 0x8d6e63, face: 0xf5e6d3, beak: 0xf9a825, hook: true, beakL: 0.4, bodyR: 1.0, bodyY: 1.3, headR: 0.85, neckUp: 0.55, tailColor: 0x6d4c41 });
    const H = a.head, hr = 0.85;
    for (const s of [1, -1]) {
      sph(H, 0xffb703, hr * 0.42, s * hr * 0.45, hr * 0.2, hr * 0.6, 1, 1, 0.35);   // big round eye rings
      const t = group(H, s * hr * 0.55, hr * 0.8, 0); t.rotation.z = -s * 0.35; mesh(t, cone(hr * 0.17, hr * 0.55, 6), 0x6d4c41, 0, hr * 0.2, 0);
    }
    return a;
  },
  quail: () => {
    const a = bird('quail', { color: 0xa47148, belly: 0xe6ccb2, wing: 0x7f5539, wingStripe: 0xfff1e6, headColor: 0x7f5539, face: 0xffffff, beak: 0x343a40, beakL: 0.4, bodyR: 0.85, bodyY: 1.0 });
    const plume = group(a.head, 0, 0.55, 0.15); plume.rotation.x = 0.6;
    sph(plume, 0x1b1b1b, 0.13, 0, 0.25, 0, 0.8, 2.0, 0.8);
    return a;
  },
  vulture: () => {
    const a = bird('vulture', { color: 0x3e3e3e, belly: 0x5a5a5a, wing: 0x2b2b2b, wingStripe: 0x8a8a8a, headColor: 0xf4a3a3, beak: 0xf1e3c8, hook: true, beakL: 0.65, bodyR: 1.1, bodyY: 1.6, neckUp: 1.3, tailColor: 0x2b2b2b });
    sph(a.body, 0xf5f5f5, 0.6, 0, 0.75, 0.6, 1.25, 0.6, 1.0, null, true); // white ruff collar
    return a;
  }
};

// low, long-tailed reptiles (iguana, newt)
function lizard(id, o) {
  const a = quad(id, { color: o.color, map: o.map, belly: o.belly, bodyR: 0.6, bodySy: 0.65, bodyL: 1.35, bodyY: 0.8, legR: 0.15, foot: o.dark, neckL: 0.15, neckTilt: 1.1, headR: 0.5, headSy: 0.75, snoutL: 0.45, snoutR: 0.3, snoutColor: o.color, nose: o.dark, ears: 'none', tail: 'thin', tailL: 2.6, tailUp: -0.12, tailColor: o.color });
  if (o.spikes) for (let k = 0; k < 7; k++) mesh(a.body, cone(0.07, 0.32, 5), o.dark, 0, 0.42, 1.0 - k * 0.32);
  if (o.dewlap) sph(a.head, o.dewlap, 0.22, 0, -0.4, 0.25, 0.6, 1.2, 1);
  return a;
}

const SCALE = { iguana: 1.5, newt: 1.4, quail: 1.25, owl: 1.1, crocodile: 1.3, turtle: 1.25, frog: 1.15, sparrow: 1.25, dove: 1.15, duck: 1.1, hoopoe: 1.15, monkey: 1.1 };
export const ANIMAL_IDS = Object.keys(BUILDERS);
export function makeAnimal(id) {
  const b = BUILDERS[id];
  if (!b) throw new Error('unknown animal ' + id);
  const a = b();
  const sc = SCALE[id] || 1; a.root.scale.setScalar(sc); a.height *= sc;
  a.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return a;
}
