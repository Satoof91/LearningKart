// Arabic speech.
// 1) Recorded clips (assets/voice/<id>.mp3, bundled at build time) are used first: same quality on every device.
// 2) Otherwise the device's Arabic text-to-speech: native plugin in the app, Web Speech API in a browser.
//    We never fall back to a non-Arabic voice (it would read Arabic letters wrongly).
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { isNative } from './platform.js';
import { voiceLines } from './data.js';

// filled by build.js: { "<id>": "data:audio/mpeg;base64,..." }
const CLIPS = (typeof window !== 'undefined' && window.LK_CLIPS) || {};
const BY_TEXT = new Map();
for (const l of voiceLines()) if (CLIPS[l.id]) BY_TEXT.set(l.text, CLIPS[l.id]);

let webVoices = [], webVoice = null, nativeVoices = [], nativeVoiceIdx = -1;
const QUALITY = v => (/natural|neural|online|premium|enhanced|siri/i.test(v.name) ? 10 : 0) + (/^ar[-_]SA/i.test(v.lang) ? 3 : 0) + (/google|microsoft/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
const wait = ms => new Promise(r => setTimeout(r, ms));

export const Voice = {
  enabled: true, available: null, rate: 0.9, pitch: 1.05, token: 0, busy: false,
  clipCount: BY_TEXT.size, preferred: '', onStart: null, onEnd: null, _audio: null,
  async init(preferredName) {
    this.preferred = preferredName || '';
    try {
      if (isNative) {
        const r = await TextToSpeech.getSupportedVoices();
        nativeVoices = ((r && r.voices) || []).map((v, i) => ({ name: v.name, lang: v.lang, localService: v.localService, i })).filter(v => /^ar/i.test(v.lang));
        this._pickNative();
        if (!nativeVoices.length) {
          const l = await TextToSpeech.getSupportedLanguages();
          const langs = (l && l.languages) || [];
          this.available = langs.length ? langs.some(x => /^ar/i.test(x)) : null;
        } else this.available = true;
      } else if ('speechSynthesis' in window) {
        const pick = () => {
          webVoices = speechSynthesis.getVoices().filter(v => /^ar/i.test(v.lang)).sort((a, b) => QUALITY(b) - QUALITY(a));
          webVoice = webVoices.find(v => v.name === this.preferred) || webVoices[0] || null;
          this.available = speechSynthesis.getVoices().length ? !!webVoice : null;
        };
        pick(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pick);
      } else this.available = false;
    } catch (e) { this.available = null; }
  },
  _pickNative() {
    const sorted = nativeVoices.slice().sort((a, b) => QUALITY(b) - QUALITY(a));
    const v = sorted.find(x => x.name === this.preferred) || sorted[0];
    nativeVoiceIdx = v ? v.i : -1;
  },
  voices() { return (isNative ? nativeVoices.slice().sort((a, b) => QUALITY(b) - QUALITY(a)) : webVoices).map(v => v.name); },
  current() { return isNative ? (nativeVoices.find(v => v.i === nativeVoiceIdx) || {}).name : webVoice && webVoice.name; },
  setVoice(name) {
    this.preferred = name;
    if (isNative) this._pickNative(); else webVoice = webVoices.find(v => v.name === name) || webVoices[0] || null;
  },
  // stop everything, including lines queued with interrupt:false
  stop() { this.gen = (this.gen || 0) + 1; this._tail = null; this._halt(); },
  _halt() {
    this.token++;
    try { if (this._audio) { this._audio.pause(); this._audio = null; } } catch (e) { /* ignore */ }
    if (this._fin) { const f = this._fin; this._fin = null; f(); } // release whoever awaits the clip now, not after the 8 s timeout
    try { if (isNative) TextToSpeech.stop(); else if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    this._end();
  },
  _start() { if (!this.busy) { this.busy = true; this.onStart && this.onStart(); } },
  _end() { if (this.busy) { this.busy = false; this.onEnd && this.onEnd(); } },
  _clip(src, my) {
    return new Promise(res => {
      const a = new Audio(src); this._audio = a;
      let done = false; const fin = () => { if (!done) { done = true; if (this._fin === fin) this._fin = null; res(); } };
      this._fin = fin;
      a.onended = fin; a.onerror = fin; setTimeout(fin, 8000);
      a.play().catch(fin);
      if (my !== this.token) fin();
    });
  },
  async _speak(text, my) {
    const clip = BY_TEXT.get(text);
    if (clip) return this._clip(clip, my);
    // English lines (English track) use the device's English voice; Arabic ones never fall back to a non-Arabic voice
    const en = !/[؀-ۿ]/.test(text);
    if (!en && this.available === false) return; // no Arabic voice: stay silent rather than mispronounce
    if (isNative) {
      const opt = { text, lang: en ? 'en-US' : 'ar-SA', rate: this.rate, pitch: this.pitch, volume: 1.0, category: 'ambient', queueStrategy: 0 };
      if (!en && nativeVoiceIdx >= 0) opt.voice = nativeVoiceIdx;
      await TextToSpeech.speak(opt);
      return;
    }
    if (!('speechSynthesis' in window) || (!en && !webVoice && this.available !== null)) return;
    const enVoice = en ? speechSynthesis.getVoices().find(v => /^en[-_]US/i.test(v.lang)) || speechSynthesis.getVoices().find(v => /^en/i.test(v.lang)) : null;
    if (en && !enVoice && speechSynthesis.getVoices().length) return;
    await new Promise(res => {
      const u = new SpeechSynthesisUtterance(text);
      const v = en ? enVoice : webVoice;
      u.lang = v ? v.lang : (en ? 'en-US' : 'ar-SA'); if (v) u.voice = v; u.rate = this.rate; u.pitch = this.pitch;
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 1800 + text.length * 160); // some browsers never fire onend
      speechSynthesis.speak(u);
      if (my !== this.token) fin();
    });
  },
  // say one or several phrases in a row. A new call interrupts the previous one (and anything queued);
  // with interrupt:false it waits for the current speech to finish instead, so voices never overlap.
  say(texts, opts = {}) {
    if (!this.enabled) return Promise.resolve();
    if (opts.interrupt === false && this.busy && this._tail) {
      const gen = this.gen;
      const p = this._tail.then(() => (gen === this.gen && this.enabled ? this._say(texts, opts) : undefined));
      this._tail = p;
      return p;
    }
    this.gen = (this.gen || 0) + 1;
    const p = this._say(texts, opts);
    this._tail = p;
    return p;
  },
  async _say(texts, { gap = 300 } = {}) {
    const list = (Array.isArray(texts) ? texts : [texts]).filter(Boolean);
    this._halt();
    const my = ++this.token;
    this._start();
    try {
      for (let i = 0; i < list.length; i++) {
        if (my !== this.token) return;
        await this._speak(list[i], my);
        if (i < list.length - 1 && gap) await wait(gap);
      }
    } catch (e) { /* engine missing: stay silent */ }
    if (my === this.token) this._end();
  },
  async openInstall() { try { if (isNative) await TextToSpeech.openInstall(); } catch (e) { /* ignore */ } }
};
