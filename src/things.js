// Low-poly objects for the themed word packs (home, market, sea, sky & garden).
// Like the animals: built from primitives, face +Z, stand on y = 0, update(t, mode) with 'idle' | 'happy'.
// Ids are shared between the Arabic and English words (كوب / CUP -> 'cup').
import * as THREE from 'three';
import { toon } from './animals.js';

const TAU = Math.PI * 2;
const G = {
  box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 18, 14), cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6), cone: new THREE.ConeGeometry(1, 1, 16), torus: new THREE.TorusGeometry(1, 0.3, 10, 24),
  hemi: new THREE.SphereGeometry(1, 18, 10, 0, TAU, 0, Math.PI / 2), cap: new THREE.CapsuleGeometry(1, 1, 6, 12)
};
// a mesh: geometry, colour, position, rotation, scale
function m(par, geo, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  const o = new THREE.Mesh(geo, toon(c)); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); par.add(o); return o;
}
const eye = (par, x, y, z, r = 0.12) => { m(par, G.sph, 0xffffff, x, y, z, 0, 0, 0, r); m(par, G.sph, 0x212529, x, y, z + r * 0.6, 0, 0, 0, r * 0.55); };
const star5 = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? 0.45 : 1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  return new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }).translate(0, 0, -0.2);
})();
const moonGeo = (() => {
  const s = new THREE.Shape(); s.absarc(0, 0, 1, Math.PI * 0.25, Math.PI * 1.75, false);
  const h = new THREE.Path(); h.absarc(0.45, 0, 0.82, Math.PI * 1.7, Math.PI * 0.3, true);
  s.curves.push(...h.curves);
  return new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }).translate(0, 0, -0.22);
})();

// mode-driven motion: 'float' things hover and spin slowly, the rest wobble; 'happy' makes everything hop
function wrap(id, build, opts = {}) {
  return () => {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const h = build(body) || 2.4;
    const ph = id.length * 0.7;
    return {
      id, root, height: h,
      update(t, mode) {
        const happy = mode === 'happy';
        const hop = happy ? Math.abs(Math.sin(t * 7 + ph)) * 0.9 : 0;
        if (opts.float) { body.position.y = (opts.float || 0) + Math.sin(t * 1.6 + ph) * 0.25 + hop; body.rotation.y = Math.sin(t * 0.6 + ph) * 0.5 + (happy ? t * 3 : 0); }
        else { body.position.y = hop; body.rotation.z = Math.sin(t * 2 + ph) * (happy ? 0.12 : 0.04); if (opts.spin) body.rotation.y = t * opts.spin; }
        if (opts.anim) opts.anim(body, t, happy);
      }
    };
  };
}

const B = {
  // ---------- home ----------
  house: b => {
    m(b, G.box, 0xfff3bf, 0, 1.0, 0, 0, 0, 0, 2.4, 2.0, 2.0);
    m(b, G.cone, 0xe03131, 0, 2.75, 0, 0, Math.PI / 4, 0, 2.2, 1.5, 2.2).geometry = new THREE.ConeGeometry(1, 1, 4);
    m(b, G.box, 0x8b5e34, 0, 0.7, 1.01, 0, 0, 0, 0.6, 1.2, 0.05);
    for (const s of [1, -1]) { m(b, G.box, 0x74c0fc, s * 0.75, 1.3, 1.01, 0, 0, 0, 0.45, 0.45, 0.05); }
    m(b, G.box, 0x868e96, 0.6, 3.2, -0.3, 0, 0, 0, 0.3, 0.7, 0.3);
    return 3.6;
  },
  cup: b => {
    m(b, G.cyl, 0x4dabf7, 0, 0.9, 0, 0, 0, 0, 0.85, 1.8, 0.85);
    m(b, G.cyl, 0x8b5e34, 0, 1.78, 0, 0, 0, 0, 0.74, 0.05, 0.74);
    m(b, G.torus, 0x4dabf7, 0.95, 1.0, 0, 0, 0, 0, 0.45, 0.5, 0.5);
    m(b, G.sph, 0xffffff, 0, 1.0, 0.86, 0, 0, 0, 0.2, 0.2, 0.05);
    return 2.0;
  },
  bed: b => {
    m(b, G.box, 0xb08968, 0, 0.55, 0, 0, 0, 0, 1.9, 0.5, 3.0);
    m(b, G.box, 0x9c6644, 0, 1.0, -1.45, 0, 0, 0, 1.9, 1.6, 0.18);
    m(b, G.box, 0xffffff, 0, 0.9, 0.1, 0, 0, 0, 1.8, 0.25, 2.8);
    m(b, G.box, 0x748ffc, 0, 1.05, 0.55, 0, 0, 0, 1.85, 0.12, 1.9);
    m(b, G.cap, 0xfff0f6, 0, 1.15, -1.0, 0, 0, Math.PI / 2, 0.22, 1.1, 0.3);
    return 2.0;
  },
  pen: b => {
    const g = new THREE.Group(); g.rotation.z = 0.35; g.position.y = 0.4; b.add(g);
    m(g, G.cyl6, 0xffd43b, 0, 1.4, 0, 0, 0, 0, 0.32, 2.4, 0.32);
    m(g, G.cone, 0xf1c27d, 0, 0.0, 0, Math.PI, 0, 0, 0.32, 0.6, 0.32).geometry = new THREE.ConeGeometry(1, 1, 6);
    m(g, G.cone, 0x343a40, 0, -0.22, 0, Math.PI, 0, 0, 0.12, 0.2, 0.12);
    m(g, G.cyl, 0xadb5bd, 0, 2.7, 0, 0, 0, 0, 0.33, 0.2, 0.33);
    m(g, G.cyl, 0xff8fab, 0, 2.95, 0, 0, 0, 0, 0.32, 0.35, 0.32);
    return 3.2;
  },
  comb: b => {
    const g = new THREE.Group(); g.rotation.z = 0.3; g.position.y = 1.1; b.add(g);
    m(g, G.box, 0xf783ac, 0, 0.75, 0, 0, 0, 0, 2.8, 0.55, 0.3);
    m(g, G.box, 0xe64980, 1.75, 0.75, 0, 0, 0, 0, 0.9, 0.45, 0.28);
    for (let k = 0; k < 12; k++) m(g, G.box, 0xf783ac, -1.3 + k * 0.215, 0.05, 0, 0, 0, 0, 0.11, 0.9, 0.26);
    return 2.6;
  },
  plate: b => {
    m(b, G.cyl, 0xffffff, 0, 0.25, 0, 0, 0, 0, 1.6, 0.18, 1.6);
    m(b, G.torus, 0x74c0fc, 0, 0.35, 0, Math.PI / 2, 0, 0, 1.45, 1.45, 0.4);
    m(b, G.sph, 0xff6b6b, -0.4, 0.55, 0.2, 0, 0, 0, 0.42);
    m(b, G.sph, 0x69db7c, 0.45, 0.5, -0.2, 0, 0, 0, 0.35);
    m(b, G.sph, 0xffd43b, 0.2, 0.5, 0.6, 0, 0, 0, 0.3);
    return 1.2;
  },
  box: b => {
    m(b, G.box, 0xd9a066, 0, 0.9, 0, 0, 0.3, 0, 2.0, 1.8, 1.8);
    for (const s of [1, -1]) m(b, G.box, 0xc08552, s * 0.55, 1.85, 0, s * 0.5, 0.3, 0, 0.95, 0.1, 1.8).position.set(s * 0.6 * Math.cos(0.3), 2.05, -s * 0.6 * Math.sin(0.3));
    m(b, G.box, 0xa06b3b, 0, 0.9, 0, 0, 0.3, 0, 2.02, 0.25, 1.82);
    return 2.4;
  },
  pot: b => {
    m(b, G.cyl, 0x868e96, 0, 0.85, 0, 0, 0, 0, 1.2, 1.4, 1.2);
    m(b, G.cyl, 0xadb5bd, 0, 1.6, 0, 0, 0, 0, 1.25, 0.12, 1.25);
    m(b, G.sph, 0x495057, 0, 1.75, 0, 0, 0, 0, 0.2);
    for (const s of [1, -1]) m(b, G.box, 0x343a40, s * 1.35, 1.25, 0, 0, 0, 0, 0.4, 0.15, 0.3);
    for (let k = 0; k < 3; k++) m(b, G.sph, 0xffffff, -0.4 + k * 0.4, 2.2 + k * 0.25, 0, 0, 0, 0, 0.25 + k * 0.05);
    return 2.4;
  },
  rug: b => {
    const r = new THREE.Group(); r.rotation.x = 1.15; r.position.set(0, 1.3, -0.4); b.add(r); b = r; // stood up like a rug on show
    m(b, G.box, 0xe8590c, 0, 0.12, 0, 0, 0, 0, 3.0, 0.12, 2.0);
    m(b, G.box, 0xffd43b, 0, 0.15, 0, 0, 0, 0, 2.3, 0.12, 1.4);
    m(b, G.box, 0x1c7ed6, 0, 0.18, 0, 0, Math.PI / 4, 0, 0.8, 0.12, 0.8);
    for (let k = 0; k < 8; k++) for (const s of [1, -1]) m(b, G.box, 0xfff3bf, -1.3 + k * 0.37, 0.1, s * 1.1, 0, 0, 0, 0.06, 0.05, 0.25);
    return 2.6;
  },
  lamp: b => {
    m(b, G.cyl, 0x495057, 0, 0.12, 0, 0, 0, 0, 0.8, 0.24, 0.8);
    m(b, G.cyl, 0x868e96, 0, 1.2, 0, 0, 0, 0, 0.1, 2.1, 0.1);
    m(b, G.cyl, 0xffd43b, 0, 2.5, 0, 0, 0, 0, 0.65, 1.1, 0.65).geometry = new THREE.CylinderGeometry(0.55, 1.1, 1, 18, 1, true);
    m(b, G.sph, 0xfff9db, 0, 2.2, 0, 0, 0, 0, 0.35);
    return 3.1;
  },
  // ---------- market ----------
  banana: b => {
    const g = new THREE.Group(); g.position.y = 1.4; b.add(g);
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.28, 8, 18, Math.PI * 0.75), toon(0xffd43b));
      t.rotation.set(0, (k - 1) * 0.35, Math.PI * 1.1); t.position.z = (k - 1) * 0.15; g.add(t);
    }
    m(g, G.cyl, 0x8d6e2b, -0.25, 1.2, 0, 0, 0, 0.5, 0.15, 0.4, 0.15);
    return 2.6;
  },
  bread: b => {
    m(b, G.cap, 0xd9a066, 0, 0.75, 0, 0, 0, Math.PI / 2, 0.75, 1.6, 0.9);
    for (let k = 0; k < 3; k++) m(b, G.box, 0xf4d6a0, -0.6 + k * 0.6, 1.42, 0, 0, 0, 0.5, 0.12, 0.1, 0.9);
    return 1.6;
  },
  grapes: b => {
    const rows = [4, 3, 3, 2, 1];
    let y = 2.6;
    rows.forEach((n, r) => { for (let k = 0; k < n; k++) m(b, G.sph, 0x9c36b5, (k - (n - 1) / 2) * 0.5, y, (r % 2) * 0.2, 0, 0, 0, 0.3); y -= 0.42; });
    m(b, G.cyl, 0x5c3d1e, 0, 3.05, 0, 0, 0, 0, 0.08, 0.5, 0.08);
    m(b, G.sph, 0x51cf66, 0.4, 3.0, 0, 0, 0, 0.6, 0.45, 0.1, 0.3);
    return 3.3;
  },
  dates: b => {
    m(b, G.cyl, 0xffffff, 0, 0.2, 0, 0, 0, 0, 1.5, 0.15, 1.5);
    const pos = [[0, 0], [0.6, 0.3], [-0.6, 0.3], [0.3, -0.5], [-0.35, -0.45], [0, 0.7]];
    pos.forEach(([x, z], k) => m(b, G.cap, 0x7a3e12, x, 0.55 + (k === 0 ? 0.3 : 0), z, Math.PI / 2, k, 0, 0.22, 0.4, 0.22));
    return 1.2;
  },
  milk: b => {
    m(b, G.box, 0xffffff, 0, 1.2, 0, 0, 0, 0, 1.3, 2.4, 1.3);
    m(b, G.box, 0x4dabf7, 0, 1.4, 0, 0, 0, 0, 1.32, 0.9, 1.32);
    const roof = m(b, G.box, 0xffffff, 0, 2.65, 0, 0, 0, Math.PI / 4, 0.92, 0.92, 1.3);
    m(b, G.box, 0xffffff, 0, 3.05, 0, 0, 0, 0, 0.12, 0.45, 1.3);
    m(b, G.sph, 0xffffff, 0, 1.45, 0.67, 0, 0, 0, 0.3, 0.3, 0.05);
    return 3.3;
  },
  carrot: b => {
    m(b, G.cone, 0xfd7e14, 0, 1.2, 0, Math.PI, 0, 0, 0.55, 2.2, 0.55);
    for (let k = 0; k < 3; k++) m(b, G.cone, 0x40c057, (k - 1) * 0.25, 2.65, 0, 0, 0, (k - 1) * 0.4, 0.18, 0.9, 0.18);
    for (let k = 0; k < 3; k++) m(b, G.box, 0xe8590c, 0, 0.7 + k * 0.45, 0.32 - k * 0.07, 0, 0, 0, 0.3 - k * 0.05, 0.05, 0.05);
    return 3.1;
  },
  jam: b => {
    m(b, G.cyl, 0xe03131, 0, 0.85, 0, 0, 0, 0, 0.85, 1.6, 0.85);
    m(b, G.cyl, 0xffffff, 0, 1.75, 0, 0, 0, 0, 0.92, 0.25, 0.92);
    m(b, G.cone, 0xff8787, 0, 2.05, 0, 0, 0, 0, 0.95, 0.35, 0.95);
    m(b, G.box, 0xfff3bf, 0, 0.85, 0.84, 0, 0, 0, 0.9, 0.6, 0.03);
    m(b, G.sph, 0xe03131, 0, 0.85, 0.87, 0, 0, 0, 0.2, 0.2, 0.04);
    return 2.3;
  },
  fig: b => {
    m(b, G.sph, 0x6741d9, 0, 1.0, 0, 0, 0, 0, 0.95, 1.0, 0.95);
    m(b, G.cone, 0x6741d9, 0, 2.0, 0, 0, 0, 0, 0.45, 0.8, 0.45);
    m(b, G.cyl, 0x5c3d1e, 0, 2.5, 0, 0, 0, 0, 0.07, 0.3, 0.07);
    m(b, G.sph, 0xff8787, 0.55, 0.9, 0.55, 0, 0, 0, 0.35, 0.45, 0.2);
    return 2.6;
  },
  nut: b => {
    m(b, G.sph, 0xb08968, 0, 0.95, 0, 0, 0, 0, 0.95, 1.0, 0.9);
    m(b, G.hemi, 0x7f5539, 0, 1.4, 0, 0, 0, 0, 1.05, 0.7, 1.0);
    m(b, G.cyl, 0x5c3d1e, 0, 2.15, 0, 0, 0, 0, 0.1, 0.4, 0.1);
    return 2.3;
  },
  bun: b => {
    m(b, G.hemi, 0xe8a95b, 0, 0.3, 0, 0, 0, 0, 1.4, 1.0, 1.4);
    m(b, G.cyl, 0xe8a95b, 0, 0.18, 0, 0, 0, 0, 1.4, 0.35, 1.4);
    for (let k = 0; k < 7; k++) { const a = k * 2.3; m(b, G.cap, 0xfff9db, Math.cos(a) * 0.6, 1.15 - (k % 3) * 0.1, Math.sin(a) * 0.6, Math.PI / 2, a, 0, 0.05, 0.1, 0.05); }
    return 1.4;
  },
  plum: b => {
    m(b, G.sph, 0x862e9c, 0, 1.1, 0, 0, 0, 0, 1.05, 1.0, 1.0);
    m(b, G.cyl, 0x5c3d1e, 0, 2.15, 0, 0, 0, 0.2, 0.07, 0.4, 0.07);
    m(b, G.sph, 0x51cf66, 0.35, 2.25, 0, 0, 0, 0.7, 0.4, 0.1, 0.25);
    m(b, G.sph, 0xda77f2, -0.4, 1.5, 0.7, 0, 0, 0, 0.25, 0.25, 0.1);
    return 2.4;
  },
  // ---------- sea ----------
  fish: b => {
    const f = new THREE.Group(); f.rotation.y = Math.PI / 2; b.add(f); b = f; // side-on
    m(b, G.sph, 0xff922b, 0, 1.5, 0, 0, 0, 0, 0.6, 0.85, 1.3);
    const tail = m(b, G.cone, 0xff922b, 0, 1.5, -1.45, -Math.PI / 2, 0, 0, 0.12, 0.7, 0.7); tail.scale.set(0.12, 0.7, 0.75);
    m(b, G.cone, 0xff6b00, 0, 2.3, -0.2, 0, 0, 0, 0.1, 0.6, 0.5);
    for (const s of [1, -1]) eye(b, s * 0.48, 1.7, 0.8, 0.16);
    m(b, G.torus, 0xffd8a8, 0, 1.5, -0.3, 0, Math.PI / 2, 0, 0.62, 0.86, 0.25);
    return 2.6;
  },
  whale: b => {
    m(b, G.sph, 0x339af0, 0, 1.3, 0, 0, 0, 0, 1.4, 1.2, 2.0);
    m(b, G.sph, 0xd0ebff, 0, 0.9, 0.4, 0, 0, 0, 1.15, 0.7, 1.6);
    const t = m(b, G.box, 0x339af0, 0, 1.9, -2.2, 0.6, 0, 0, 1.8, 0.15, 0.7);
    for (const s of [1, -1]) eye(b, s * 0.9, 1.6, 1.3, 0.15);
    for (let k = 0; k < 3; k++) m(b, G.sph, 0xa5d8ff, (k - 1) * 0.35, 3.0 + Math.abs(k - 1) * -0.2, 0.3, 0, 0, 0, 0.18);
    m(b, G.cyl, 0xa5d8ff, 0, 2.7, 0.3, 0, 0, 0, 0.08, 0.6, 0.08);
    return 3.1;
  },
  shark: b => {
    m(b, G.sph, 0x868e96, 0, 1.2, 0, 0, 0, 0, 0.8, 0.8, 2.0);
    m(b, G.sph, 0xf1f3f5, 0, 0.95, 0.3, 0, 0, 0, 0.65, 0.5, 1.6);
    m(b, G.cone, 0x868e96, 0, 2.2, -0.2, 0, 0, 0, 0.12, 1.1, 0.6).scale.set(0.12, 1.1, 0.6);
    m(b, G.cone, 0x868e96, 0, 1.5, -2.2, -0.6, 0, 0, 0.1, 1.0, 0.5).scale.set(0.1, 1.0, 0.5);
    for (const s of [1, -1]) { eye(b, s * 0.5, 1.45, 1.4, 0.13); m(b, G.box, 0x868e96, s * 0.85, 0.9, 0.4, 0, 0, s * 0.6, 0.9, 0.1, 0.5); }
    m(b, G.box, 0xffffff, 0, 0.95, 1.85, 0, 0, 0, 0.6, 0.08, 0.08);
    return 2.6;
  },
  shell: b => {
    const g = new THREE.Group(); g.position.y = 0.2; g.rotation.x = -0.9; b.add(g);
    for (let k = 0; k < 9; k++) { const a = (k - 4) * 0.27; m(g, G.cap, k % 2 ? 0xffc9c9 : 0xffa8a8, Math.sin(a) * 0.9, Math.cos(a) * 0.9, 0, 0, 0, -a, 0.18, 1.1, 0.18); }
    m(g, G.sph, 0xffa8a8, 0, 0, 0, 0, 0, 0, 0.35);
    m(b, G.sph, 0xfff0f6, 0, 0.3, 0.6, 0, 0, 0, 0.35);
    return 2.0;
  },
  sand: b => {
    m(b, G.cyl, 0xf1d28a, 0, 0.5, 0, 0, 0, 0, 1.6, 1.0, 1.6);
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { m(b, G.cyl, 0xe9c46a, x * 0.9, 1.4, z * 0.9, 0, 0, 0, 0.45, 1.0, 0.45); m(b, G.cone, 0xe9c46a, x * 0.9, 2.15, z * 0.9, 0, 0, 0, 0.5, 0.5, 0.5); }
    m(b, G.box, 0xe9c46a, 0, 1.4, 0, 0, 0, 0, 1.4, 0.9, 1.4);
    m(b, G.box, 0x8b5e34, 0, 1.15, 0.72, 0, 0, 0, 0.4, 0.5, 0.05);
    m(b, G.cyl, 0x495057, 0, 2.4, 0, 0, 0, 0, 0.04, 1.2, 0.04);
    m(b, G.box, 0xe03131, 0.25, 2.8, 0, 0, 0, 0, 0.5, 0.3, 0.03);
    return 3.0;
  },
  boat: b => {
    const g = new THREE.Group(); g.rotation.y = Math.PI / 2; b.add(g); // side-on, so the sail reads clearly
    m(g, G.box, 0xc92a2a, 0, 0.6, 0, 0, 0, 0, 1.4, 0.7, 3.0);
    m(g, G.box, 0xffffff, 0, 1.0, 0, 0, 0, 0, 1.45, 0.15, 3.05);
    m(g, G.cone, 0xc92a2a, 0, 0.65, 1.75, Math.PI / 2, 0, 0, 0.7, 0.6, 0.35).scale.set(0.7, 0.6, 0.35);
    m(g, G.cyl, 0x8b5e34, 0, 2.3, 0, 0, 0, 0, 0.08, 2.8, 0.08);
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0, 2.4); shape.lineTo(1.7, 0); shape.lineTo(0, 0);
    const sail = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }), toon(0xffffff));
    sail.rotation.y = -Math.PI / 2; sail.position.set(0.03, 1.25, 0.1); g.add(sail);
    m(g, G.box, 0xffd43b, 0, 3.75, -0.25, 0, 0, 0, 0.03, 0.3, 0.5);
    return 3.9;
  },
  crab: b => {
    m(b, G.sph, 0xf03e3e, 0, 0.9, 0, 0, 0, 0, 1.2, 0.6, 0.9);
    for (const s of [1, -1]) {
      eye(b, s * 0.35, 1.8, 0.4, 0.14); m(b, G.cyl, 0xf03e3e, s * 0.35, 1.45, 0.4, 0, 0, 0, 0.05, 0.6, 0.05);
      m(b, G.sph, 0xf03e3e, s * 1.55, 1.3, 0.6, 0, 0, s * 0.5, 0.4, 0.3, 0.3);
      m(b, G.cone, 0xf03e3e, s * 1.85, 1.65, 0.6, 0, 0, -s * 0.4, 0.15, 0.5, 0.15);
      for (let k = 0; k < 3; k++) m(b, G.cyl, 0xe03131, s * 1.25, 0.45, -0.4 + k * 0.4, 0, 0, s * 1.0, 0.07, 0.9, 0.07);
    }
    m(b, G.box, 0x212529, 0, 0.95, 0.85, 0, 0, 0, 0.35, 0.05, 0.05);
    return 2.1;
  },
  net: b => {
    m(b, G.cyl, 0x8b5e34, 0, 0.9, 0.6, 0.4, 0, 0, 0.08, 2.0, 0.08);
    const ring = m(b, G.torus, 0x495057, 0, 2.35, -0.2, Math.PI / 2 - 0.4, 0, 0, 0.9, 0.9, 0.12);
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8, 0, TAU, Math.PI / 2, Math.PI / 2), new THREE.MeshToonMaterial({ color: 0x99e9f2, wireframe: true }));
    bag.position.set(0, 2.35, -0.2); bag.rotation.x = -0.4; bag.scale.y = 1.3; b.add(bag);
    m(b, G.sph, 0xff922b, 0, 1.8, -0.4, 0, 0, 0, 0.3, 0.35, 0.5);
    return 3.3;
  },
  raft: b => {
    for (let k = 0; k < 6; k++) m(b, G.cyl, 0xc08552, -1.25 + k * 0.5, 0.3, 0, Math.PI / 2, 0, 0, 0.24, 2.8, 0.24);
    for (const z of [-0.9, 0.9]) m(b, G.box, 0x8b5e34, 0, 0.58, z, 0, 0, 0, 3.0, 0.12, 0.2);
    m(b, G.cyl, 0x8b5e34, 0, 1.9, -0.3, 0, 0, 0, 0.07, 2.8, 0.07);
    m(b, G.box, 0xfff3bf, 0, 2.3, -0.25, 0, 0, 0, 1.6, 1.4, 0.04);
    return 3.3;
  },
  // ---------- sky & garden ----------
  sun: b => {
    m(b, G.sph, 0xffd43b, 0, 0, 0, 0, 0, 0, 1.1);
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; m(b, G.cone, 0xffa94d, Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0, 0, 0, a - Math.PI / 2, 0.25, 0.6, 0.12); }
    for (const s of [1, -1]) eye(b, s * 0.38, 0.2, 1.0, 0.16);
    m(b, G.torus, 0xe8590c, 0, -0.25, 1.0, 0, 0, Math.PI, 0.32, 0.32, 0.25).geometry = new THREE.TorusGeometry(1, 0.15, 8, 16, Math.PI);
    return 4.2;
  },
  moon: b => {
    m(b, moonGeo, 0xfff3bf, 0, 0, 0, 0, 0, 0, 1.3);
    eye(b, -0.7, 0.35, 0.35, 0.14);
    return 4.0;
  },
  star: b => { m(b, star5, 0xffd43b, 0, 0, 0, 0, 0, 0, 1.3); for (const s of [1, -1]) eye(b, s * 0.35, 0.1, 0.42, 0.15); return 4.0; },
  cloud: b => {
    for (const [x, y, r] of [[0, 0, 1], [-1.0, -0.2, 0.75], [1.0, -0.2, 0.8], [0.5, 0.45, 0.7], [-0.5, 0.4, 0.65]]) m(b, G.sph, 0xffffff, x, y, 0, 0, 0, 0, r, r, r * 0.8);
    for (const s of [1, -1]) eye(b, s * 0.35, 0.1, 0.78, 0.13);
    return 4.0;
  },
  rose: b => {
    m(b, G.cyl, 0x2f9e44, 0, 1.2, 0, 0, 0, 0, 0.08, 2.4, 0.08);
    for (const s of [1, -1]) m(b, G.sph, 0x40c057, s * 0.35, 1.1 + s * 0.3, 0, 0, 0, s * 0.6, 0.4, 0.12, 0.2);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; m(b, G.sph, 0xe64980, Math.cos(a) * 0.35, 2.6, Math.sin(a) * 0.35, 0, -a, 0.4, 0.42, 0.5, 0.3); }
    m(b, G.sph, 0xc2255c, 0, 2.75, 0, 0, 0, 0, 0.32);
    return 3.1;
  },
  bee: b => {
    const g = new THREE.Group(); b.add(g);
    const body = m(g, G.sph, 0xffd43b, 0, 0, 0, 0, 0, 0, 0.8, 0.75, 1.1);
    for (let k = 0; k < 3; k++) m(g, G.torus, 0x212529, 0, 0, -0.45 + k * 0.4, 0, 0, 0, 0.66 + (k === 1 ? 0.12 : 0), 0.66 + (k === 1 ? 0.12 : 0), 0.3).scale.z = 0.5;
    for (const s of [1, -1]) { eye(g, s * 0.3, 0.25, 1.0, 0.15); m(g, G.sph, 0xe7f5ff, s * 0.6, 0.8, -0.1, 0, 0, s * 0.5, 0.5, 0.15, 0.35).material = new THREE.MeshToonMaterial({ color: 0xe7f5ff, transparent: true, opacity: 0.8 }); }
    m(g, G.cone, 0x212529, 0, 0, -1.2, -Math.PI / 2, 0, 0, 0.12, 0.3, 0.12);
    return 3.0;
  },
  ant: b => {
    for (const [z, r] of [[-0.9, 0.6], [0, 0.4], [0.75, 0.5]]) m(b, G.sph, 0x343a40, 0, 0.9, z, 0, 0, 0, r, r * 0.9, r);
    for (const s of [1, -1]) {
      eye(b, s * 0.22, 1.05, 1.15, 0.12);
      m(b, G.cyl, 0x343a40, s * 0.2, 1.55, 0.95, -0.5, 0, s * 0.4, 0.04, 0.7, 0.04);
      for (let k = 0; k < 3; k++) m(b, G.cyl, 0x343a40, s * 0.55, 0.5, -0.3 + k * 0.3, 0, 0, s * 0.9, 0.05, 0.9, 0.05);
    }
    return 2.0;
  },
  bug: b => {
    m(b, G.hemi, 0xe03131, 0, 0.4, 0, 0, 0, 0, 1.1, 0.95, 1.2);
    m(b, G.sph, 0x212529, 0, 0.55, 1.0, 0, 0, 0, 0.5, 0.45, 0.45);
    m(b, G.box, 0x212529, 0, 0.95, 0, 0, 0, 0, 0.06, 1.0, 2.3);
    for (const [x, z] of [[0.5, 0.3], [-0.5, 0.3], [0.55, -0.5], [-0.55, -0.5], [0, -0.85]]) m(b, G.sph, 0x212529, x, 0.4 + Math.sqrt(Math.max(0, 1 - (x * x + z * z) / 1.4)) * 0.95, z, 0, 0, 0, 0.2, 0.1, 0.2);
    for (const s of [1, -1]) eye(b, s * 0.2, 0.7, 1.35, 0.12);
    return 1.5;
  },
  nest: b => {
    m(b, G.torus, 0x8b5e34, 0, 0.55, 0, Math.PI / 2, 0, 0, 1.2, 1.2, 1.4);
    m(b, G.cyl, 0x7f5539, 0, 0.35, 0, 0, 0, 0, 1.2, 0.4, 1.2);
    for (let k = 0; k < 3; k++) m(b, G.sph, 0x99e9f2, (k - 1) * 0.5, 0.75, (k % 2) * 0.3 - 0.1, 0, 0, 0, 0.3, 0.38, 0.3);
    return 1.3;
  },
  web: b => {
    const g = new THREE.Group(); g.position.y = 1.9; b.add(g);
    const line = (x1, y1, x2, y2) => { const len = Math.hypot(x2 - x1, y2 - y1); m(g, G.box, 0xf8f9fa, (x1 + x2) / 2, (y1 + y2) / 2, 0, 0, 0, Math.atan2(y2 - y1, x2 - x1), len, 0.05, 0.05); };
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; line(0, 0, Math.cos(a) * 1.6, Math.sin(a) * 1.6); }
    for (let r = 0.4; r <= 1.6; r += 0.4) for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, a2 = (k + 1) / 8 * TAU; line(Math.cos(a) * r, Math.sin(a) * r, Math.cos(a2) * r, Math.sin(a2) * r); }
    m(g, G.sph, 0x7048e8, 0.3, -0.2, 0.15, 0, 0, 0, 0.3);
    for (const s of [1, -1]) eye(g, 0.3 + s * 0.12, -0.15, 0.4, 0.08);
    for (const s of [1, -1]) m(b, G.cyl, 0x8b5e34, s * 1.7, 1.7, 0, 0, 0, 0, 0.1, 3.4, 0.1);
    return 3.6;
  },
  log: b => {
    m(b, G.cyl, 0x8b5e34, 0, 0.7, 0, 0, 0, Math.PI / 2, 0.7, 2.8, 0.7);
    for (const s of [1, -1]) { m(b, G.cyl, 0xe9c46a, s * 1.41, 0.7, 0, 0, 0, Math.PI / 2, 0.62, 0.03, 0.62); m(b, G.torus, 0xc08552, s * 1.43, 0.7, 0, 0, Math.PI / 2, 0, 0.35, 0.35, 0.1); }
    m(b, G.sph, 0xe03131, 0.4, 1.5, 0.2, 0, 0, 0, 0.35, 0.18, 0.35);
    m(b, G.cyl, 0xfff3bf, 0.4, 1.35, 0.2, 0, 0, 0, 0.1, 0.25, 0.1);
    m(b, G.sph, 0x40c057, -0.6, 1.4, 0.3, 0, 0, 0, 0.25, 0.15, 0.25);
    return 1.8;
  }
};

const FLOAT = { sun: 2.8, moon: 2.4, star: 2.4, cloud: 2.6, bee: 1.8 };
export const THING_IDS = Object.keys(B);
const BUILT = Object.fromEntries(THING_IDS.map(id => [id, wrap(id, B[id], FLOAT[id] ? { float: FLOAT[id] } : {})]));
export function makeThing(id) {
  const f = BUILT[id]; if (!f) throw new Error('unknown thing ' + id);
  const a = f();
  a.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  // floating things report the height of their top so cameras frame them
  if (FLOAT[id]) a.height += FLOAT[id] - 1;
  return a;
}
