// Progress + settings, saved on the device (localStorage, mirrored to native Preferences in the app).
import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform.js';
import { DEFAULT_LOOK, GARAGE } from './garage.js';
import { WORDS, EN_WORDS } from './data.js';

const KEY = 'learningkart_v1';
const DEFAULT = () => ({
  v: 2, look: DEFAULT_LOOK(), letters: Array(28).fill(0), numbers: Array(11).fill(0), totalStars: 0, kart: 1,
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
  }; out.unlockAll = !!d.unlockAll; out.full = !!d.full; out.v = 2;
  return out;
}
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
  reset() { const k = this.data.kart, st = this.data.settings; this.data = DEFAULT(); this.data.kart = k; this.data.settings = st; this.save(); },
  // learning stars: the sum of the 1-3 stars of every finished level in every track (unlocks garage items)
  learnStars() { const d = this.data, sum = a => a.reduce((x, y) => x + y, 0); return sum(d.letters) + sum(d.numbers) + sum(d.enLetters) + sum(d.enNumbers) + sum(d.words) + sum(d.enWords) + sum(d.harakat); },
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
