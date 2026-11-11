// Progress + settings, saved on the device (localStorage, mirrored to native Preferences in the app).
import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform.js';
import { DEFAULT_LOOK, GARAGE, BUY_KINDS } from './garage.js';
import { WORDS, EN_WORDS } from './data.js';

const KEY = 'learningkart_v1';
const DEFAULT = () => ({
  v: 3, look: DEFAULT_LOOK(), letters: Array(28).fill(0), numbers: Array(11).fill(0), totalStars: 0, kart: 1,
  // garage items bought with stars (ids per kind; items that cost 0 are always owned)
  owned: { body: [], color: [], hat: [] },
  // per letter: how often the child picked a wrong letter or missed it
  miss: Array(28).fill(0),
  // English track (A-Z, 0-10)
  enLetters: Array(26).fill(0), enNumbers: Array(11).fill(0), enMiss: Array(26).fill(0),
  // word mode (stars per word)
  words: Array(WORDS.length).fill(0), enWords: Array(EN_WORDS.length).fill(0),
  // harakat mode (Arabic): stars per letter with fatha/kasra/damma, and its own mistake counts
  harakat: Array(28).fill(0), hmiss: Array(28).fill(0),
  settings: { sfx: true, music: true, voice: true, haptics: true, hint: true, tilt: false, flip: false, speed: 'normal', voiceName: '', voiceRate: 'normal', uiLang: 'ar' }
});
const int = (v, lo, hi, dflt) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : dflt; };
const arr = (a, len, hi) => Array.from({ length: len }, (_, i) => int(Array.isArray(a) ? a[i] : 0, 0, hi, 0));
// old or damaged saves never break the game: every field is coerced to a valid value
function sanitize(d) {
  const def = DEFAULT();
  const out = Object.assign(def, d, { settings: Object.assign(def.settings, (d.settings && typeof d.settings === 'object') ? d.settings : {}) });
  out.letters = arr(d.letters, 28, 3); out.numbers = arr(d.numbers, 11, 3); out.miss = arr(d.miss, 28, 999);
  out.words = arr(d.words, WORDS.length, 3); out.enWords = arr(d.enWords, EN_WORDS.length, 3);
  out.harakat = arr(d.harakat, 28, 3); out.hmiss = arr(d.hmiss, 28, 999);
  out.enLetters = arr(d.enLetters, 26, 3); out.enNumbers = arr(d.enNumbers, 11, 3); out.enMiss = arr(d.enMiss, 26, 999);
  out.totalStars = int(d.totalStars, 0, 1e7, 0); out.kart = int(d.kart, 0, 7, 1);
  const lk = (d.look && typeof d.look === 'object') ? d.look : {}, L = DEFAULT_LOOK();
  out.look = {
    body: GARAGE.body.some(x => x.id === lk.body) ? lk.body : L.body, hat: GARAGE.hat.some(x => x.id === lk.hat) ? lk.hat : L.hat,
    skin: int(lk.skin, 0, 3, 0), pilot: typeof lk.pilot === 'string' ? lk.pilot.slice(0, 20) : ''
  }; out.unlockAll = !!d.unlockAll; out.full = !!d.full;
  const own = (d.owned && typeof d.owned === 'object') ? d.owned : {};
  out.owned = {};
  for (const k of BUY_KINDS) out.owned[k] = GARAGE[k].filter(it => it.cost && Array.isArray(own[k]) && own[k].includes(it.id)).map(it => it.id);
  // saves from before stars were spent (v2): keep what the learning stars had opened, and what is in use
  if (!(d.v >= 3)) {
    const learned = learnStarsOf(out);
    for (const k of BUY_KINDS) for (const it of GARAGE[k]) if (it.cost && it.cost <= learned && !out.owned[k].includes(it.id)) out.owned[k].push(it.id);
  }
  keepInUse(out);
  out.v = 3;
  return out;
}
// what the kart wears now is always owned (old saves, a reset that keeps the colour)
function keepInUse(d) {
  const use = { body: d.look.body, hat: d.look.hat, color: d.kart };
  for (const k of BUY_KINDS) { const it = GARAGE[k].find(x => x.id === use[k]); if (it && it.cost && !d.owned[k].includes(it.id)) d.owned[k].push(it.id); }
}
const sum = a => a.reduce((x, y) => x + y, 0);
const learnStarsOf = d => sum(d.letters) + sum(d.numbers) + sum(d.enLetters) + sum(d.enNumbers) + sum(d.words) + sum(d.enWords) + sum(d.harakat);
export const Store = {
  data: DEFAULT(),
  async load() {
    let raw = null, rawN = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    if (isNative) { try { const r = await Preferences.get({ key: KEY }); if (r && r.value) rawN = r.value; } catch (e) { /* ignore */ } }
    const parse = t => { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } };
    let d = parse(raw); const n = parse(rawN);
    // use whichever copy was saved last (a native write can be lost when the app is killed)
    if (n && (!d || (n.savedAt || 0) >= (d.savedAt || 0))) d = n;
    if (d && typeof d === 'object') this.data = sanitize(d);
    // first launch: interface in the device language (Arabic devices -> Arabic, everything else -> English)
    else { try { this.data.settings.uiLang = /^ar/i.test(navigator.language || '') ? 'ar' : 'en'; } catch (e) { /* keep Arabic */ } }
  },
  save() {
    this.data.savedAt = Date.now();
    const s = JSON.stringify(this.data);
    try { localStorage.setItem(KEY, s); } catch (e) { /* ignore */ }
    if (isNative) { try { Preferences.set({ key: KEY, value: s }).catch(() => {}); } catch (e) { /* ignore */ } }
  },
  reset() { const k = this.data.kart, st = this.data.settings; this.data = DEFAULT(); this.data.kart = k; this.data.settings = st; keepInUse(this.data); this.save(); },
  // learning stars: the sum of the 1-3 stars of every finished level in every track (the map's progress)
  learnStars() { return learnStarsOf(this.data); },
  // spend stars on a garage item: false when it is not affordable; owning it again costs nothing
  buy(kind, it) {
    const d = this.data;
    if (!it.cost || d.owned[kind].includes(it.id)) return true;
    if (d.totalStars < it.cost) return false;
    d.totalStars -= it.cost; d.owned[kind].push(it.id); this.save();
    return true;
  },
  // progress array for a track: kind 'letter' | 'number', lang 'ar' | 'en'
  prog(kind, lang = 'ar') {
    const d = this.data;
    if (kind === 'word') return lang === 'en' ? d.enWords : d.words;
    if (kind === 'haraka') return d.harakat;
    return lang === 'en' ? (kind === 'letter' ? d.enLetters : d.enNumbers) : (kind === 'letter' ? d.letters : d.numbers);
  },
  missArr(lang = 'ar') { return lang === 'en' ? this.data.enMiss : this.data.miss; },
  addHMiss(i) { const m = this.data.hmiss; if (i >= 0 && i < m.length) m[i] = Math.min(999, (m[i] || 0) + 1); },
  addMiss(i, lang = 'ar') { const m = this.missArr(lang); if (i >= 0 && i < m.length) m[i] = Math.min(999, (m[i] || 0) + 1); },
  unlocked(kind, i, lang = 'ar') {
    const arr = this.prog(kind, lang);
    if (this.data.unlockAll) return true;
    // a harakat level opens once its plain letter is learned (and the harakat level before it is done)
    if (kind === 'haraka') return arr[i] > 0 || (this.data.letters[i] > 0 && (i === 0 || arr[i - 1] > 0));
    return i === 0 || arr[i - 1] > 0 || arr[i] > 0;
  },
  complete(kind, i, stars, lang = 'ar') {
    const arr = this.prog(kind, lang);
    const first = !arr[i];
    if (stars > arr[i]) arr[i] = stars;
    this.save();
    return first;
  }
};
