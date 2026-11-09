"""Cut and judge the takes retry_tts.py makes, as they appear (run in the judge venv, alongside the generator):
  venvs/judge/bin/python tools/voice-qa/retry_judge.py [--out bench/cloud/chatterbox-retry] [--once]
For every <out>/takes/<id>__<n>.wav without a .judge.json: the target is cut out of its carrier (see cut()), judged with
the game's rules (bench_judge.judge_clip: Whisper ×3 word-by-word + formants for a syllable, Whisper ×1 for a sentence),
and <id>__<n>.judge.json is written: a list of rows (one per cut; the «X. X.» carrier yields two) with the judge's keys
plus take, carrier, cfg, seed, secs and cut (the padded cut wav the owner would hear).
Cut rule: the carrier ends at the first pause (>= 60-80 ms under -28 dB of the peak) after the carrier's own length;
the clip is the target's sound (first to last frame above -36 dB of the peak) between 0.15 s of digital silence before
and 0.2 s after (5 ms fades), so no consonant is lost and no murmur or carrier remnant rides along; a pause inside the
target (0.1 s syllable / 0.15 s word / 0.5 s sentence) means stray babble follows and the clip stops there (stray = s cut).
tail_db = how loud the 0.2 s after the target was before it was silenced (murmur level, a tiebreaker when choosing).  Length floor on top of the judge: a syllable clip must last >= 0.3 s, a word >= 0.15 s per
letter (as the judge measures dur, silence-trimmed); shorter takes are marked check «too short»; a word whose ×3 reading
holds more than four words is marked check «extra sound heard».
Stops when <out>/takes/DONE exists and every take is judged (--once: a single pass)."""
import os, sys, re, json, time, argparse
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from evalset_common import load, trim, nomark  # noqa
from judge import kind  # noqa
import bench_judge  # noqa  (loads Whisper once)
import parselmouth

SR = 16000; HOP = 160   # 10 ms frames
PAD_BEFORE, PAD_AFTER = 0.15, 0.20
MIN_LEAD = {'naam': 0.25, 'hatha': 0.25, 'kalima': 0.70}   # seconds of carrier speech before the pause we look for
MIN_GAP = {'naam': 0.06, 'hatha': 0.06, 'kalima': 0.08, 'twice': 0.12}

def rms_frames(au):
    n = len(au) // HOP
    return np.sqrt(np.mean(au[:n * HOP].reshape(n, HOP) ** 2, axis=1)) if n else np.zeros(0)

def silences(r, thr, min_frames):
    """[(start, end)) frame runs below thr lasting >= min_frames"""
    out = []; s = None
    for i, v in enumerate(list(r < thr) + [False]):
        if v and s is None: s = i
        elif not v and s is not None:
            if i - s >= min_frames: out.append((s, i))
            s = None
    return out

STRAY_GAP = {'syl': 0.10, 'one': 0.15, 'multi': 0.50}   # a pause this long inside the target = stray sound follows: cut it off

def fade(seg, ms=5):
    n = min(int(SR * ms / 1000), len(seg) // 2)
    if n: w = np.linspace(0, 1, n, dtype=np.float32); seg[:n] *= w; seg[-n:] *= w[::-1]
    return seg

def padded(au, a, b, k='one'):
    """-> (clip, info): the target au[a:b] with 0.15 s of digital silence before its first sound and 0.2 s after its
    last (5 ms fades), anything after a pause of STRAY_GAP[k] inside it dropped (chatterbox babbles after a short
    target now and then); info = dict(tail_db: murmur level of the 0.2 s that followed the target, rel. peak; stray: s cut)"""
    r = rms_frames(au[a:b]); pk = float(r.max()) if len(r) else 0
    low = max(1e-4, pk * 10 ** (-36 / 20)); thr = pk * 10 ** (-28 / 20)
    nz = np.where(r > low)[0]
    if not len(nz): return au[a:b], dict(tail_db=-99, stray=0)
    on = nz[0]; off = nz[-1] + 1
    stray = 0
    for g0, g1 in silences(r[on:off], thr, int(STRAY_GAP[k] / 0.01)):   # first real pause inside the target: stop there
        off2 = on + g0; stray = round((off - off2) / 100, 2); off = off2; break
    core = au[a + on * HOP:a + off * HOP].copy()
    tail = au[a + off * HOP:a + off * HOP + int(0.2 * SR)]
    tail_db = round(20 * np.log10(max(float(np.sqrt(np.mean(tail ** 2))) if len(tail) else 1e-6, 1e-6) / max(pk, 1e-6)), 1)
    clip = np.concatenate([np.zeros(int(PAD_BEFORE * SR), np.float32), fade(core), np.zeros(int(PAD_AFTER * SR), np.float32)])
    return clip, dict(tail_db=tail_db, stray=stray)

def cut(au, carrier, k):
    """-> [(audio, note, info)]: the target(s) cut out of the carrier take (au = trimmed 16 kHz take), padded()"""
    r = rms_frames(au)
    if not len(r): return [(au, 'empty', {})]
    if carrier == 'bare': return [padded(au, 0, len(au), k) + ('bare',)]
    thr = float(r.max()) * 10 ** (-28 / 20)
    gaps = silences(r, thr, int(MIN_GAP[carrier] / 0.01))
    if carrier == 'twice':
        mid = [g for g in gaps if 0.25 * len(r) <= (g[0] + g[1]) / 2 <= 0.75 * len(r)]
        if not mid: return [padded(au, 0, len(au), k) + ('twice:no-gap',)]
        g = max(mid, key=lambda g: g[1] - g[0])
        return [padded(au, 0, g[0] * HOP + HOP, k) + ('twice:1st',), padded(au, g[1] * HOP - HOP, len(au), k) + ('twice:2nd',)]
    lead = int(MIN_LEAD[carrier] / 0.01)
    low = float(r.max()) * 10 ** (-36 / 20)
    for g in gaps:   # the first pause after the carrier that still has sound after it (else the target was before the pause)
        if g[0] >= lead and int(np.sum(r[g[1]:] > low)) >= 8:
            return [padded(au, g[1] * HOP - HOP, len(au), k) + (f'{carrier}:gap@{g[0] / 100:.2f}-{g[1] / 100:.2f}s',)]
    # no clear pause: fall back to the quietest frame in the middle part, like bench_judge.after_gap
    lo, hi = int(0.3 * len(r)), int(0.85 * len(r))
    q = lo + int(np.argmin(r[lo:hi])) if hi > lo else 0
    return [padded(au, q * HOP, len(au), k) + (f'{carrier}:quietest@{q / 100:.2f}s',)]

def min_dur(text, k):
    if k == 'syl': return 0.3
    if k == 'one': return 0.15 * len([c for c in nomark(text) if 'ء' <= c <= 'ي'])
    return 0

def judge_take(tdir, wav, refs):
    name = wav[:-4]; base = os.path.join(tdir, name); meta = json.load(open(base + '.meta.json', encoding='utf-8'))
    text = meta['text']; k = kind(text)
    au = trim(load(os.path.join(tdir, wav)))
    rows = []
    for n, (seg, info, note) in enumerate(cut(au, meta['carrier'], k)):
        cname = f'{name}{"ab"[n] if note.startswith("twice:") else ""}.cut.wav'
        parselmouth.Sound(seg, sampling_frequency=SR).save(os.path.join(tdir, cname), 'WAV')
        row = bench_judge.judge_clip(tdir, cname[:-8], text, trim(seg), refs)
        row['id'] = meta['id']
        md = min_dur(text, k)
        if row['verdict'] == 'pass' and row['dur'] < md: row['verdict'] = 'check'; row['why'] = f'too short ({row["dur"]} s < {md:.2f})'
        nwords = len([w for w in re.split('[\\s.،؟!:]+', row['heard']) if w])
        if row['verdict'] == 'pass' and k == 'one' and nwords > 3 * len(text.split()) + 1: row['verdict'] = 'check'; row['why'] = f'extra sound heard ({nwords} words for 3 readings)'
        row.update(info); row.update(take=meta['take'], carrier=meta['carrier'], cfg=meta['cfg'], seed=meta['seed'], secs=meta['secs'], cut=cname, cutnote=note, full=round(len(au) / SR, 2))
        rows.append(row)
        print(f"{meta['id']:16s} t{meta['take']} {meta['carrier']:6s} cfg{meta['cfg']} {text:14s} {row['dur']:5.2f}s {'PASS ' if row['verdict'] == 'pass' else 'check'} {row['why'][:36]:36s} «{row['heard'][:40]}»  {note}", flush=True)
    json.dump(rows, open(base + '.judge.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=os.path.join('bench', 'cloud', 'chatterbox-retry')); ap.add_argument('--once', action='store_true')
    a = ap.parse_args()
    out = a.out if os.path.isabs(a.out) else os.path.join(HERE, a.out); tdir = os.path.join(out, 'takes')
    while not all(os.path.exists(os.path.join(tdir, f'_ref-{v}.wav')) for v in 'aiu'): time.sleep(5)
    refs = bench_judge.formant_refs(tdir); print('formant refs', refs, flush=True)
    while True:
        todo = sorted(f for f in os.listdir(tdir) if re.fullmatch(r'.+__\d+\.wav', f) and os.path.exists(os.path.join(tdir, f[:-4] + '.meta.json'))
                      and not os.path.exists(os.path.join(tdir, f[:-4] + '.judge.json')))
        for f in todo:
            try: judge_take(tdir, f, refs)
            except Exception as e: print(f'{f} judge FAILED {e!r}', flush=True); json.dump([], open(os.path.join(tdir, f[:-4] + '.judge.json'), 'w'))
        if a.once or (os.path.exists(os.path.join(tdir, 'DONE')) and not todo): break
        if not todo: time.sleep(5)

if __name__ == '__main__': main()
