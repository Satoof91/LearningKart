"""Shared helpers for the voice QA scripts."""
import re

def load(path):
    import av, numpy as np   # lazy: the TTS engine venvs import kind()/norm() without av
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

def trim(au, thr=0.01):
    """strip leading/trailing near-silence (cloning models pad their output); au = 16 kHz float array"""
    import numpy as np
    idx = np.where(np.abs(au) > thr)[0]
    if len(idx) == 0: return au
    a, b = max(0, idx[0] - 800), min(len(au), idx[-1] + 1600)
    return au[a:b]
