// LearningKart — Arabic letters & numbers zoo kart game for ages 3-6.
import * as THREE from 'three';
import { initPlatform, haptic, Tilt, setHaptics, exitApp, isNative as isNativeApp } from './platform.js';
import { TRACKS, WORD_PACKS, SYLLABLES, HLINES, HARAKA_ENABLED } from './data.js';
import { UI } from './i18n.js';
// current language track (Arabic or English): letters, numbers, spoken lines, praise, digits
let TR = TRACKS.ar;
// How a letter level teaches (ages 3-6):
//  - every pair: the right letter on one side, a different letter on the other; the first pairs use a
//    clearly different shape, later pairs a look-alike that differs only by its dots
//  - correct pick: the letter's name («بَاء»), praise on every other one, then «أَيْنَ حَرْفُ …» for the next one
//    (the sound with its word «بَ، بَ، بَطَّة» is only in the intro and the chip tap)
//  - wrong pick: name the letter that was picked, then ask again for the right one («أَيْنَ حَرْفُ بَاء؟»)
//  - from the 3rd letter on, the HUD hides the glyph: the child hears the name and has to find the shape (recall)
//  - help (glow, then the letter straight ahead) only appears after mistakes; stars count every miss
import { makeAnimal, ANIMAL_IDS } from './animals.js';
import { makeFriend, isAnimal } from './friends.js';
import { Purchase, FREE_WORDS } from './purchase.js';
import { buildTrack, buildZoo, makeHabitat, makeAppleTable, makeKart, makeArch, makeApple, makeStar, makeBoostPad, glowTex, blobTex, Confetti, FENCE, LANE } from './world.js';
import { loadFonts, bubbleTexture, drawWord, drawWordProgress, drawSyllable, syllableURL, FONT, roundRect } from './text.js';
import { Voice } from './voice.js';
import { Sound } from './audio.js';
import { Store } from './store.js';
import { GARAGE, GARAGE_TABS, KART_COLORS, DRIVERS, newlyAffordable, isOwned } from './garage.js';

const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const pick = a => a[(Math.random() * a.length) | 0];
const BUBBLE_COLORS = [0x3da5ff, 0xff4d6d, 0x8a5cf6, 0xff922b, 0x20c997, 0xf06595];

// ---------- icons ----------
const ICON = {
  star: '<svg viewBox="0 0 24 24"><path fill="#ffd60a" stroke="#e8a200" stroke-width="1.5" stroke-linejoin="round" d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5L2.6 9.4l6.5-.8z"/></svg>',
  starOff: '<svg viewBox="0 0 24 24"><path fill="#d9d2f5" d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5L2.6 9.4l6.5-.8z"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M15.5 4 6.5 12l9 8z"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M8.5 4l9 8-9 8z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="2" fill="#fff"/><rect x="14" y="4" width="5" height="16" rx="2" fill="#fff"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M7 4.5v15l12-7.5z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 3 2 11.5h3V21h5v-6h4v6h5v-9.5h3z"/></svg>',
  replay: '<svg viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" d="M19 12a7 7 0 1 1-2.1-5"/><path fill="#fff" d="M19.5 2.5v6.5H13z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M15 4.5v15L4 12z"/><rect x="16.5" y="5" width="3.5" height="14" rx="1.5" fill="#fff"/></svg>',
  speaker: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M3 9h4l5-4.5v15L7 15H3z"/><path fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path stroke="#fff" stroke-width="3.5" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>',
  gear: '<svg class="g" viewBox="0 0 24 24"><path fill="#fff" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7 7 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2.5" fill="#fff"/><path fill="none" stroke="#fff" stroke-width="2.6" d="M8 10V7.5a4 4 0 0 1 8 0V10"/></svg>',
  apple: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 7c-2-1.6-6.5-1.4-7 3.4-.4 4.3 2.6 9.6 5 9.6 1 0 1.3-.6 2-.6s1 .6 2 .6c2.4 0 5.4-5.3 5-9.6C18.5 5.6 14 5.4 12 7z"/><path fill="#fff" d="M12.4 6.6c.2-2 1.4-3.3 3.2-3.6-.1 1.9-1.4 3.3-3.2 3.6z"/></svg>'
};
function kartSvg(color) {
  return `<svg viewBox="0 0 64 48"><rect x="8" y="22" width="48" height="14" rx="6" fill="${color}"/><rect x="22" y="12" width="18" height="14" rx="4" fill="#2b2d42"/><circle cx="31" cy="11" r="8" fill="#ffd6a5"/><path d="M23 10a8 8 0 0 1 16 0z" fill="${color}"/><circle cx="16" cy="38" r="7" fill="#222"/><circle cx="48" cy="38" r="7" fill="#222"/><circle cx="16" cy="38" r="3" fill="#ffd60a"/><circle cx="48" cy="38" r="3" fill="#ffd60a"/></svg>`;
}
document.querySelectorAll('[data-icon]').forEach(el => { el.insertAdjacentHTML('afterbegin', ICON[el.dataset.icon]); });
$('gear').insertAdjacentHTML('afterbegin', ICON.gear);

// ---------- renderer / scene ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6f1ff, 160, 560);
const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 2000);
scene.add(new THREE.HemisphereLight(0xffffff, 0x7fb860, 1.35));
const sun = new THREE.DirectionalLight(0xfff0d0, 1.9);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 260 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.3;
scene.add(sun, sun.target);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

let T, ZOO, confetti, kart;
const S = {
  mode: 'boot', kind: 'letter', index: 0, paused: false, t: 0,
  u: 0, d: 0, vd: 0, speed: 0, boostT: 0, steer: 0, camH: 0, wobble: 0,
  pickups: [], nextU: 0, collected: 0, need: 5, wrong: 0, coins: 0, spawned: 0,
  arch: null, archU: 0, stage: null, stageU: 0, stageC: new THREE.Vector3(), modeT: 0, slotHabs: [], happyT: 0, countQ: []
};

// ---------- input ----------
const keys = {};
const touch = { left: false, right: false };
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
  if (k === 'escape' && ['drive', 'intro', 'arrive'].includes(S.mode)) setPaused(!S.paused);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const zonePtrs = [];
function releaseTouch() {
  // forget every finger: a lost pointerup (app switch with a finger down) must not leave a side "held"
  for (const z of zonePtrs) z.clear();
  touch.left = touch.right = false;
  document.querySelectorAll('.zone.down').forEach(e => e.classList.remove('down'));
  for (const k in keys) keys[k] = false;
}
addEventListener('blur', releaseTouch);
for (const [id, side] of [['zl', 'left'], ['zr', 'right']]) {
  const el = $(id); const ptrs = new Set(); zonePtrs.push(ptrs);
  const upd = () => { touch[side] = ptrs.size > 0; el.classList.toggle('down', touch[side]); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); ptrs.add(e.pointerId); try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } upd(); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, e => { ptrs.delete(e.pointerId); upd(); });
  el.addEventListener('contextmenu', e => e.preventDefault());
}
addEventListener('pointerdown', () => Sound.init(), { capture: true });
function steerInput() {
  const l = keys.arrowleft || keys.a || touch.left, r = keys.arrowright || keys.d || touch.right;
  let s = (l ? 1 : 0) - (r ? 1 : 0);
  if (!s && Tilt.enabled) s = Tilt.steer();
  return s;
}

// ---------- settings ----------
const set = () => Store.data.settings;
// interface language (menus, settings, instructions); the learning track is chosen on the map
const ui = () => UI[set().uiLang === 'en' ? 'en' : 'ar'];
const PACK_ICON = { zoo: '🦁', home: '🏠', market: '🛒', sea: '🌊', sky: '🌤️' };
const unlockText = () => (Store.data.unlockAll ? ui().lock : ui().unlock);
function applyUiLang() {
  const u = ui(), L = set().uiLang === 'en' ? 'en' : 'ar';
  document.documentElement.lang = L; document.documentElement.dir = u.dir;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = u[el.dataset.i18n]; });
  document.querySelector('.tab[data-tab="letter"]').textContent = u.tabLetter;
  document.querySelector('.tab[data-tab="number"]').textContent = u.tabNumber;
  document.querySelector('.tab[data-tab="haraka"]').textContent = u.tabHaraka;
  document.querySelector('.tab[data-tab="haraka"]').classList.toggle('hidden', !HARAKA_ENABLED);
  document.querySelectorAll('[data-lang]').forEach(b => { b.textContent = u.switchTo; b.setAttribute('aria-label', u.switchLabel); });
  if (ZOO) ZOO.setBanner(u.banner);
}
function toggleUiLang() {
  Sound.init(); Sound.click();
  set().uiLang = set().uiLang === 'en' ? 'ar' : 'en'; Store.save(); applyUiLang();
  // the map follows: English interface opens the ABC track, Arabic the Arabic letters (same kind)
  const k = mapTab.replace(/^en/, '');
  if (k !== 'haraka') mapTab = (set().uiLang === 'en' ? 'en' : '') + k; // harakat are Arabic-only
  if (S.mode === 'map') renderMap();
}
document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', toggleUiLang));
function applySettings() {
  const s = set();
  Sound.setSfx(s.sfx); Sound.setMusic(s.music); Voice.enabled = s.voice; setHaptics(s.haptics);
  Voice.rate = s.voiceRate === 'slow' ? 0.75 : 0.9;
  if (s.flip !== (Tilt.sign < 0)) Tilt.flip();
  $('hud').classList.toggle('tilting', Tilt.enabled);
}
Voice.onStart = () => Sound.setDuck(true);
Voice.onEnd = () => Sound.setDuck(false);

// ---------- zoo population ----------
function slotPlan(excludeIdx) {
  // animals already met go into the enclosures (most recent first), the rest show a mystery "؟"
  const met = [];
  Store.prog('letter', TR.lang).forEach((st, i) => { if (st > 0 && i !== excludeIdx) met.push(i); });
  met.reverse();
  const plan = [];
  const upcoming = [];
  for (let i = 0; i < TR.letters.length; i++) if (!Store.prog('letter', TR.lang)[i] && i !== excludeIdx) upcoming.push(i);
  for (let k = 0; k < ZOO.slots.length; k++) {
    if (k < met.length) plan.push({ i: met[k], known: true });
    else { const i = upcoming[(k - met.length) % Math.max(1, upcoming.length)]; plan.push(i == null ? null : { i, known: false }); }
  }
  return plan;
}
function populateZoo(excludeIdx = -1, showcase = false) {
  let plan = slotPlan(excludeIdx);
  if (showcase && plan.filter(p => p && p.known).length < 3) {
    // title screen: show a few friends so the zoo looks alive
    plan = plan.map((p, k) => (k < 4 ? { i: [0, 10, 19, 21][k], known: true } : p));
  }
  ZOO.slots.forEach((slot, k) => {
    const p = plan[k];
    const key = p ? TR.lang + (p.known ? 'A' + p.i : 'M' + p.i) : 'none';
    let h = S.slotHabs[k];
    if (h && h.key === key) { h.group.visible = true; return; }
    if (h) { scene.remove(h.group); disposeOwned(h.group); }
    if (!p) { S.slotHabs[k] = null; return; }
    const L = TR.letters[p.i];
    const hab = makeHabitat(L.biome, p.known ? [L.animal] : [], p.known ? { big: L.ch, word: L.word } : { big: '؟', word: '' }, { seed: k * 13 + 1 });
    hab.group.position.set(slot.x, 0, slot.z); hab.group.rotation.y = slot.face;
    hab.key = key; scene.add(hab.group); S.slotHabs[k] = hab;
  });
}
function disposeOwned(obj) {
  // only geometry merged for this object and its own sign textures; shared caches stay alive
  obj.traverse(o => {
    if (!o.isMesh) return;
    if (o.geometry && o.geometry.type === 'BufferGeometry') o.geometry.dispose();
    if (o.userData.ownTex && o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
  });
}

// ---------- level setup ----------
const cur = () => (S.kind === 'letter' || S.kind === 'haraka' ? TR.letters[S.index] : S.kind === 'word' ? TR.words[S.index] : TR.numbers[S.index]);
// harakat mode: 6 syllables of one letter (fatha, kasra, damma, then the three again in a shuffled order)
const isHaraka = () => S.kind === 'haraka';
const sylAt = (k = 0) => SYLLABLES[S.index][S.seq[Math.min(S.seq.length - 1, S.collected + k)]];
const sylRow = i => SYLLABLES[i].map(x => x.ch).join(' ');
// the three syllables as images in their mark colours (map nodes, intro card)
const sylImgs = i => `<span class="sylrow">${SYLLABLES[i].map(x => `<img class="syl" alt="${x.ch}" src="${syllableURL(x.ch, x.color, '#2b1b6b', '#ffffff')}">`).join('')}</span>`;
// the question line for a letter or a syllable
const findLine = x => (x && x.mark ? HLINES.find(x) : TR.lines.find(x));
// marks are coloured while the child learns them (first 3) and again after a mistake; white in recall
const markColorFor = x => (x && x.mark && (!S.recall || S.missStreak > 0 || S.recentWrong) ? x.color : null);
function addMissNow() { if (isHaraka()) Store.addHMiss(S.index); else Store.addMiss(missIdx(), TR.lang); }
// word mode: the word is built letter by letter; these give the letter objects it is made of
const isWord = () => S.kind === 'word';
const letterOf = ch => TR.letters.find(x => x.ch === ch);
const nextLetter = (k = 0) => { const W = cur(); return letterOf(W.parts[Math.min(W.parts.length - 1, S.collected + k)]); };
// which letter a miss / wrong pick is about (saved per letter, for the parents' progress view)
const missIdx = () => (isWord() ? TR.letters.indexOf(nextLetter()) : S.index);
function drawWordHud() {
  const cv = $('wordhud'), g = cv.getContext('2d'), W = cur();
  g.clearRect(0, 0, cv.width, cv.height);
  drawWordProgress(g, W.word, S.collected, cv.width / 2, cv.height / 2 + 6, W.word.length > 3 ? 96 : 112, '#e4ddfb', '#ff4d6d');
}
function clearLevel() {
  for (const p of S.pickups) removePickup(p);
  S.pickups = [];
  if (S.arch) { scene.remove(S.arch.group); disposeOwned(S.arch.group); S.arch = null; }
  if (S.stage) { scene.remove(S.stage.group); disposeOwned(S.stage.group); S.stage = null; }
  Voice.stop();
}
function startLevel(kind, index, lang) {
  if (kind === 'haraka' && !HARAKA_ENABLED) return toMap('letter');
  // paid words lead to the parents' unlock screen instead (never straight into a store dialog)
  if (!Purchase.canPlay(kind, index)) { if (S.mode !== 'map') toMap(); openPaywall(); return; }
  clearLevel();
  if (lang) TR = TRACKS[lang];
  if (kind === 'haraka') TR = TRACKS.ar; // the harakat are an Arabic-only mode
  S.lang = TR.lang;
  S.kind = kind; S.index = index; S.paused = false;
  const C = cur();
  populateZoo(kind === 'letter' ? index : -1);
  S.u = T.L - 34; S.d = 0; S.vd = 0; S.speed = 0; S.boostT = 0; S.camH = T.heading(S.u);
  S.collected = 0; S.wrong = 0; S.coins = 0; S.spawned = 0; S.need = kind === 'letter' ? 5 : kind === 'word' ? C.parts.length : kind === 'haraka' ? 6 : C.n;
  S.seq = [0, 1, 2].concat([0, 1, 2].sort(() => Math.random() - 0.5));
  S.nextU = S.u + 85; S.missStreak = 0; S.countQ = null;
  S.misses = 0; S.assisted = 0; S.recentWrong = false; S.recall = false; S.lastPraise = -1;
  S.chipBusy = false; clearTimeout(S.chipT);
  S.lvl = (S.lvl || 0) + 1;
  // HUD
  const glyph = kind === 'letter' ? C.ch : kind === 'word' ? C.word : kind === 'haraka' ? sylRow(index) : C.digit;
  if (kind === 'haraka') chipShowsTarget();
  else setChip(kind === 'word' ? letterOf(C.parts[0]).ch : glyph, kind === 'number' ? 'var(--org)' : 'var(--pink)');
  const slots = $('slots'); slots.innerHTML = '';
  for (let i = 0; i < S.need; i++) { const d = document.createElement('div'); d.className = 'slot' + (kind === 'number' ? ' apple' : ''); slots.appendChild(d); }
  slots.style.display = S.need && kind !== 'word' ? 'flex' : 'none';
  // word mode: the word itself is the progress bar (pale outline, fills in colour)
  $('wordhud').classList.toggle('hidden', kind !== 'word');
  if (kind === 'word') drawWordHud();
  $('hstars').textContent = '0';
  showScreen('hud');
  $('celebrate').classList.add('hidden'); $('pause').classList.add('hidden');
  // intro card
  if (kind === 'haraka') $('introglyph').innerHTML = sylImgs(index); else $('introglyph').textContent = kind === 'letter' && C.card ? C.card : glyph;
  $('introglyph').style.color = kind === 'number' ? 'var(--org)' : 'var(--pink)';
  $('introtext').textContent = kind === 'letter' ? ui().collect(C) : kind === 'word' ? ui().buildWord(C) : kind === 'haraka' ? ui().harakaCollect(C) : (C.n ? ui().apples(glyph) : ui().zero);
  $('introtext').dir = ui().dir;
  // show the animal from the start: letter -> sound -> animal is the memory hook
  const img = $('introimg');
  if (kind !== 'number') { img.src = thumb(C.animal); img.classList.remove('hidden'); } else img.classList.add('hidden');
  $('intro').classList.remove('hidden', 'out');
  S.mode = 'intro'; S.modeT = 0; S.introDone = false;
  Sound.whoosh();
  sayIntro();
  syncKart(0);
}
function sayIntro() {
  const C = cur(), lvl = S.lvl;
  // letter intro: the sound once with its animal («جَ، جَمَل») and the name once, inside the call to play;
  // the race itself repeats the name and the chant, so the card does not say the letter three times
  const snd = TR.lines.sound(C);
  const lines = S.kind === 'letter' ? [Array.isArray(snd) ? [snd[0], snd[snd.length - 1]] : snd, TR.lines.letterIntro(C)]
    : S.kind === 'word' ? [C.say, TR.lines.wordIntro(C), TR.lines.find(letterOf(C.parts[0]))]
    : S.kind === 'haraka' ? [HLINES.intro(C), HLINES.chant(S.index)].concat(S.index === 0 ? [HLINES.howto] : []).concat([HLINES.find(sylAt(0))])
    : [C.say, TR.lines.numberIntro(C)];
  // only this level's intro may end the intro (a stopped older promise must not skip the new one)
  Voice.say(lines, { gap: 350 }).then(() => { if (S.lvl === lvl && !S.paused) S.introDone = true; });
}
// HUD target chip: the letter to find (or "؟" in recall rounds, where the child listens and finds the shape)
function setChip(text, bg) {
  // a letter with a haraka is drawn as an image: font marks are too small to read in the chip
  if (/[َ-ِ]/.test(text)) $('tglyph').innerHTML = `<img class="syl" alt="${text}" src="${syllableURL(text)}">`;
  else $('tglyph').textContent = text;
  if (bg) $('tglyph').style.background = bg;
}
function chipShowsTarget() {
  const C = cur();
  if (S.kind === 'word') return setChip(nextLetter().ch, 'var(--pink)');
  if (isHaraka()) { const x = sylAt(0); return S.recall ? setChip('؟', 'var(--purple)') : setChip(x.ch, x.color); }
  if (S.kind !== 'letter') return setChip(C.digit, 'var(--org)');
  setChip(S.recall ? (TR.lang === 'en' ? '?' : '؟') : C.ch, S.recall ? 'var(--purple)' : 'var(--pink)');
}
function pingChip() { $('target').classList.remove('ping'); void $('target').offsetWidth; $('target').classList.add('ping'); }

// ---------- pickups ----------
function addPickup(p) { scene.add(p.obj); S.pickups.push(p); return p; }
function removePickup(p) { scene.remove(p.obj); if (p.mat) p.mat.dispose(); if (p.glowMat) p.glowMat.dispose(); }
// one shared shadow for every bubble (was a new geometry + material per bubble, never freed)
let SHADOW_GEO = null, SHADOW_MAT = null;
function bubble(u, d, L, isTarget, color) {
  const g = new THREE.Group();
  const pos = T.pos(u, d); g.position.copy(pos);
  const mc = markColorFor(L);
  const mat = new THREE.SpriteMaterial({ map: bubbleTexture(L.ch, color, mc) });
  const spr = new THREE.Sprite(mat); spr.scale.set(4.6, 4.6, 1); spr.position.y = 3; spr.renderOrder = 2; g.add(spr);
  let glow = null, glowMat = null;
  if (isTarget) {
    // help halo, hidden until the child has made a mistake; drawn behind the bubble with normal blending
    glowMat = new THREE.SpriteMaterial({ map: glowTex(), depthWrite: false, transparent: true, opacity: 0.9 });
    glow = new THREE.Sprite(glowMat); glow.scale.set(7, 7, 1); glow.position.y = 3; glow.renderOrder = 1; glow.visible = false; g.add(glow);
  }
  if (!SHADOW_GEO) { SHADOW_GEO = new THREE.PlaneGeometry(3.4, 3.4); SHADOW_MAT = new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }); }
  const sh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.13; g.add(sh);
  return { mc, drawn: L, obj: g, spr, glow, mat, glowMat, col: color, u, d, kind: isTarget ? 'target' : 'wrong', letter: L, ph: Math.random() * 6, alive: true, r: 2.9, base: 4.6 };
}
function spawnAhead() {
  const C = cur();
  if (S.kind !== 'number') {
    const side = Math.random() < 0.5 ? 1 : -1;
    const colA = pick(BUBBLE_COLORS); let colB = pick(BUBBLE_COLORS); if (colB === colA) colB = BUBBLE_COLORS[(BUBBLE_COLORS.indexOf(colA) + 2) % BUBBLE_COLORS.length];
    const pending = S.pickups.filter(q => q.kind === 'target' && q.alive && !q.missed).length;
    // word mode: the letter after the ones already waiting on the road
    const target = isWord() ? nextLetter(pending) : isHaraka() ? sylAt(pending) : C;
    // difficulty ladder: a clearly different shape first; a dotted look-alike only once the child is doing well
    const hard = !isWord() && S.collected >= 2 && S.missStreak === 0 && !S.recentWrong;
    const ok = L => L !== C && L !== target && !(isWord() && C.parts.includes(L.ch)); // never a letter of the word itself
    let pool = [];
    if (!isHaraka()) {
      pool = TR.distractors(TR.letters.indexOf(target), hard).filter(ok);
      if (!pool.length) pool = TR.distractors(TR.letters.indexOf(target), false).filter(ok);
      if (!pool.length) pool = TR.letters.filter(ok);
    }
    // harakat: the other bubble is the same letter with another mark (بَ against بِ / بُ)
    const W = isHaraka() ? pick(SYLLABLES[S.index].filter(x => x.h !== target.h)) : pick(pool);
    const tp = addPickup(bubble(S.nextU, side * 4.4, target, true, colA));
    const wp = addPickup(bubble(S.nextU, -side * 4.4, W, false, colB));
    tp.pair = wp; wp.pair = tp;
    if ((isWord() || isHaraka()) && S.spawned === 0) tp.asked = true; // the intro already asked for the first one
    S.spawned++;
    if (S.spawned % 3 === 0 && !isWord() && !isHaraka()) { const pad = makeBoostPad(); const at = S.nextU + 34; pad.position.copy(T.pos(at, 0)); pad.position.y = 0.1; pad.rotation.y = T.heading(at); addPickup({ obj: pad, u: at, d: 0, kind: 'boost', alive: true, r: 2.6 }); }
    for (let k = 1; k <= 3; k++) spawnCoin(S.nextU + 14 + k * 9, (S.spawned % 2 ? 1 : -1) * (k - 2) * 2.4);
    // word / harakat mode: more road between pairs so the feedback and the next question finish first
    // (harakat: a wrong pick spells the syllable and asks again, up to ~6.3 s of voice; 170 u is 6.8 s at normal speed)
    S.nextU += isWord() || isHaraka() ? 170 : 78;
  } else {
    const d = pick([-4.4, 0, 4.4]);
    const g = makeApple(); g.scale.setScalar(1.35);
    g.position.copy(T.pos(S.nextU, d)); g.position.y = 2;
    addPickup({ obj: g, u: S.nextU, d, kind: 'apple', alive: true, r: 3.3, ph: Math.random() * 6 });
    S.spawned++;
    if (S.spawned % 2 === 0) for (let k = 0; k < 2; k++) spawnCoin(S.nextU + 18 + k * 9, -d * 0.5);
    S.nextU += 46;
  }
}
function spawnCoin(u, d) { const s = makeStar(); s.position.copy(T.pos(u, d)); s.position.y = 1.8; addPickup({ obj: s, u, d, kind: 'coin', alive: true, r: 2.4, ph: Math.random() * 6 }); }

const tmpV = new THREE.Vector3();
function screenPos(v) { tmpV.copy(v).project(camera); return { x: (tmpV.x + 1) / 2 * innerWidth, y: (1 - tmpV.y) / 2 * innerHeight }; }
function flyToSlot(worldPos, html, slotIdx, cls) {
  const slot = $('slots').children[slotIdx]; if (!slot) return;
  const a = screenPos(worldPos), r = slot.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'flyer'; f.innerHTML = html;
  if (cls) f.style.background = cls;
  f.style.left = a.x + 'px'; f.style.top = a.y + 'px'; document.body.appendChild(f);
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height / 2) + 'px'; f.style.transform = 'scale(.55)'; }));
  setTimeout(() => { f.remove(); slot.classList.add('on'); slot.innerHTML = html; if (cls) slot.style.background = cls; }, 720);
}
// shows a praise word and returns the SAME word for the voice (never the same one twice in a row)
function praise() {
  let i = (Math.random() * TR.praiseShow.length) | 0;
  if (i === S.lastPraise) i = (i + 1) % TR.praiseShow.length;
  S.lastPraise = i;
  const el = $('praise'); el.textContent = TR.praiseShow[i]; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  return TR.praise[i];
}
// a big red ✕ for a wrong pick, in every mode (the voice still names what was picked)
function showX() { const el = $('xmark'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
function hitPickup(p) {
  p.alive = false;
  const wp = p.obj.position.clone(); wp.y += 2.5;
  const C = cur();
  if (p.kind === 'target') {
    const n = S.collected++; S.missStreak = 0; S.recentWrong = false; kart.cheerT = 1.4;
    Sound.collect(n); haptic('tick'); confetti.burst(wp, 22, 6, null, 0.45);
    if (isWord()) {
      // the letter flies into the word, which fills in; the bubbles ahead switch to the next letter
      flyToWord(wp, p.letter.ch); retarget(); chipShowsTarget(); pingChip();
      if (S.collected >= S.need) { praise(); Voice.say([TR.lines.wordBlend(C), TR.lines.gate], { gap: 500 }); }
      else Voice.say([p.letter.name, askNext(p)], { gap: 350 });
      p.pop = 0;
      return;
    }
    if (isHaraka()) {
      // the syllable fills its slot on its mark's colour; the bubbles ahead switch to the next one
      const x = p.letter;
      flyToSlot(wp, `<img class="syl" alt="${x.ch}" src="${syllableURL(x.ch)}">`, n, x.color);
      if (S.collected === 3) S.recall = true; // second half: white marks, the voice asks, the chip shows ؟
      retarget(); chipShowsTarget(); pingChip();
      if (S.collected >= S.need) { praise(); Voice.say([HLINES.chant(S.index), TR.lines.gate], { gap: 450 }); }
      // the syllable once («بَ»), then the next question: the spelling is kept for wrong picks and the chip tap
      else Voice.say([x.tts, askNext(p)], { gap: 350 });
      p.pop = 0;
      return;
    }
    flyToSlot(wp, C.ch, n);
    pingChip();
    // after 2 letters: recall rounds, the chip hides the glyph and the voice asks for it
    if (S.kind === 'letter' && S.collected === 2 && S.need > 3) { S.recall = true; setTimeout(() => { if (S.mode === 'drive' && S.recall && !S.chipBusy) chipShowsTarget(); }, 900); }
    if (S.collected >= S.need) Voice.say([praise(), TR.lines.gate], { gap: 350 });
    // the letter's NAME only (the owner: no «أَ، أَسَد» after a pick), praise on every other one, then the next question
    else if (S.collected % 2 === 1) Voice.say([C.name, askNext(p)], { gap: 350 });
    else Voice.say([C.name, praise(), askNext(p)], { gap: 300 });
    p.pop = 0;
  } else if (p.kind === 'wrong') {
    S.wrong++; S.wobble = 0.6; S.recentWrong = true;
    if (p.pair) p.pair.handled = true; // its target will pass behind the kart: already counted as this mistake
    const T0 = p.pair && p.pair.letter ? p.pair.letter : C;
    addMissNow();
    Sound.wrong(); haptic('bump'); showX();
    p.mat.color.setHex(0x9aa5b1);
    // name what was picked, then ask again for the right one, and show it on the chip for a moment
    const nx = nextTarget(p.pair) || p.pair;
    // word mode: the letter still missing (this pair's target is about to be passed, not yet counted as missed)
    const want = isWord() ? nextLetter() : isHaraka() ? sylAt(0) : nx && nx.letter ? nx.letter : T0;
    if (nx) nx.asked = true;
    S.askedCh = want.ch; S.askedT = S.t;
    if (isHaraka()) retarget(); // the marks on the road get their colours back straight away
    // harakat: spell what was picked («بَاءْ، كَسْرَة، بِ»), then ask for the wanted one
    Voice.say([isHaraka() ? HLINES.spell(p.letter) : TR.lines.wrong(p.letter), findLine(want)], { gap: 300 });
    setChip(want.ch, isHaraka() ? want.color : 'var(--pink)'); pingChip(); S.chipBusy = true;
    clearTimeout(S.chipT); S.chipT = setTimeout(() => { S.chipBusy = false; if (S.mode === 'drive') chipShowsTarget(); }, 2600);
    p.pop = 0;
  } else if (p.kind === 'apple') {
    const n = S.collected++;
    Sound.collect(n); haptic('tick'); confetti.burst(wp, 20, 6, [0xff3b3b, 0xffd60a, 0x51cf66, 0xffffff], 0.45);
    flyToSlot(wp, `<span style="font-size:.8em">${TR.digits(n + 1)}</span>`, n, '#ff4d4d');
    const num = TR.numbers[n + 1] ? TR.numbers[n + 1].say : '';
    if (S.collected >= S.need) { praise(); Voice.say([num, TR.lines.gate], { gap: 500 }); }
    else Voice.say(num);
    p.pop = 0;
  } else if (p.kind === 'coin') {
    S.coins++; $('hstars').textContent = S.coins; Sound.star(); confetti.burst(wp, 6, 4, [0xffd60a, 0xfff3bf], 0.35);
    p.pop = 0;
  } else if (p.kind === 'boost') {
    S.boostT = 1.6; Sound.boost(); haptic('boost'); p.alive = true; p.used = true;
  }
}
// the next target bubble still ahead of the kart (skipping `not`)
function nextTarget(not) {
  let best = null, bd = 1e9;
  for (const q of S.pickups) { if (q.kind !== 'target' || !q.alive || q === not) continue; const du = T.delta(S.u, q.u); if (du > 1 && du < bd) { bd = du; best = q; } }
  return best;
}
// the question for the next pair, said right after the feedback for this one (never cut off by it):
// in recall rounds and after a mistake
function askNext(cur0) {
  const nx = nextTarget(cur0);
  if (!nx || nx.asked) return null;
  if (!(isWord() || isHaraka() || S.recall || S.missStreak >= 1 || S.recentWrong)) return null;
  nx.asked = true;
  return findLine(nx.letter);
}
// the child is not steering at all: bring the letter straight ahead (counted as helped)
function assistPair(p) {
  if (!p || p.assist) return;
  p.d = 0; p.obj.position.copy(T.pos(p.u, 0)); p.assist = true;
  if (p.pair) { p.pair.used = true; p.pair.mat.color.setHex(0x9aa5b1); p.pair.mat.opacity = 0.5; p.pair.mat.transparent = true; }
}
// a pair comes into view: help after mistakes; speaks only if nothing asked yet
function announcePair(p) {
  p.announced = true;
  if (S.missStreak >= 3) assistPair(p);
  if (p.glow && set().hint && (S.missStreak >= 1 || S.recentWrong)) p.glow.visible = true;
  // fallback only for the nearest pair: a pair further back would be cut off by the feedback of the one in front
  if (!p.asked && !Voice.busy && nextTarget(null) === p && (isWord() || isHaraka() || S.recall || S.missStreak >= 1 || S.recentWrong)) { p.asked = true; Voice.say(findLine(p.letter)); }
}
// word mode: bubbles already on the road ask for the letters still missing, in order
function retarget() {
  if (isHaraka()) return retargetHaraka();
  if (!isWord()) return;
  const W = cur();
  const ts = S.pickups.filter(q => q.kind === 'target' && q.alive && !q.missed).sort((a, b) => T.delta(S.u, a.u) - T.delta(S.u, b.u));
  ts.forEach((q, i) => {
    const L = nextLetter(i);
    if (q.letter === L) return;
    // keep `asked` when this letter was just asked for after a wrong pick (no double question)
    q.letter = L; q.asked = L.ch === S.askedCh && S.t - (S.askedT || -99) < 4;
    q.mat.map = bubbleTexture(L.ch, q.col); q.mat.needsUpdate = true;
    if (q.pair && (q.pair.letter === L || W.parts.includes(q.pair.letter.ch))) {
      const pool = TR.distractors(TR.letters.indexOf(L), false).filter(x => !W.parts.includes(x.ch));
      if (pool.length) { q.pair.letter = pick(pool); q.pair.mat.map = bubbleTexture(q.pair.letter.ch, q.pair.col); q.pair.mat.needsUpdate = true; }
    }
  });
}
// harakat: bubbles ahead ask for the syllables still missing, in order; the other bubble never shows the same mark
function retargetHaraka() {
  const ts = S.pickups.filter(q => q.kind === 'target' && q.alive && !q.missed).sort((a, b) => T.delta(S.u, a.u) - T.delta(S.u, b.u));
  ts.forEach((q, i) => {
    const x = sylAt(i);
    if (q.letter !== x) { q.letter = x; q.asked = x.ch === S.askedCh && S.t - (S.askedT || -99) < 4; }
    if (q.pair && q.pair.letter.h === x.h) q.pair.letter = pick(SYLLABLES[S.index].filter(y => y.h !== x.h));
    // redraw when the letter OR the colour rule changed (recall starts, a mistake brings colours back)
    for (const b of q.pair ? [q, q.pair] : [q]) {
      const mc = markColorFor(b.letter);
      if (b.drawn !== b.letter || b.mc !== mc) { b.mc = mc; b.drawn = b.letter; b.mat.map = bubbleTexture(b.letter.ch, b.col, mc); b.mat.needsUpdate = true; }
    }
  });
}
function flyToWord(worldPos, ch) {
  const hud = $('wordhud'), a = screenPos(worldPos), r = hud.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'flyer'; f.textContent = ch;
  f.style.left = a.x + 'px'; f.style.top = a.y + 'px'; document.body.appendChild(f);
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height / 2) + 'px'; f.style.transform = 'scale(.5)'; }));
  setTimeout(() => { f.remove(); drawWordHud(); $('wordhud').classList.remove('pop'); void $('wordhud').offsetWidth; $('wordhud').classList.add('pop'); }, 720);
}
function updatePickups(dt) {
  const t = S.t;
  for (const p of S.pickups) {
    if (p.spr) {
      // bubbles far away are drawn bigger, so the letter is readable early enough to choose a side
      const du0 = T.delta(S.u, p.u);
      if (p.alive) p.base = clamp(4.6 + (du0 - 22) * 0.04, 4.6, 8);
      const bob = Math.sin(t * 3 + p.ph) * 0.35;
      p.spr.position.y = 3 + bob + (p.base - 4.6) * 0.3;
      if (p.glow) { p.glow.position.y = p.spr.position.y; const s = p.base * 1.55 + Math.sin(t * 6 + p.ph) * 0.4; p.glow.scale.set(s, s, 1); }
      if (p.alive) { const s = p.base + (p.kind === 'target' ? Math.sin(t * 5 + p.ph) * 0.2 : 0); p.spr.scale.set(s, s, 1); }
    } else if (p.kind === 'apple' || p.kind === 'coin') {
      p.obj.rotation.y += dt * 2.5; if (p.alive) p.obj.position.y = (p.kind === 'apple' ? 2 : 1.8) + Math.sin(t * 3 + p.ph) * 0.3;
    }
    if (p.pop != null) {
      p.pop += dt;
      const k = p.pop / 0.35;
      if (p.spr) { const s = p.base * (1 - k * 0.7); p.spr.scale.set(s, s, 1); p.spr.position.y += k * 3; p.mat.opacity = 1 - k; p.mat.transparent = true; if (p.glow) p.glow.visible = false; }
      else { p.obj.scale.setScalar((p.kind === 'apple' ? 1.35 : 1) * Math.max(0.05, 1 - k)); p.obj.position.y += dt * 10; }
      if (k >= 1) { p.dead = true; }
    }
  }
  // collisions + cleanup
  for (const p of S.pickups) {
    const du = T.delta(S.u, p.u);
    if (p.kind === 'target' && p.alive && !p.announced && du < 95) announcePair(p);
    if (p.alive && !p.used && du < 1.8 && du > -1.8 - S.speed * dt && Math.abs(S.d - p.d) < p.r) { if (p.assist) S.assisted++; hitPickup(p); }
    if (p.kind === 'target' && p.alive && !p.missed && du < -3) {
      p.missed = true;
      if (!p.handled) { S.missStreak++; S.misses++; addMissNow(); }
      if (isWord() || isHaraka()) retarget();
      const nx = nextTarget(p);
      if (nx) {
        if (S.missStreak >= 3) assistPair(nx);
        if (nx.glow && set().hint) nx.glow.visible = true;
      }
      const q = askNext(p);
      if (q) Voice.say(q, { interrupt: false });
    }
    if (du < -4.5 && p.pop == null) p.dead = true;
    else if (du < -10) p.dead = true;
  }
  const keep = [];
  for (const p of S.pickups) { if (p.dead) removePickup(p); else keep.push(p); }
  S.pickups = keep;
}

// ---------- kart ----------
function syncKart(dt) {
  const m = kart;
  const pos = T.pos(S.u, S.d);
  const h = T.heading(S.u) + Math.atan2(S.vd, Math.max(6, S.speed));
  m.root.position.copy(pos);
  m.root.rotation.y = h;
  const wob = S.wobble > 0 ? Math.sin(S.wobble * 40) * S.wobble * 0.25 : 0;
  m.tilt.rotation.z = damp(m.tilt.rotation.z, -S.vd * 0.018 + wob, 10, dt || 0.016);
  m.tilt.position.y = Math.sin(S.t * 18) * 0.03 * Math.min(1, S.speed / 10);
  for (const w of m.wheels) { w.spin.rotation.x += S.speed * (dt || 0) / w.r; if (w.front) w.steer.rotation.y = S.steer * 0.4; }
  m.wheel.rotation.z = S.steer * 0.8;
  m.flag.rotation.y = Math.sin(S.t * 9) * 0.3;
}
function driveKart(dt, allowSteer, targetSpeed) {
  const s = allowSteer ? steerInput() : 0;
  S.steer = damp(S.steer, s, 12, dt);
  if (S.boostT > 0) S.boostT -= dt;
  const tgt = targetSpeed + (S.boostT > 0 ? 12 : 0);
  S.speed = damp(S.speed, tgt, S.speed < tgt ? 1.6 : 2.4, dt);
  S.vd = damp(S.vd, S.steer * 14, 9, dt);
  S.d += S.vd * dt;
  if (Math.abs(S.d) > LANE) { S.d = Math.sign(S.d) * LANE; if (Math.abs(S.vd) > 6) { Sound.bump(); haptic('tick'); } S.vd = 0; }
  if (S.wobble > 0) S.wobble -= dt;
  S.u = T.wrapU(S.u + S.speed * dt);
}
const baseSpeed = () => (set().speed === 'slow' ? 19 : 25);

// ---------- camera ----------
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function chaseTargets(outPos, outLook) {
  const p = T.pos(S.u, S.d);
  const fx = Math.sin(S.camH), fz = Math.cos(S.camH);
  outPos.set(p.x - fx * 13.5, 6.4, p.z - fz * 13.5);
  outLook.set(p.x + fx * 9, 1.8, p.z + fz * 9);
}
function updateChase(dt, k = 5) {
  S.camH = S.camH + Math.atan2(Math.sin(T.heading(S.u + 6) - S.camH), Math.cos(T.heading(S.u + 6) - S.camH)) * (1 - Math.exp(-4 * dt));
  const tp = new THREE.Vector3(), tl = new THREE.Vector3();
  chaseTargets(tp, tl);
  camPos.x = damp(camPos.x, tp.x, k, dt); camPos.y = damp(camPos.y, tp.y, k, dt); camPos.z = damp(camPos.z, tp.z, k, dt);
  camLook.x = damp(camLook.x, tl.x, k * 1.5, dt); camLook.y = damp(camLook.y, tl.y, k * 1.5, dt); camLook.z = damp(camLook.z, tl.z, k * 1.5, dt);
  camera.position.copy(camPos); camera.lookAt(camLook);
}
function followSun(target) {
  sun.position.set(target.x + 45, target.y + 90, target.z + 30); sun.target.position.copy(target); sun.target.updateMatrixWorld();
}

// ---------- gate + stage ----------
function spawnGate() {
  const C = cur();
  // remove anything still waiting ahead
  for (const p of S.pickups) if (T.delta(S.u, p.u) > 6 && p.kind !== 'coin') { p.dead = true; }
  S.archU = T.wrapU(S.u + (S.need === 0 ? 75 : 105));
  const arch = S.kind === 'word' ? makeArch(C.word, '') : isHaraka() ? makeArch(sylRow(S.index), '') : makeArch(S.kind === 'letter' ? C.ch : C.digit, C.word);
  arch.group.position.copy(T.pos(S.archU, 0)); arch.group.rotation.y = T.heading(S.archU);
  scene.add(arch.group); S.arch = arch;
  Sound.gateOpen();
  // coins leading to the gate
  for (let k = 1; k <= 5; k++) spawnCoin(S.archU - 16 * k, Math.sin(k) * 3);
}
function buildStage() {
  const C = cur();
  S.stageU = T.wrapU(S.archU + 32);
  const road = T.pos(S.stageU, 0), nrm = T.normal(S.stageU);
  let best = null;
  for (const side of [1, -1]) {
    const c = road.clone().addScaledVector(nrm, side * (FENCE + 18));
    const cl = T.clearance(c.x, c.z, S.stageU, 45);
    if (!best || cl > best.cl) best = { c, cl, side };
  }
  S.stageC.copy(best.c);
  // hide nearby enclosures so the stage is clear
  for (const h of S.slotHabs) if (h) h.group.visible = h.group.position.distanceTo(best.c) > 34;
  const ids = S.kind !== 'number' ? [C.animal] : [];
  const hab = makeHabitat(C.biome, ids, S.kind === 'word' ? { big: C.word, word: '' } : isHaraka() ? { big: sylRow(S.index), word: '' } : { big: S.kind === 'letter' ? C.ch : C.digit, word: C.word }, { radius: 12, animalScale: 1.35, seed: 99 + S.index, signBack: true });
  hab.group.position.copy(best.c); hab.group.rotation.y = Math.atan2(road.x - best.c.x, road.z - best.c.z);
  hab.items = hab.animals.map(a => ({ root: a.root, baseScale: a.baseScale, animal: a }));
  if (S.kind === 'number') {
    // numbers: exactly n apples on a table, they appear one by one while counting
    const table = makeAppleTable(C.n, TR.digits, TR.lang === 'en');
    table.group.position.set(0, 0.36, 1.5); hab.group.add(table.group);
    hab.items = table.apples;
  }
  scene.add(hab.group); S.stage = hab;
}

// ---------- celebration ----------
function drawCard() {
  const C = cur(), cv = $('wordcv'), g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  const cx = cv.width / 2;
  if (isHaraka()) {
    // three circles, one per mark, with the mark's name under each (right to left: fatha first)
    SYLLABLES[S.index].forEach((x, k) => {
      const X = cx + (1 - k) * 200;
      g.fillStyle = x.color; g.beginPath(); g.arc(X, 150, 86, 0, TAU); g.fill();
      g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
      drawSyllable(g, x.ch, X, 150, 150, '#ffffff', 'rgba(0,0,0,.25)', '#ffffff');
      g.font = `800 46px ${FONT}, sans-serif`; g.fillStyle = x.color; g.fillText(ui().hnames[k], X, 300);
    });
  } else if (S.kind === 'word') {
    // the letters one by one, then the word they make (Arabic: joined)
    g.direction = TR.lang === 'en' ? 'ltr' : 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 92px ${FONT}, sans-serif`; g.fillStyle = '#ff4d6d';
    g.fillText(C.parts.join(TR.lang === 'en' ? ' + ' : ' + '), cx, 95);
    g.font = `800 60px ${FONT}, sans-serif`; g.fillStyle = '#8a5cf6'; g.fillText('↓', cx, 185);
    drawWordProgress(g, C.word, C.parts.length, cx, 300, C.word.length > 3 ? 150 : 175, '#2b1b6b', '#2b1b6b');
  } else if (S.kind === 'letter') {
    g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(cx, 140, 128, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.arc(cx, 150, 128, 0, Math.PI); g.fill();
    // English: capital + small letter («Aa»), the word left-to-right with its letter highlighted
    const en = TR.lang === 'en';
    g.direction = en ? 'ltr' : 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${en ? 150 : 190}px ${FONT}, sans-serif`;
    g.fillStyle = '#fff'; g.fillText(en ? C.card : C.ch, cx, en ? 158 : 168);
    drawWord(g, C.word, cx, 345, C.word.length > 6 ? 82 : 110, '#2b1b6b', '#ff4d6d', null, C.hi || 0);
  } else {
    g.fillStyle = '#ff922b'; g.beginPath(); g.arc(cx - 70, 140, 128, 0, TAU); g.fill();
    g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${C.n >= 10 ? 150 : 200}px ${FONT}, sans-serif`;
    g.fillStyle = '#fff'; g.fillText(C.digit, cx - 70, 170);
    g.fillStyle = '#ffd6a8'; g.beginPath(); g.arc(cx + 130, 175, 62, 0, TAU); g.fill();
    g.font = `800 84px ${FONT}, sans-serif`; g.fillStyle = '#c2410c'; g.direction = TR.lang === 'en' ? 'rtl' : 'ltr'; g.fillText(TR.lang === 'en' ? C.alt : String(C.n), cx + 130, TR.lang === 'en' ? 192 : 186); // the same number in the other script
    drawWord(g, C.word, cx, 350, 110, '#2b1b6b', null);
  }
}
function celebrate() {
  const C = cur();
  S.mode = 'celebrate'; S.modeT = 0; S.countQ = null;
  // honest stars: wrong picks AND missed letters count; a level the game had to steer for is at most 2 stars
  const errs = S.wrong + S.misses;
  let stars = S.kind !== 'number' ? (errs <= 1 ? 3 : errs <= 3 ? 2 : 1) : 3;
  if (S.assisted > 0) stars = Math.min(stars, S.assisted > 2 ? 1 : 2);
  const first = Store.complete(S.kind, S.index, stars, TR.lang);
  // the road stars go into the wallet the garage spends; say so when they now reach a new item
  const walletBefore = Store.data.totalStars;
  Store.data.totalStars += S.coins; Store.save();
  const gifts = newlyAffordable(walletBefore, Store.data.totalStars, Store.data.owned);
  drawCard();
  const cs = $('cstars'); cs.innerHTML = '';
  for (let i = 0; i < 3; i++) { cs.insertAdjacentHTML('beforeend', ICON.star); }
  [...cs.children].forEach((el, i) => { if (i < stars) setTimeout(() => { el.classList.add('on'); Sound.star(); }, 500 + i * 300); });
  $('friend').textContent = S.kind === 'word' ? ui().wordDone : isHaraka() ? ui().harakaDone : first && S.kind === 'letter' ? ui().friend : '';
  if (gifts.length) $('friend').textContent += `  🎁 ${ui().garageNew} ${gifts.map(g => g.icon || '🎨').join(' ')}`;
  $('friend').dir = ui().dir;
  $('celebrate').classList.remove('hidden');
  $('hud').classList.add('hidden');
  Sound.fanfare(); haptic('win');
  confetti.burst(S.stageC.clone().setY(6), 90, 16);
  S.happyT = 3.5;
  sayCelebration(first);
}
function sayCelebration(first) {
  const C = cur();
  if (isHaraka()) {
    Voice.say([HLINES.chant(S.index), praise()], { gap: 500 });
  } else if (S.kind === 'word') {
    Voice.say([C.say, TR.lines.wordBlend(C), praise()], { gap: 500 });
  } else if (S.kind === 'letter') {
    Voice.say([C.name, TR.lines.sound(C), praise()].concat(first ? [TR.lines.newFriend] : []), { gap: 450 });
  } else if (C.n === 0) {
    Voice.say([C.say, TR.lines.numberIntro(C), pick(TR.praise)]);
  } else {
    // animals appear one by one while counting
    S.countQ = []; let t = 0.6;
    S.stage.items.forEach((a, i) => { S.countQ.push({ t, i }); t += 1.05; });
    S.countEnd = t;
    S.countSaid = false;
  }
}
function updateCounting(dt) {
  if (S.kind !== 'number' || !S.countQ) return;
  for (const q of S.countQ) {
    if (!q.done && S.modeT >= q.t) {
      q.done = true;
      const a = S.stage.items[q.i]; a.root.visible = true; a.popT = 0;
      Sound.count(q.i); confetti.burst(a.root.getWorldPosition(new THREE.Vector3()).setY(4), 14, 7);
      Voice.say(TR.numbers[q.i + 1].say);
    }
  }
  for (const a of S.stage.items) if (a.popT != null && a.popT < 1) { a.popT = Math.min(1, a.popT + dt * 3.5); const k = a.popT; const e = 1 + Math.sin(k * Math.PI) * 0.35; a.root.scale.setScalar(a.baseScale * k * e); }
  if (!S.countSaid && S.modeT > S.countEnd + 0.4) { S.countSaid = true; const C = cur(); Voice.say([C.say, pick(TR.praise)], { gap: 400 }); S.happyT = 3; }
}
function celebrateCamera(dt) {
  const c = S.stageC, road = T.pos(S.stageU, 0);
  const toRoad = new THREE.Vector3().subVectors(road, c).setY(0).normalize();
  const ang = S.kind !== 'number' ? Math.sin(S.t * 0.25) * 0.22 + 0.2 : Math.sin(S.t * 0.25) * 0.08 + 0.04;
  const dir = toRoad.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
  const h = S.kind !== 'number' && S.stage.animals[0] ? S.stage.animals[0].height * 1.35 : 5.5;
  const many = S.kind === 'number' && cur().n > 5;
  const dist = S.kind !== 'number' ? Math.min(19, 8 + h * 1.15) : many ? 19 : 16;
  const tp = c.clone().addScaledVector(dir, dist); tp.y = many ? 7.5 : 3 + h * 0.6;
  const look = c.clone(); look.y = h * (S.kind !== 'number' ? 0.55 : 0.5);
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(look, tp).normalize(), new THREE.Vector3(0, 1, 0)).normalize();
  // slide camera and target together so the subject sits on the right of the card, seen straight on
  const shift = dist * (S.kind !== 'number' ? 0.3 : 0.42) * Math.min(1.4, camera.aspect / 1.8);
  look.addScaledVector(right, -shift); tp.addScaledVector(right, -shift);
  camPos.x = damp(camPos.x, tp.x, 2.2, dt); camPos.y = damp(camPos.y, tp.y, 2.2, dt); camPos.z = damp(camPos.z, tp.z, 2.2, dt);
  camLook.x = damp(camLook.x, look.x, 3, dt); camLook.y = damp(camLook.y, look.y, 3, dt); camLook.z = damp(camLook.z, look.z, 3, dt);
  camera.position.copy(camPos); camera.lookAt(camLook);
}
// tap the animal to hear it again
const ray = new THREE.Raycaster();
canvas.addEventListener('pointerdown', e => {
  if (S.mode !== 'celebrate' || !S.stage) return;
  ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hits = ray.intersectObjects(S.stage.items.map(a => a.root), true);
  if (hits.length) {
    S.happyT = 2.5; Sound.pop(); haptic('tick');
    const C = cur();
    Voice.say(S.kind === 'letter' ? C.say : [C.say]);
    confetti.burst(hits[0].point, 16, 7);
  }
});

// ---------- screens ----------
function showScreen(name) {
  for (const id of ['title', 'map', 'hud']) $(id).classList.toggle('hidden', id !== name);
  if (name !== 'none') $('garage').classList.add('hidden');
  if (name !== 'hud') { $('intro').classList.add('hidden'); $('celebrate').classList.add('hidden'); }
}
function toTitle() {
  clearLevel(); populateZoo(-1, true);
  S.mode = 'title'; S.modeT = 0; S.u = 4; S.d = 0; S.speed = 0; syncKart(0);
  showScreen('title');
}
let mapTab = 'letter', wordPack = 'zoo';
// map tab -> track: 'letter' | 'number' (Arabic), 'enletter' | 'ennumber' (English)
const tabInfo = t => ({ kind: t.replace(/^en/, ''), lang: t.startsWith('en') ? 'en' : 'ar' });
function toMap(tab) {
  const fromLevel = ['intro', 'drive', 'arrive', 'celebrate'].includes(S.mode);
  if (!tab && fromLevel && S.lang) { mapTab = (S.lang === 'en' ? 'en' : '') + S.kind; if (S.kind === 'word') wordPack = cur().pack || 'zoo'; }
  clearLevel(); Voice.stop(); Sound.engineHum(0, false);
  if (tab) mapTab = tab;
  S.mode = 'map'; S.paused = false;
  $('pause').classList.add('hidden');
  showScreen('map');
  renderMap();
  Sound.startMusic();
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { Sound.click(); mapTab = b.dataset.tab; renderMap(); }));

// animal thumbnails for the map (rendered once with a small second renderer)
let thumbR = null; const thumbs = new Map();
function thumb(id) {
  if (thumbs.has(id)) return thumbs.get(id);
  if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(220, 220); thumbR.setClearColor(0x000000, 0); }
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xffffff, 0x99aa77, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(4, 8, 7); s.add(d);
  const a = makeFriend(id); a.update(0.4, 'idle'); a.root.rotation.y = 0.5; s.add(a.root);
  const box = new THREE.Box3().setFromObject(a.root), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const R = Math.max(sz.x * 0.9, sz.y, sz.z * 0.8) * 0.62;
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100); cam.position.set(c.x + R * 0.8, c.y + R * 0.35, c.z + R * 2.9); cam.lookAt(c);
  thumbR.render(s, cam);
  const url = thumbR.domElement.toDataURL('image/png');
  thumbs.set(id, url); return url;
}
function renderMap() {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === mapTab));
  $('totstars').textContent = Store.data.totalStars;
  const { kind: tKind, lang: tLang } = tabInfo(mapTab), track = TRACKS[tLang];
  const list = tKind === 'letter' || tKind === 'haraka' ? track.letters : tKind === 'word' ? track.words : track.numbers;
  const arr = Store.prog(tKind, tLang);
  // word tabs: one themed pack at a time (zoo, home, market, sea, nature), chosen with the chips row
  const packs = $('packs'); packs.classList.toggle('hidden', tKind !== 'word'); packs.innerHTML = '';
  if (tKind === 'word') for (const pk of WORD_PACKS) {
    const ids = list.map((w, i) => (w.pack === pk ? i : -1)).filter(i => i >= 0);
    const paid = !ids.some(i => Purchase.canPlay('word', i));
    const got = ids.filter(i => arr[i] > 0).length;
    const b = document.createElement('button'); b.className = 'pack' + (pk === wordPack ? ' on' : '');
    b.innerHTML = `<span class="pe">${PACK_ICON[pk]}</span>${ui().packs[pk]}<small>${paid ? '🔒' : `${got}/${ids.length}`}</small>`;
    b.addEventListener('click', () => { Sound.click(); haptic('tick'); wordPack = pk; renderMap(); });
    packs.appendChild(b);
  }
  const idx = list.map((_, i) => i).filter(i => tKind !== 'word' || list[i].pack === wordPack);
  const world = $('world'), path = $('path');
  const H = path.clientHeight || innerHeight * 0.85;
  const gap = Math.max(118, H * 0.42), pad = gap * 0.9;
  const W = Math.max(path.clientWidth || innerWidth, pad * 2 + gap * (idx.length - 1));
  world.style.width = W + 'px';
  [...world.querySelectorAll('.node,.deco')].forEach(e => e.remove());
  // Arabic path runs right-to-left, English left-to-right (reading direction)
  const pts = idx.map((_, i) => ({ x: tLang === 'en' ? pad + i * gap : W - pad - i * gap, y: H * (0.5 + Math.sin(i * 1.15) * 0.22) }));
  // trail
  let dstr = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], mx = (a.x + b.x) / 2; dstr += ` C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`; }
  const firstOpen = idx.findIndex(i => !arr[i]);
  const doneUntil = firstOpen < 0 ? pts.length - 1 : firstOpen;
  $('trail').setAttribute('viewBox', `0 0 ${W} ${H}`);
  $('trail').innerHTML = `<path d="${dstr}" fill="none" stroke="#f3e2b3" stroke-width="${H * 0.11}" stroke-linecap="round"/><path d="${dstr}" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="14 16" stroke-linecap="round" opacity=".9"/>`;
  // decorations
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < Math.max(6, idx.length) * 2.2; i++) {
    const x = rnd() * W, y = H * (rnd() < 0.5 ? 0.04 + rnd() * 0.12 : 0.86 + rnd() * 0.1);
    const el = document.createElement('div'); el.className = 'deco tree';
    const s = 26 + rnd() * 34; el.style.cssText = `left:${x}px;top:${y - s}px;--s:${s}px;--c:${['#3fae4a', '#2f9e44', '#58c25a', '#7bd36a'][(rnd() * 4) | 0]}`;
    el.innerHTML = '<div class="top"></div><div class="trunk"></div>'; world.appendChild(el);
  }
  // nodes
  let currentEl = null;
  idx.forEach((i, j) => {
    const item = list[i], prev = j > 0 ? idx[j - 1] : -1;
    const el = document.createElement('div');
    // a word opens like any level (the first of each pack is free, then after the one before), or early once all its letters are learned
    const lp = Store.prog('letter', tLang);
    const unlocked = tKind === 'word' ? (Store.data.unlockAll || prev < 0 || arr[i] > 0 || arr[prev] > 0 || item.parts.every(ch => lp[track.letters.findIndex(x => x.ch === ch)] > 0)) : Store.unlocked(tKind, i, tLang);
    const paid = !Purchase.canPlay(tKind, i);
    const done = arr[i] > 0 && !paid;
    const glyph = tKind === 'letter' ? item.ch : tKind === 'word' ? item.word : tKind === 'haraka' ? sylImgs(i) : item.digit;
    el.className = 'node ' + (done ? 'done' : unlocked && !paid ? 'current' : 'locked') + (paid ? ' paid' : '');
    if (tKind === 'word' || tKind === 'haraka') el.classList.add('wordnode');
    el.style.left = pts[j].x + 'px'; el.style.top = pts[j].y + 'px';
    if (done) {
      const img = document.createElement('img'); img.alt = ''; el.appendChild(img);
      // numbers have no animal: show the glyph (thumb(undefined) used to throw and leave the tile blank)
      if (tKind !== 'number') setTimeout(() => { img.src = thumb(item.animal); }, 10 + j * 25);
      else { img.remove(); el.insertAdjacentHTML('beforeend', `<span class="glyph${tKind === 'word' || tKind === 'haraka' ? ' word' : ''}">${glyph}</span>`); }
      el.insertAdjacentHTML('beforeend', `<span class="badge">${tKind === 'haraka' ? item.ch : glyph}</span><div class="stars">${[0, 1, 2].map(k => (k < arr[i] ? ICON.star : ICON.starOff)).join('')}</div>`);
    } else {
      el.insertAdjacentHTML('beforeend', `<span class="glyph${tKind === 'word' || tKind === 'haraka' ? ' word' : ''}">${glyph}</span>`);
      if (paid) el.insertAdjacentHTML('beforeend', '<div class="lock gold">★</div>');
      else if (unlocked) { el.insertAdjacentHTML('beforeend', `<div class="pin">${kartSvg(KART_COLORS[Store.data.kart])}</div>`); if (!currentEl) currentEl = el; }
      else el.insertAdjacentHTML('beforeend', `<div class="lock">${ICON.lock}</div>`);
    }
    el.addEventListener('click', () => {
      Sound.init();
      if (paid) { Sound.click(); openPaywall(); return; }
      if (!unlocked && !done) { Sound.lock(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
      Sound.click(); haptic('tick');
      startLevel(tKind, i, tLang);
    });
    world.appendChild(el);
  });
  const focus = currentEl || world.querySelectorAll('.node')[Math.min(doneUntil, idx.length - 1)];
  requestAnimationFrame(() => { if (focus) path.scrollLeft = parseFloat(focus.style.left) - path.clientWidth / 2; });
}

// ---------- title + garage ----------
// the kart as the child customised it (body, colour, hat, skin tone, animal co-pilot)
function setKart() {
  if (kart) { scene.remove(kart.root); disposeOwned(kart.root); }
  const look = Store.data.look;
  kart = makeKart(KART_COLORS[Store.data.kart] || KART_COLORS[1], look);
  kart.pilotAnimal = null; kart.driverAnimal = null;
  // an animal at the wheel (the garage's driver tab): same scaling as the co-pilot, a little bigger
  if (kart.driverId) {
    try {
      const a = makeAnimal(kart.driverId);
      a.root.scale.multiplyScalar(2.1 / Math.max(0.5, a.height)); a.root.rotation.y = 0;
      kart.driver.add(a.root); kart.driverAnimal = a;
    } catch (e) { look.driver = 'boy'; return setKart(); } // unknown id in an old save: back to the child
  }
  if (look.pilot && metAnimals().includes(look.pilot)) {
    try {
      const a = makeAnimal(look.pilot);
      a.root.scale.multiplyScalar(1.55 / Math.max(0.5, a.height)); a.root.rotation.y = 0;
      kart.pilot.add(a.root); kart.pilotAnimal = a;
    } catch (e) { /* unknown animal: ride alone */ }
  }
  scene.add(kart.root); syncKart(0);
}
// animals the child has befriended (finished letters and words, both languages), most recent first
function metAnimals() {
  const ids = [];
  for (const lang of ['ar', 'en']) {
    const tr = TRACKS[lang];
    Store.prog('letter', lang).forEach((st, i) => { if (st > 0) ids.push(tr.letters[i].animal); });
    Store.prog('word', lang).forEach((st, i) => { if (st > 0) ids.push(tr.words[i].animal); });
  }
  return [...new Set(ids)].filter(isAnimal); // objects (cup, sun...) do not ride the kart
}
let gTab = 'body', gFrom = 'title';
function openGarage(from) {
  Sound.init(); Sound.click(); haptic('tick');
  gFrom = from || 'title';
  clearLevel(); Voice.stop();
  showScreen('none');
  S.mode = 'garage'; S.modeT = 0; S.u = 4; S.d = 0; S.speed = 0; syncKart(0);
  renderGarage();
  $('garage').classList.remove('hidden');
  Sound.startMusic();
}
function closeGarage() {
  Sound.click();
  $('garage').classList.add('hidden');
  if (gFrom === 'map') toMap(); else toTitle();
}
function renderGarage() {
  const u = ui(), have = Store.data.totalStars, look = Store.data.look;
  $('gstars').textContent = have;
  const tabs = $('gtabs'); tabs.innerHTML = '';
  for (const t of GARAGE_TABS) {
    const b = document.createElement('button'); b.className = 'gtab' + (t === gTab ? ' on' : ''); b.textContent = u.gTabs[t];
    b.addEventListener('click', () => { Sound.click(); gTab = t; renderGarage(); });
    tabs.appendChild(b);
  }
  const box = $('gitems'); box.innerHTML = '';
  // an item not owned yet shows its price; tapping it buys it when the stars are enough (they are spent)
  const cell = (inner, selected, cost, onPick, kind, it) => {
    const el = document.createElement('button');
    const owned = !kind || isOwned(Store.data.owned, kind, it), locked = !owned && cost > have;
    el.className = 'gitem' + (selected ? ' sel' : '') + (locked ? ' locked' : !owned ? ' buy' : '');
    el.innerHTML = inner + (!owned ? `<span class="need">★ ${cost}</span>` : '');
    el.addEventListener('click', () => {
      if (locked) { Sound.lock(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
      if (!owned) { if (!Store.buy(kind, it)) return; Sound.star(); haptic('win'); } else { Sound.pop(); haptic('tick'); }
      onPick(); Store.save(); setKart(); renderGarage();
    });
    box.appendChild(el);
  };
  if (gTab === 'body') for (const it of GARAGE.body) cell(it.icon, look.body === it.id, it.cost, () => { look.body = it.id; }, 'body', it);
  if (gTab === 'hat') for (const it of GARAGE.hat) cell(it.icon, look.hat === it.id, it.cost, () => { look.hat = it.id; }, 'hat', it);
  if (gTab === 'color') for (const it of GARAGE.color) cell(`<span class="dot" style="background:${it.color}"></span>`, Store.data.kart === it.id, it.cost, () => { Store.data.kart = it.id; }, 'color', it);
  if (gTab === 'skin') {
    // who drives: a boy or a girl (with a skin tone), or any animal of the game
    const human = DRIVERS.includes(look.driver);
    cell('👦', look.driver === 'boy', 0, () => { look.driver = 'boy'; });
    cell('👧', look.driver === 'girl', 0, () => { look.driver = 'girl'; });
    if (human) for (const it of GARAGE.skin) cell(`<span class="dot" style="background:${it.color}"></span>`, look.skin === it.id, it.cost, () => { look.skin = it.id; });
    for (const id of ANIMAL_IDS) cell(`<img alt="" src="${thumb(id)}">`, look.driver === id, 0, () => { look.driver = id; });
  }
  if (gTab === 'pilot') {
    const met = metAnimals();
    cell(`<span style="font-size:.5em;font-weight:800">${u.pilotNone}</span>`, !look.pilot, 0, () => { look.pilot = ''; });
    if (!met.length) { const e = document.createElement('div'); e.className = 'gempty'; e.textContent = u.pilotEmpty; box.appendChild(e); }
    for (const id of met) cell(`<img alt="" src="${thumb(id)}">`, look.pilot === id, 0, () => { look.pilot = id; });
  }
}
$('garagebtn').addEventListener('click', () => openGarage('title'));
$('mgarage').addEventListener('click', () => openGarage('map'));
$('gclose').addEventListener('click', closeGarage);
// garage camera: circle slowly around the kart, which stays in the free half of the screen next to the panel
function garageCamera(dt) {
  const c = kart.root.position, a = 0.9 + Math.sin(S.modeT * 0.35) * 0.9;
  const tp = new THREE.Vector3(c.x + Math.sin(T.heading(S.u) + a) * 10.5, 4.6, c.z + Math.cos(T.heading(S.u) + a) * 10.5);
  const look = new THREE.Vector3(c.x, 1.8, c.z);
  const fwd = new THREE.Vector3().subVectors(look, tp).normalize(), right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const shift = 3.6 * Math.min(1.3, camera.aspect / 1.8);
  look.addScaledVector(right, -shift); tp.addScaledVector(right, -shift);
  camPos.x = damp(camPos.x, tp.x, 3, dt); camPos.y = damp(camPos.y, tp.y, 3, dt); camPos.z = damp(camPos.z, tp.z, 3, dt);
  camLook.x = damp(camLook.x, look.x, 4, dt); camLook.y = damp(camLook.y, look.y, 4, dt); camLook.z = damp(camLook.z, look.z, 4, dt);
  camera.position.copy(camPos); camera.lookAt(camLook);
}
$('play').addEventListener('click', async () => {
  Sound.init(); Sound.click(); haptic('tick');
  if (set().tilt && !Tilt.enabled) { await Tilt.enable(); applySettings(); }
  toMap();
});

// ---------- HUD buttons ----------
$('target').addEventListener('pointerdown', e => {
  e.stopPropagation(); const C = cur();
  // letter race: the letter's name only (the owner: no animal word during the race; intro and celebration keep it)
  Voice.say(S.kind === 'letter' ? C.name : S.kind === 'word' ? [C.say, nextLetter().name] : isHaraka() ? HLINES.spell(sylAt(0)) : C.say);
  if (isHaraka() && S.recall && !S.chipBusy) { const x = sylAt(0); setChip(x.ch, x.color); clearTimeout(S.chipT); S.chipT = setTimeout(() => { if (S.mode === 'drive') chipShowsTarget(); }, 2200); }
  // in recall rounds a tap shows the letter again for a moment
  if (S.kind === 'letter' && S.recall && !S.chipBusy) { setChip(C.ch, 'var(--pink)'); clearTimeout(S.chipT); S.chipT = setTimeout(() => { if (S.mode === 'drive') chipShowsTarget(); }, 2200); }
  pingChip();
});
$('pausebtn').addEventListener('click', () => setPaused(true));
$('presume').addEventListener('click', () => { Sound.click(); setPaused(false); });
$('prestart').addEventListener('click', () => { Sound.click(); S.paused = false; $('pause').classList.add('hidden'); Sound.resume(); startLevel(S.kind, S.index); });
$('pmap').addEventListener('click', () => { Sound.click(); S.paused = false; Sound.resume(); toMap(); });
$('chome').addEventListener('click', () => { Sound.click(); toMap(); });
$('chear').addEventListener('click', () => { Sound.click(); S.happyT = 2.5; const C = cur(); Voice.say(S.kind === 'letter' ? [C.name, TR.lines.sound(C)] : S.kind === 'word' ? [TR.lines.wordBlend(C)] : isHaraka() ? [HLINES.chant(S.index)] : [C.say]); });
$('cagain').addEventListener('click', () => { Sound.click(); startLevel(S.kind, S.index); });
$('cnext').addEventListener('click', () => {
  Sound.click();
  const list = S.kind === 'letter' || isHaraka() ? TR.letters : S.kind === 'word' ? TR.words : TR.numbers;
  // a harakat level only opens after its plain letter: otherwise back to the map
  if (isHaraka() && !Store.unlocked('haraka', S.index + 1)) return toMap();
  if (S.index + 1 < list.length) startLevel(S.kind, S.index + 1); else toMap();
});
function setPaused(p) {
  if (!['drive', 'intro', 'arrive'].includes(S.mode)) return;
  if (p === S.paused) return;
  S.paused = p;
  $('pause').classList.toggle('hidden', !p);
  if (p) { Voice.stop(); releaseTouch(); Sound.engineHum(0, false); }
  else {
    Sound.resume(); if (Tilt.enabled) Tilt.calibrate(); last = performance.now();
    // the intro was cut by the pause: say it again so the child hears which letter to find
    if (S.mode === 'intro' && !S.introDone) sayIntro();
    // recall rounds and words hide the letter: ask again so the child knows what to find
    else if (S.mode === 'drive' && (S.recall || isWord()) && S.collected < S.need) Voice.say(findLine(isWord() ? nextLetter() : isHaraka() ? sylAt(0) : cur()));
  }
}
// Android back button: pause a level instead of closing the app; step back from other screens
function onBack() {
  if (!$('pgate').classList.contains('hidden')) { $('pgate').classList.add('hidden'); return; }
  if (!$('settings').classList.contains('hidden')) { $('settings').classList.add('hidden'); renderMap(); return; }
  if (['drive', 'intro', 'arrive'].includes(S.mode)) { if (!S.paused) setPaused(true); return; }
  if (!$('paywall').classList.contains('hidden')) { closePaywall(); return; }
  if (S.mode === 'celebrate') { toMap(); return; }
  if (S.mode === 'garage') { closeGarage(); return; }
  if (S.mode === 'map') { toTitle(); return; }
  if (S.mode === 'title') exitApp();
}

// ---------- parent settings (long-press the gear) ----------
{
  const gear = $('gear'); let timer = null;
  const cancel = () => { clearTimeout(timer); timer = null; gear.classList.remove('holding'); };
  gear.addEventListener('pointerdown', e => {
    e.preventDefault(); Sound.init(); gear.classList.add('holding', 'hint');
    timer = setTimeout(() => { cancel(); gear.classList.remove('hint'); openGate(); }, 1200);
    setTimeout(() => gear.classList.remove('hint'), 2200);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) gear.addEventListener(ev, cancel);
}
// parent gate: after the long press, tap two digits in the order written (a pre-reader cannot follow the sentence)
function openGate(onPass = openSettings) {
  Sound.click();
  const a = 1 + ((Math.random() * 9) | 0); let b = 1 + ((Math.random() * 9) | 0); if (b === a) b = (a % 9) + 1;
  $('pgq').textContent = ui().gate(a, b);
  const pad = $('pgpad'); pad.innerHTML = ''; let step = 0;
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
  for (const n of order) {
    const k = document.createElement('button'); k.className = 'cbtn blue pgk'; k.textContent = ui().gateDigit(n);
    k.addEventListener('click', () => {
      Sound.click();
      if (n === (step === 0 ? a : b)) { step++; k.classList.add('ok'); if (step === 2) { $('pgate').classList.add('hidden'); onPass(); } }
      else { Sound.lock(); $('pgate').classList.add('hidden'); }
    });
    pad.appendChild(k);
  }
  $('pgate').classList.remove('hidden');
}
// ---------- full-game unlock (parents) ----------
function openPaywall(fromSettings) {
  const u = ui(), full = Purchase.isFull();
  $('pwtitle').textContent = full ? u.pwOwned : u.pwTitle;
  $('pwbody').textContent = u.pwBody(TRACKS.ar.words.length + TRACKS.en.words.length - 2 * FREE_WORDS, HARAKA_ENABLED ? TRACKS.ar.letters.length - FREE_WORDS : 0);
  $('pwfree').textContent = u.pwFree; $('pwparents').textContent = '🔒 ' + u.pwParents;
  $('pwbuy').textContent = u.pwBuy(Purchase.price); $('pwbuy').classList.toggle('hidden', full);
  $('pwrestore').textContent = u.pwRestore; $('pwrestore').classList.toggle('hidden', full);
  $('pwmsg').textContent = '';
  $('paywall').dataset.gated = fromSettings ? '1' : '';
  $('paywall').dir = u.dir;
  $('paywall').classList.remove('hidden');
}
function closePaywall() { $('paywall').classList.add('hidden'); if (S.mode === 'map') renderMap(); }
// every store action passes the parent gate first (unless the parent already passed it to reach settings)
const gated = fn => () => { Sound.click(); if ($('paywall').dataset.gated) fn(); else openGate(fn); };
async function storeAction(kind) {
  const u = ui(), msg = $('pwmsg');
  msg.textContent = '…';
  const r = kind === 'buy' ? await Purchase.buy() : await Purchase.restore();
  msg.textContent = { ok: u.pwOk, cancel: u.pwCancel, none: u.pwNone, unavailable: u.pwWeb, error: u.pwFail }[r] || u.pwFail;
  if (r === 'ok') { Sound.fanfare(); $('pwbuy').classList.add('hidden'); $('pwrestore').classList.add('hidden'); $('pwtitle').textContent = u.pwOwned; }
}
$('pwbuy').addEventListener('click', gated(() => storeAction('buy')));
$('pwrestore').addEventListener('click', gated(() => storeAction('restore')));
$('pwclose').addEventListener('click', () => { Sound.click(); closePaywall(); });
$('spw').addEventListener('click', () => { Sound.click(); $('settings').classList.add('hidden'); openPaywall(true); });
$('pgclose').addEventListener('click', () => { Sound.click(); $('pgate').classList.add('hidden'); });
const OPTS = ['sfx', 'music', 'voice', 'haptics', 'hint', 'tilt', 'flip', 'speed', 'voiceRate', 'voiceName'];
// a short sample in the track the child is learning
const voiceSample = () => (TR.lang === 'en' ? ['Letter A', TR.lines.sound(TR.letters[0])] : [TR.letters[0].name, TR.letters[0].say]);
function openSettings() {
  Sound.click();
  const grid = $('sgrid'); grid.innerHTML = '';
  for (const k of OPTS) {
    const label = ui().opts[k];
    if ((k === 'tilt' || k === 'flip') && !Tilt.supported) continue;
    const row = document.createElement('div'); row.className = 'opt';
    row.innerHTML = `<span>${label}</span>`;
    if (k === 'speed' || k === 'voiceRate') {
      const seg = document.createElement('div'); seg.className = 'seg';
      for (const [v, t] of [['slow', ui().slow], ['normal', ui().normal]]) { const b = document.createElement('button'); b.textContent = t; b.classList.toggle('on', set()[k] === v); b.addEventListener('click', () => { set()[k] = v; Store.save(); applySettings(); [...seg.children].forEach(x => x.classList.toggle('on', x === b)); Sound.click(); if (k === 'voiceRate') Voice.say(voiceSample()); }); seg.appendChild(b); }
      row.appendChild(seg);
    } else if (k === 'voiceName') {
      const names = Voice.voices();
      if (Voice.clipCount > 0 || names.length < 2) continue;
      const sel = document.createElement('select'); sel.className = 'vsel';
      for (const n of names) { const o = document.createElement('option'); o.value = n; o.textContent = n.replace(/^Microsoft |^Google /, '').slice(0, 34); o.selected = n === Voice.current(); sel.appendChild(o); }
      sel.addEventListener('change', () => { set().voiceName = sel.value; Store.save(); Voice.setVoice(sel.value); Voice.say(voiceSample()); });
      row.appendChild(sel); row.classList.add('wide');
    } else {
      const tg = document.createElement('div'); tg.className = 'tg' + (set()[k] ? ' on' : '');
      row.addEventListener('click', async () => {
        set()[k] = !set()[k];
        if (k === 'tilt') { if (set().tilt) { const ok = await Tilt.enable(); if (!ok) set().tilt = false; } else Tilt.disable(); }
        tg.classList.toggle('on', set()[k]); Store.save(); applySettings(); Sound.click();
        if (k === 'haptics' && set().haptics) haptic('tick');
      });
      row.appendChild(tg);
    }
    grid.appendChild(row);
  }
  voiceStatus();
  $('sreset').textContent = ui().reset; $('sreset').dataset.armed = '';
  $('sunlock').textContent = unlockText();
  $('spw').textContent = Purchase.isFull() ? ui().pwOwned : '⭐ ' + ui().pwTitle;
  $('settings').classList.remove('hidden');
}
function voiceStatus() {
  const v = Voice.available;
  const u = ui();
  $('vstat').textContent = Voice.clipCount > 0 ? u.vClips(Voice.clipCount)
    : v === true ? u.vOk(Voice.current() || '')
    : v === false ? (isNativeApp ? u.vNoneApp : u.vNoneWeb)
    : u.vUnknown;
  $('vinstall').classList.toggle('hidden', !(v === false && /android/i.test(navigator.userAgent)));
}
$('sclose').addEventListener('click', () => { Sound.click(); $('settings').classList.add('hidden'); renderMap(); });
$('vtest').addEventListener('click', () => { Voice.enabled = true; Voice.say(voiceSample()).then(() => { Voice.enabled = set().voice; }); });
$('vinstall').addEventListener('click', () => Voice.openInstall());
$('sunlock').addEventListener('click', () => { Store.data.unlockAll = !Store.data.unlockAll; Store.save(); Sound.click(); $('sunlock').textContent = unlockText(); });
$('sreset').addEventListener('click', () => {
  const b = $('sreset');
  if (!b.dataset.armed) {
    b.dataset.armed = '1'; b.textContent = ui().resetConfirm;
    clearTimeout(b._t); b._t = setTimeout(() => { if (b.dataset.armed) { b.dataset.armed = ''; b.textContent = ui().reset; } }, 3000);
    return;
  }
  clearTimeout(b._t);
  Store.reset(); setKart(); b.dataset.armed = ''; b.textContent = ui().resetDone; Sound.lock();
  $('sunlock').textContent = unlockText();
});

// ---------- main loop ----------
let last = performance.now();
const tmp3 = new THREE.Vector3();
// automatic quality: if the phone struggles, lower resolution first, then switch off shadows
const Q = { level: 0, acc: 0, n: 0 };
function adaptQuality(rawDt) {
  if (S.noAdapt || S.mode !== 'drive' || Q.level >= 2) return;
  Q.acc += rawDt; Q.n++;
  if (Q.acc < 4) return;
  const fps = Q.n / Q.acc; Q.acc = 0; Q.n = 0;
  if (fps < 38) {
    Q.level++;
    if (Q.level === 1) { renderer.setPixelRatio(1); resize(); }
    else { sun.castShadow = false; }
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - last) / 1000;
  let dt = Math.min(0.05, rawDt) * (S.timeScale || 1); last = now;
  if (!S.paused) adaptQuality(Math.min(rawDt, 0.5));
  if (S.mode === 'map' || S.mode === 'boot') return; // the map is plain HTML: no 3D work, saves battery
  if (S.paused) { renderer.render(scene, camera); return; }
  S.t += dt; S.modeT += dt;
  const C = S.mode !== 'title' ? cur() : null;

  if (S.mode === 'title') {
    const c = T.pos(30, 0), a = S.t * 0.12;
    camera.position.set(c.x + Math.sin(a) * 46, 18 + Math.sin(S.t * 0.3) * 3, c.z + Math.cos(a) * 46);
    camera.lookAt(c.x, 4, c.z); camPos.copy(camera.position); camLook.set(c.x, 4, c.z);
    syncKart(dt); followSun(c);
  } else if (S.mode === 'garage') {
    garageCamera(dt); syncKart(dt); followSun(kart.root.position);
  } else if (S.mode === 'intro') {
    // swoop from above down behind the kart
    const k = Math.min(1, S.modeT / 2.6), e = k * k * (3 - 2 * k);
    const tp = new THREE.Vector3(), tl = new THREE.Vector3(); S.camH = T.heading(S.u); chaseTargets(tp, tl);
    const p = T.pos(S.u, 0);
    const high = new THREE.Vector3(p.x + Math.sin(S.camH) * 30, 34, p.z + Math.cos(S.camH) * 30);
    camera.position.lerpVectors(high, tp, e); camPos.copy(camera.position);
    camLook.lerpVectors(p, tl, e); camera.lookAt(camLook);
    syncKart(dt); followSun(p);
    // the kart waits for the whole intro line; the time cap is only for a voice that never reports its end
    if (S.modeT > 2.6 && (S.introDone || (S.modeT > 6 && !Voice.busy) || S.modeT > 15)) {
      $('intro').classList.add('out'); setTimeout(() => { if (S.mode !== 'intro') $('intro').classList.add('hidden'); }, 500);
      S.mode = 'drive'; S.modeT = 0; Sound.startMusic(); haptic('go');
      if (S.need === 0) spawnGate();
    }
  } else if (S.mode === 'drive') {
    driveKart(dt, true, baseSpeed());
    if (!S.arch && S.collected < S.need) { while (T.delta(S.u, S.nextU) < 170) spawnAhead(); }
    if (!S.arch && S.collected >= S.need) spawnGate();
    updatePickups(dt);
    syncKart(dt); updateChase(dt); followSun(kart.root.position);
    Sound.engineHum(S.speed, true);
    if (S.arch && T.delta(S.u, S.archU) < 0 && T.delta(S.u, S.archU) > -20) {
      S.mode = 'arrive'; S.modeT = 0; buildStage(); Sound.fanfare(); confetti.burst(T.pos(S.archU, 0).setY(10), 60, 12);
      $('hud').classList.add('hidden');
    }
  } else if (S.mode === 'arrive') {
    const rem = T.delta(S.u, S.stageU);
    const tgt = rem > 0 ? Math.min(baseSpeed(), Math.sqrt(2 * 10 * rem)) : 0;
    S.speed = Math.min(S.speed, tgt + 0.5);
    driveKart(dt, false, tgt);
    S.d = damp(S.d, 0, 2, dt);
    if (rem <= 0.3) { S.speed = 0; }
    updatePickups(dt);
    syncKart(dt); followSun(S.stageC);
    Sound.engineHum(S.speed, S.speed > 1);
    if (S.modeT < 1.2) updateChase(dt); else celebrateCamera(dt);
    if (S.modeT > 2.4) { Sound.engineHum(0, false); celebrate(); }
  } else if (S.mode === 'celebrate') {
    celebrateCamera(dt); syncKart(dt); followSun(S.stageC);
    updateCounting(dt);
    if (S.happyT > 0) S.happyT -= dt;
  }
  if (S.mode !== 'drive' && S.mode !== 'arrive') Sound.engineHum(0, false);

  // animals: animate the ones near the camera
  const cp = camera.position;
  for (const h of S.slotHabs) if (h && h.group.visible) {
    const near = h.group.position.distanceToSquared(cp) < 170 * 170;
    for (const a of h.animals) { a.root.visible = near; if (near) a.update(S.t, 'idle', dt); }
  }
  if (S.stage) {
    for (const a of S.stage.animals) a.update(S.t, S.happyT > 0 ? 'happy' : 'idle', dt);
    for (const it of S.stage.items) if (it.apple && it.root.visible) { it.apple.rotation.y += dt * (S.happyT > 0 ? 4 : 0.8); it.apple.position.y = S.happyT > 0 ? Math.abs(Math.sin(S.t * 6 + it.ph)) * 0.8 : 0; }
  }
  if (kart.cheerT > 0 && (kart.pilotAnimal || kart.driverAnimal)) kart.cheerT -= dt;
  const mood = kart.cheerT > 0 || S.mode === 'garage' && Math.sin(S.t * 0.8) > 0.6 ? 'happy' : 'idle';
  if (kart.pilotAnimal) kart.pilotAnimal.update(S.t, mood, dt);
  if (kart.driverAnimal) kart.driverAnimal.update(S.t, mood, dt);
  if (S.arch) S.arch.sign.rotation.y = Math.sin(S.t * 2) * 0.12;
  ZOO.clouds.rotation.y += dt * 0.004;
  confetti.update(dt);
  renderer.render(scene, camera);
}

// ---------- boot ----------
async function boot() {
  await loadFonts();
  await Store.load();
  T = buildTrack();
  ZOO = buildZoo(scene, T);
  confetti = new Confetti(scene);
  setKart();
  applySettings();
  applyUiLang();
  if (set().uiLang === 'en') mapTab = 'enletter';
  Voice.init(set().voiceName);
  Purchase.onChange = () => { if (S.mode === 'map') renderMap(); };
  Purchase.init();
  initPlatform({
    onBack,
    onBackground: () => {
      Voice.stop(); releaseTouch();
      if (['drive', 'intro', 'arrive'].includes(S.mode)) setPaused(true);
      Sound.suspend();
    }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.mode !== 'boot' && !S.paused) Sound.resume(); });
  toTitle();
  $('loading').classList.add('hidden');
  requestAnimationFrame(frame);
  // test hook (headless checks)
  window.__lk = { HARAKA_ENABLED, SYLLABLES, HLINES, sylAt, bubbleTexture, thumb, Purchase, openPaywall,  keys, touch, S, T, startLevel, toMap, toTitle, hitPickup, Store, Voice, cur, celebrate, scene, camera, renderer, setPaused, openSettings, openGate, onBack, openGarage, closeGarage, setKart, metAnimals, TRACKS, get TR() { return TR; } };
}
boot();
