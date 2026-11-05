// All sounds are synthesized with WebAudio (no files): sound effects + a cheerful looping tune.
export const Sound = {
  ctx: null, master: null, sfxBus: null, musicBus: null, sfxOn: true, musicOn: true, musicPlaying: false,
  _timer: null, _step: 0, _next: 0, duck: 1,
  init() {
    if (this.ctx) { this.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(c.destination);
      this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxOn ? 1 : 0; this.sfxBus.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.gain.value = 0; this.musicBus.connect(this.master);
      const len = c.sampleRate * 0.25, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch (e) { this.ctx = null; }
  },
  suspend() { try { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); } catch (e) { /* ignore */ } },
  resume() { try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) { /* ignore */ } },
  setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.value = on ? 1 : 0; },
  setMusic(on) { this.musicOn = on; this._musicLevel(); },
  setDuck(on) { this.duck = on ? 0.3 : 1; this._musicLevel(); },
  _musicLevel() { if (!this.ctx) return; this.musicBus.gain.setTargetAtTime(this.musicOn && this.musicPlaying ? 0.16 * this.duck : 0, this.ctx.currentTime, 0.15); },

  tone(freq, dur, { type = 'sine', vol = 0.15, at = 0, slide = 0, bus } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.03);
  },
  noiseHit(dur, { vol = 0.2, at = 0, freq = 3000, q = 0.8, bus } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus); s.start(t); s.stop(t + dur + 0.02);
  },
  // ---- effects ----
  click() { this.tone(660, 0.08, { type: 'triangle', vol: 0.12 }); this.tone(990, 0.06, { type: 'sine', vol: 0.08, at: 0.03 }); },
  pop() { this.tone(500, 0.12, { type: 'sine', vol: 0.2, slide: 2.2 }); this.noiseHit(0.06, { vol: 0.12, freq: 2500 }); },
  collect(n = 0) { const base = [523, 587, 659, 784, 880, 988, 1047, 1175, 1319, 1397][n % 10]; [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(base * m, 0.22, { type: 'triangle', vol: 0.12, at: i * 0.055 })); this.noiseHit(0.15, { vol: 0.05, freq: 7000, at: 0.05 }); },
  star() { this.tone(1568, 0.15, { type: 'sine', vol: 0.09 }); this.tone(2093, 0.22, { type: 'sine', vol: 0.08, at: 0.06 }); },
  wrong() { this.tone(320, 0.35, { type: 'sine', vol: 0.18, slide: 0.45 }); this.tone(240, 0.3, { type: 'triangle', vol: 0.08, at: 0.08, slide: 0.6 }); },
  boost() { this.noiseHit(0.5, { vol: 0.22, freq: 900, q: 0.5 }); this.tone(220, 0.5, { type: 'sawtooth', vol: 0.05, slide: 3 }); },
  bump() { this.tone(110, 0.15, { type: 'triangle', vol: 0.15 }); },
  whoosh() { this.noiseHit(0.6, { vol: 0.15, freq: 1200, q: 0.4 }); },
  gateOpen() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, { type: 'square', vol: 0.05, at: i * 0.08 })); },
  fanfare() {
    const seq = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.4], [784, 0.56], [1047, 0.7]];
    seq.forEach(([f, t]) => { this.tone(f, 0.35, { type: 'square', vol: 0.06, at: t }); this.tone(f / 2, 0.35, { type: 'triangle', vol: 0.08, at: t }); });
    for (let i = 0; i < 6; i++) this.noiseHit(0.12, { vol: 0.08, freq: 5000 + i * 400, at: 0.7 + i * 0.07 });
  },
  count(i) { this.tone(440 * Math.pow(2, i / 12 * 2), 0.25, { type: 'triangle', vol: 0.12 }); },
  lock() { this.tone(200, 0.12, { type: 'square', vol: 0.06 }); this.tone(160, 0.15, { type: 'square', vol: 0.06, at: 0.1 }); },

  // ---- music: I-V-vi-IV in C, bouncy bass + arpeggio + light percussion ----
  startMusic() {
    if (!this.ctx) return;
    this.musicPlaying = true; this._musicLevel();
    if (this._timer) return;
    this._next = this.ctx.currentTime + 0.1; this._step = 0;
    this._timer = setInterval(() => this._schedule(), 60);
  },
  stopMusic() { this.musicPlaying = false; this._musicLevel(); if (this._timer) { clearInterval(this._timer); this._timer = null; } },
  _schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const spb = 60 / 116 / 2; // eighth notes at 116 bpm
    const chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
    const mel = [76, 0, 79, 76, 74, 0, 72, 74, 76, 79, 0, 81, 79, 0, 76, 0, 74, 0, 74, 76, 74, 72, 0, 71, 72, 0, 74, 76, 72, 0, 0, 0];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    while (this._next < this.ctx.currentTime + 0.25) {
      const s = this._step, bar = Math.floor(s / 8) % 4, beat = s % 8, at = this._next - this.ctx.currentTime;
      const ch = chords[bar];
      if (beat % 2 === 0) this.tone(hz(ch[0] - 24 + (beat === 4 ? 7 : 0)), spb * 1.6, { type: 'triangle', vol: 0.5, at, bus: this.musicBus });
      this.tone(hz(ch[beat % 3] + 12), spb * 0.9, { type: 'sine', vol: 0.16, at, bus: this.musicBus });
      const m = mel[(Math.floor(s / 1) % 32)];
      if (m && (Math.floor(s / 32) % 2 === 0)) this.tone(hz(m), spb * 1.5, { type: 'square', vol: 0.07, at, bus: this.musicBus });
      if (beat % 2 === 1) this.noiseHit(0.04, { vol: 0.12, freq: 8000, q: 1, at, bus: this.musicBus });
      if (beat === 0 || beat === 4) this.tone(90, 0.15, { type: 'sine', vol: 0.5, at, slide: 0.5, bus: this.musicBus });
      this._step++; this._next += spb;
    }
  },
  engine: null,
  engineHum(speed, on) {
    if (!this.ctx) return;
    if (!this.engine) {
      const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(this.sfxBus); o.start(); this.engine = { o, g };
    }
    const t = this.ctx.currentTime;
    this.engine.o.frequency.setTargetAtTime(55 + speed * 2.6, t, 0.08);
    this.engine.g.gain.setTargetAtTime(on ? 0.035 : 0, t, 0.1);
  }
};
