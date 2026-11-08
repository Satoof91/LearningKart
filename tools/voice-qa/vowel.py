"""Acoustic vowel check for short clips (Praat formants). Whisper hallucinates on 0.3 s clips, so lone
syllables are judged here instead: the vowel's F1/F2 are classified a / i / u against the SAME voice's
long-vowel references, and the voiced length tells short from long.

  analyze(path) -> {f1, f2, dur, voiced}            (formants from the middle of the longest voiced stretch)
  classify(f1, f2, refs) -> ('a'|'i'|'u', distance)  refs = {'a': (f1,f2), 'i': ..., 'u': ...}
  python tools/voice-qa/vowel.py tools/voice-qa/bench/ar-AE-HamdanNeural   (demo on a benchmark folder)
"""
import sys, os, json, math
import av, numpy as np, parselmouth
from parselmouth.praat import call

def load(path, sr=16000):
    c = av.open(path); r = av.AudioResampler(format='flt', layout='mono', rate=sr); out = []
    for fr in c.decode(audio=0):
        for f in r.resample(fr): out.append(f.to_ndarray().reshape(-1))
    for f in r.resample(None): out.append(f.to_ndarray().reshape(-1))
    c.close(); return np.concatenate(out).astype(np.float64) if out else np.zeros(sr // 10)

def analyze(path, female=False):
    """formants from the loud, voiced core of the clip: the longest stretch that is within 14 dB of the
    peak intensity AND voiced; the middle 60% of it is measured (skips the consonant onset and the tail)"""
    y = load(path); snd = parselmouth.Sound(y, sampling_frequency=16000)
    if len(y) < 16000 * 0.1: return dict(f1=0, f2=0, dur=round(len(y) / 16000, 3), voiced=0)   # too short for Praat's 70 Hz window
    inten = snd.to_intensity(minimum_pitch=70, time_step=0.005)
    pitch = snd.to_pitch(time_step=0.005, pitch_floor=70, pitch_ceiling=400)
    ts = inten.xs(); vals = inten.values[0]; peak = float(np.max(vals)) if len(vals) else 0
    loud = [bool(v > peak - 14 and pitch.get_value_at_time(t) and not math.isnan(pitch.get_value_at_time(t))) for t, v in zip(ts, vals)]
    best, cur, start = (0, 0), 0, 0
    for i, v in enumerate(loud):
        if v:
            if cur == 0: start = i
            cur += 1
            if cur > best[1]: best = (start, cur)
        else: cur = 0
    if best[1] < 6: return dict(f1=0, f2=0, dur=round(len(y) / 16000, 3), voiced=0)
    t0, t1 = ts[best[0]], ts[best[0] + best[1] - 1]
    form = snd.to_formant_burg(time_step=0.005, max_number_of_formants=5, maximum_formant=5500 if female else 5000)
    a, b = t0 + (t1 - t0) * 0.2, t0 + (t1 - t0) * 0.8
    f1s, f2s = [], []
    for tt in np.arange(a, b, 0.005):
        v1, v2 = form.get_value_at_time(1, tt), form.get_value_at_time(2, tt)
        if v1 and v2 and not math.isnan(v1) and not math.isnan(v2): f1s.append(v1); f2s.append(v2)
    return dict(f1=round(float(np.median(f1s)) if f1s else 0), f2=round(float(np.median(f2s)) if f2s else 0), dur=round(len(y) / 16000, 3), voiced=round(t1 - t0, 3))

def classify(f1, f2, refs):
    # distance in log-frequency space (roughly perceptual)
    best = None
    for v, (r1, r2) in refs.items():
        if not r1 or not r2 or not f1 or not f2: continue
        d = math.hypot(math.log(f1 / r1), math.log(f2 / r2))
        if best is None or d < best[1]: best = (v, round(d, 3))
    return best or ('?', 9)

if __name__ == '__main__':
    d = sys.argv[1]; fem = 'Female' in d or any(n in d for n in ['Fatima', 'Laila', 'Amina', 'Salma', 'Rana', 'Sana', 'Noura', 'Layla', 'Iman', 'Mouna', 'Aysha', 'Amal', 'Zariyah', 'Amany', 'Reem', 'Maryam'])
    refs = {}
    for v, p in [('a', 'long-ba'), ('i', 'long-bi'), ('u', 'long-bu')]:
        r = analyze(os.path.join(d, p + '.mp3'), fem); refs[v] = (r['f1'], r['f2']); print(f'ref {v}: F1={r["f1"]} F2={r["f2"]} voiced={r["voiced"]}')
    want = {'syl-ba': 'a', 'syl-bi': 'i', 'syl-bu': 'u', 'syl-hu': 'u', 'syl-li': 'i', 'syl-fi': 'i', 'syl-a': 'a', 'syl-i': 'i', 'long-hu': 'u', 'long-li': 'i', 'long-fi': 'i', 'word-1': 'a'}
    ok = 0
    for p, w in want.items():
        f = os.path.join(d, p + '.mp3')
        if not os.path.exists(f): continue
        r = analyze(f, fem); c = classify(r['f1'], r['f2'], refs)
        print(f'{p:8s} want {w} got {c[0]} (d={c[1]}) F1={r["f1"]} F2={r["f2"]} voiced={r["voiced"]}s', 'OK' if c[0] == w else 'WRONG')
        ok += c[0] == w
    print('correct', ok, '/', len(want))
