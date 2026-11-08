"""How does each voice say ج?  Acoustic pre-ranking only — the owner's ear decides.
python tools/voice-qa/jim.py [--bench tools/voice-qa/bench]
MSA ج is the affricate /dʒ/: a closure (silence) then 60–120 ms of loud high-frequency frication.
Egyptian /g/: closure then a ~20 ms burst, voicing resumes at once (little frication).
Levantine /ʒ/: long frication with no closure before it.
Measured in «نَجْمَعُ» of bench sent-1 (between the nasal and the vowel) and at the start of name-jim «جِيمْ»:
  closure = low-intensity gap (ms), fric = unvoiced noisy stretch after it (ms), centroid = Hz of the noise.
Writes bench/jim.csv and prints a table sorted by how /dʒ/-like the ج is."""
import os, sys, json, csv, math, argparse
import numpy as np, parselmouth
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evalset_common import load  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('--bench', default=os.path.join(HERE, 'bench')); a = ap.parse_args()
SR = 16000

def frames(y):
    snd = parselmouth.Sound(y, sampling_frequency=SR)
    inten = snd.to_intensity(minimum_pitch=70, time_step=0.005)
    pitch = snd.to_pitch(time_step=0.005, pitch_floor=70, pitch_ceiling=400)
    ts = inten.xs(); vals = inten.values[0]
    voiced = np.array([not math.isnan(pitch.get_value_at_time(t)) for t in ts])
    return ts, vals, voiced

def centroid(seg):
    if len(seg) < 64: return 0
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); f = np.fft.rfftfreq(len(seg), 1 / SR)
    return float((sp * f).sum() / (sp.sum() + 1e-9))

def jim_segment(y, t_from, t_to):
    """inside [t_from, t_to]: after the first voiced run ends, closure = frames quieter than peak-25 dB,
    then fric = unvoiced frames until voicing resumes. Returns ms, ms, Hz."""
    ts, vals, voiced = frames(y); peak = float(np.max(vals))
    idx = [i for i, t in enumerate(ts) if t_from <= t <= t_to]
    if not idx: return None
    i = idx[0]
    while i <= idx[-1] and not voiced[i]: i += 1          # skip to the first voiced frame (the nasal)
    while i <= idx[-1] and voiced[i]: i += 1              # through the nasal
    j = i
    while j <= idx[-1] and vals[j] < peak - 25: j += 1    # closure: quiet
    k = j
    while k <= idx[-1] and not voiced[k]: k += 1          # frication: loud but unvoiced
    if i > idx[-1]: return None
    seg = y[int(ts[j] * SR):int(ts[min(k, len(ts) - 1)] * SR)]
    return round((ts[j] - ts[i]) * 1000), round((ts[min(k, len(ts) - 1)] - ts[j]) * 1000), round(centroid(seg))

def jim_onset(y):
    """name-jim: from speech onset (peak-30 dB) to the first voiced frame; the noise there is the ج"""
    ts, vals, voiced = frames(y); peak = float(np.max(vals))
    i = 0
    while i < len(ts) and vals[i] < peak - 30: i += 1
    k = i
    while k < len(ts) and not voiced[k]: k += 1
    seg = y[int(ts[i] * SR):int(ts[min(k, len(ts) - 1)] * SR)]
    return round((ts[min(k, len(ts) - 1)] - ts[i]) * 1000), round(centroid(seg))

rows = []
for v in sorted(os.listdir(a.bench)):
    d = os.path.join(a.bench, v)
    if not v.startswith('ar-') or not os.path.isdir(d): continue
    r = dict(voice=v, closure='', fric='', cent='', onset_fric='', onset_cent='')
    p = os.path.join(d, 'sent-1.mp3')
    if os.path.exists(p) and os.path.exists(p + '.json'):
        words = json.load(open(p + '.json', encoding='utf-8'))
        w = next((w for w in words if 'جمع' in w[2].replace('َ', '').replace('ْ', '').replace('ُ', '')), None)
        if w:
            res = jim_segment(load(p), w[0], w[0] + w[1] + 0.05)
            if res: r['closure'], r['fric'], r['cent'] = res
    p = os.path.join(d, 'name-jim.mp3')
    if os.path.exists(p):
        r['onset_fric'], r['onset_cent'] = jim_onset(load(p))
    rows.append(r)

def dj_score(r):
    """closer to /dʒ/: a closure present (>= 20 ms), frication 50–140 ms, noise centroid above 2500 Hz"""
    if r['fric'] == '': return -1
    s = 0
    s += 1 if r['closure'] >= 20 else 0
    s += 1 if 50 <= r['fric'] <= 140 else 0
    s += 1 if r['cent'] >= 2500 else 0
    s += 0.5 if 50 <= (r['onset_fric'] or 0) <= 160 else 0
    return s
rows.sort(key=dj_score, reverse=True)
with open(os.path.join(a.bench, 'jim.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) + ['dj']); w.writeheader()
    for r in rows: w.writerow({**r, 'dj': dj_score(r)})
print(f"{'voice':24s} {'dj':>4s} | نَجْمَعُ: closure  fric  centroid | جِيم onset: fric centroid")
for r in rows:
    print(f"{r['voice']:24s} {dj_score(r):4.1f} | {str(r['closure']):>7s} {str(r['fric']):>5s} {str(r['cent']):>9s} | {str(r['onset_fric']):>12s} {str(r['onset_cent']):>8s}")
