// Progress + settings, saved on the device (localStorage, mirrored to native Preferences in the app).
import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform.js';

const KEY = 'learningkart_v1';
const DEFAULT = () => ({
  letters: Array(28).fill(0), numbers: Array(11).fill(0), totalStars: 0, kart: 1,
  settings: { sfx: true, music: true, voice: true, haptics: true, hint: true, tilt: false, flip: false, speed: 'normal', voiceName: '', voiceRate: 'normal' }
});
export const Store = {
  data: DEFAULT(),
  async load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    if (isNative) { try { const r = await Preferences.get({ key: KEY }); if (r && r.value) raw = r.value; } catch (e) { /* ignore */ } }
    if (raw) {
      try {
        const d = JSON.parse(raw), def = DEFAULT();
        this.data = Object.assign(def, d, { settings: Object.assign(def.settings, d.settings || {}) });
        if (!Array.isArray(this.data.letters) || this.data.letters.length !== 28) this.data.letters = def.letters;
        if (!Array.isArray(this.data.numbers) || this.data.numbers.length !== 11) this.data.numbers = def.numbers;
      } catch (e) { this.data = DEFAULT(); }
    }
  },
  save() {
    const s = JSON.stringify(this.data);
    try { localStorage.setItem(KEY, s); } catch (e) { /* ignore */ }
    if (isNative) { try { Preferences.set({ key: KEY, value: s }); } catch (e) { /* ignore */ } }
  },
  reset() { const k = this.data.kart, st = this.data.settings; this.data = DEFAULT(); this.data.kart = k; this.data.settings = st; this.save(); },
  unlocked(kind, i) {
    const arr = kind === 'letter' ? this.data.letters : this.data.numbers;
    if (this.data.unlockAll) return true;
    return i === 0 || arr[i - 1] > 0 || arr[i] > 0;
  },
  complete(kind, i, stars) {
    const arr = kind === 'letter' ? this.data.letters : this.data.numbers;
    const first = !arr[i];
    if (stars > arr[i]) arr[i] = stars;
    this.save();
    return first;
  }
};
