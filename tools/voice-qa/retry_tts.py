"""Regenerate the weak Arabic clips with Chatterbox Multilingual, several takes per id, for the owner to choose from.
  venvs/chatterbox/bin/python tools/voice-qa/retry_tts.py [--out bench/cloud/chatterbox-retry] [--ids a,b | --ids-file f]
                                                          [--max-rounds N] [--no-adaptive]
Which ids (read from the repo): every id under "stopgap" in assets/voice/VOICE.json, every word clip
(letter-NN-word, word-NN-say, word-NN-onset) and every id whose verdict is "check" in cand/chatterbox/report.json.
Same engine and settings as local_tts.py (voice cloned from ref/amal-haraka-howto.mp3, language_id ar, exaggeration 0.3,
temperature 0.6) but each take differs in seed, cfg_weight (0.3 = slower pacing, 0.5 = as before) and carrier:
  syllable  «نَعَم، X» / «هَذَا: X» (/ «X. X.» last)   word  «هَذَا: X» / «هَذِهِ الكَلِمَة: X.» / «X. X.»     sentence  bare, no carrier
Takes are written to <out>/takes/<id>__<n>.wav + .txt (the target text) + .meta.json (carrier, cfg, seed, gen text, secs);
retry_judge.py cuts the target out of the carrier and judges each take as it appears (<id>__<n>.judge.json).  With
adaptive mode (default) an id stops getting new takes once it has a pass and at least MIN_TAKES takes; haraka-02-da (بُ,
the one the owner hears as wrong) gets the most rounds.  The formant references _ref-a/i/u (بَا بِي بُو) are made first.
Resumable: existing takes are kept."""
import os, sys, re, json, time, argparse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from judge import kind  # noqa
from local_tts import REF_TXT, ref_wav, all_lines  # noqa  (same reference voice, same output layout)

ROOT = os.path.dirname(os.path.dirname(HERE))
CARRIERS = {   # name -> format; retry_judge.py knows how to cut each (see CUT there)
    'naam': 'نَعَم، {x}', 'hatha': 'هَذَا: {x}', 'kalima': 'هَذِهِ الكَلِمَة: {x}.', 'twice': '{x}. {x}.', 'bare': '{x}',
}
# the take plan per kind: (carrier, cfg_weight); the seed is the take number. Round n uses plan[n % len(plan)].
PLAN = {
    'syl': [('naam', 0.5), ('naam', 0.3), ('hatha', 0.5), ('hatha', 0.3), ('naam', 0.3), ('naam', 0.5), ('twice', 0.5), ('twice', 0.3)],
    'one': [('hatha', 0.3), ('hatha', 0.5), ('kalima', 0.3), ('twice', 0.3), ('kalima', 0.5), ('twice', 0.5), ('hatha', 0.3), ('kalima', 0.3)],
    'multi': [('bare', 0.5), ('bare', 0.3), ('bare', 0.5), ('bare', 0.3), ('bare', 0.3), ('bare', 0.5)],
}
MIN_TAKES = {'syl': 3, 'one': 4, 'multi': 2}   # takes an id gets even after a pass (words: pick the slowest pass later)
EXTRA = {'haraka-02-da': 8}                     # extra rounds for بُ

def retry_ids():
    """the ids the task names, read from the repo (VOICE.json stopgap lists + word clips + previous 'check' verdicts)"""
    voice = json.load(open(os.path.join(ROOT, 'assets', 'voice', 'VOICE.json'), encoding='utf-8'))
    ids = set()
    for k in ('truncated', 'wrong', 'word'):
        ids |= set((voice.get('stopgap') or {}).get(k) or [])
    lines = all_lines()
    ids |= {i for i in lines if re.fullmatch(r'letter-\d\d-word|word-\d\d-say|word-\d\d-onset', i)}
    rp = os.path.join(HERE, 'cand', 'chatterbox', 'report.json')
    if os.path.exists(rp): ids |= {r['id'] for r in json.load(open(rp, encoding='utf-8')) if r.get('verdict') == 'check'}
    return [i for i in lines if i in ids]   # lines.json order

def takes_of(tdir, i):
    return sorted(int(m.group(1)) for f in os.listdir(tdir) for m in [re.fullmatch(re.escape(i) + r'__(\d+)\.wav', f)] if m)

def passed(tdir, i):
    for f in os.listdir(tdir):
        if f.startswith(i + '__') and f.endswith('.judge.json'):
            try:
                rows = json.load(open(os.path.join(tdir, f), encoding='utf-8'))
                if any(r.get('verdict') == 'pass' for r in (rows if isinstance(rows, list) else [rows])): return True
            except Exception: pass
    return False

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=os.path.join('bench', 'cloud', 'chatterbox-retry'))
    ap.add_argument('--ids', default=''); ap.add_argument('--ids-file', default='')
    ap.add_argument('--max-rounds', type=int, default=8); ap.add_argument('--no-adaptive', action='store_true')
    a = ap.parse_args()
    out = a.out if os.path.isabs(a.out) else os.path.join(HERE, a.out); tdir = os.path.join(out, 'takes'); os.makedirs(tdir, exist_ok=True)
    lines = all_lines()
    ids = a.ids.split(',') if a.ids else [l.strip() for l in open(a.ids_file, encoding='utf-8') if l.strip()] if a.ids_file else retry_ids()
    json.dump(ids, open(os.path.join(out, 'ids.json'), 'w'), indent=0)
    sys.modules['spacy_pkuseg'] = None   # the tokenizer's Chinese segmenter fetches a model from github.com; Arabic never needs it
    import torch, torchaudio
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    torch.set_num_threads(os.cpu_count() or 4)
    ref = ref_wav(out); m = ChatterboxMultilingualTTS.from_pretrained('cpu')
    def say(text, dst, cfg, seed):
        torch.manual_seed(seed)
        wav = m.generate(text, language_id='ar', audio_prompt_path=ref, exaggeration=0.3, cfg_weight=cfg, temperature=0.6)
        torchaudio.save(dst + '.part.wav', wav.cpu(), m.sr); os.replace(dst + '.part.wav', dst)
    for v, t in [('a', 'بَا'), ('i', 'بِي'), ('u', 'بُو')]:   # formant references, bare, as local_tts.py made them
        p = os.path.join(tdir, f'_ref-{v}.wav')
        if not os.path.exists(p): say(t, p, 0.5, 0); print('ref', v, flush=True)
    made = 0; t_start = time.time()
    for rnd in range(a.max_rounds + max(EXTRA.values())):
        todo = []
        for i in ids:
            k = kind(lines[i]); plan = PLAN[k]
            if rnd >= a.max_rounds + EXTRA.get(i, 0): continue
            if rnd >= len(plan) and i not in EXTRA: continue
            have = takes_of(tdir, i)
            if rnd in have: continue
            if not a.no_adaptive and len(have) >= MIN_TAKES[k] and passed(tdir, i): continue
            todo.append(i)
        if not todo: continue
        print(f'round {rnd}: {len(todo)} ids', flush=True)
        for i in todo:
            text = lines[i]; k = kind(text); carrier, cfg = PLAN[k][rnd % len(PLAN[k])]
            gen = CARRIERS[carrier].format(x=text); dst = os.path.join(tdir, f'{i}__{rnd}.wav')
            t0 = time.time()
            try: say(gen, dst, cfg, 1000 + rnd)
            except Exception as e: print(f'{i} take {rnd} FAILED {str(e)[:200]}', flush=True); continue
            secs = round(time.time() - t0, 1)
            open(dst[:-4] + '.txt', 'w', encoding='utf-8').write(text)
            json.dump(dict(id=i, take=rnd, text=text, kind=k, carrier=carrier, gen=gen, cfg=cfg, seed=1000 + rnd, secs=secs),
                      open(dst[:-4] + '.meta.json', 'w', encoding='utf-8'), ensure_ascii=False)
            made += 1
            print(f'[{made}] {i}__{rnd} {text} ({carrier} cfg{cfg}) {secs}s  total {int(time.time() - t_start)}s', flush=True)
    open(os.path.join(tdir, 'DONE'), 'w').write(str(made))
    print(f'done: {made} takes in {int(time.time() - t_start)}s', flush=True)

if __name__ == '__main__': main()
