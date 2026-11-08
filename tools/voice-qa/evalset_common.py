"""Shared helpers for the voice QA scripts."""
import re
import av, numpy as np

def load(path):
    c = av.open(path); r = av.AudioResampler(format='flt', layout='mono', rate=16000); out = []
    for fr in c.decode(audio=0):
        for f in r.resample(fr): out.append(f.to_ndarray().reshape(-1))
    for f in r.resample(None): out.append(f.to_ndarray().reshape(-1))
    c.close(); return np.concatenate(out).astype(np.float32) if out else np.zeros(1600, np.float32)

def norm(t):
    t = re.sub('[^ء-ْ ]', ' ', t).replace('ـ', '')
    t = re.sub('[إأآٱ]', 'ا', t)
    return ' '.join(t.split())

def nomark(t): return re.sub('[ً-ْ]', '', t)
