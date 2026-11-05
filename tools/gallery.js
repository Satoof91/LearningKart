import * as THREE from 'three';
import { makeAnimal, ANIMAL_IDS } from '../src/animals.js';
const W = 1680, Hh = 960, cols = 7, rows = 4, tw = W / cols, th = Hh / rows;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(W, Hh); document.body.appendChild(r.domElement); r.setScissorTest(true);
const mode = location.hash === '#happy' ? 'happy' : 'idle';
ANIMAL_IDS.forEach((id, i) => {
  const s = new THREE.Scene(); s.background = new THREE.Color(i % 2 ? 0xcdeeff : 0xbfe8ff);
  s.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.5));
  const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(5, 10, 8); s.add(d);
  const a = makeAnimal(id); a.update(0.3, mode); a.root.rotation.y = 0.55; s.add(a.root);
  const box = new THREE.Box3().setFromObject(a.root); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
  const R = Math.max(sz.x, sz.y, sz.z) * 0.62;
  const cam = new THREE.PerspectiveCamera(35, tw / th, 0.1, 200); cam.position.set(c.x + R * 0.9, c.y + R * 0.6, c.z + R * 2.6); cam.lookAt(c);
  const col = i % cols, row = (i / cols) | 0;
  r.setViewport(col * tw, Hh - (row + 1) * th, tw, th); r.setScissor(col * tw, Hh - (row + 1) * th, tw, th); r.render(s, cam);
});
window.done = true;
