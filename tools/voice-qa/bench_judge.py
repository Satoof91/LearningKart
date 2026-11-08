"""Judge any folder of clips (<id>.wav + <id>.txt) with the same rules as the game's verdict:
lone syllable -> Whisper ×3 + formants (against the SAME folder's بَا/بِي/بُو refs when present, else the clip's engine
is asked for them by spaces_tts.py --texts), one word -> Whisper ×3 word-by-word, sentence -> Whisper ×1.
python tools/voice-qa/bench_judge.py bench/spaces/habibi [bench/spaces/silma ...]
Writes <folder>/judge.json and prints a table; bench_page.py turns several folders into an A/B listening page."""
import os, sys, re, json, difflib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evalset_common import load, norm, nomark, trim  # noqa
from vowel import analyze, classify  # noqa
from judge import kind, syl_why, one_why, multi_why  # noqa
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPT = 'بَ بَ بَ. بِ بِ بِ. بُ بُ بُ. جِ جِ جِ. حِ حِ حِ. أَلِف. بَاء. تَاء. جِيم. دَال. لَام. قَاف. فَتْحَة. كَسْرَة. ضَمَّة. بَطَّة. رَنَّة. حِصَان. سُلَحْفَاة. هَيَّا نَجْمَعُ حَرْفَ بَاء.'
model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
gap = np.zeros(int(16000 * 0.3), np.float32)

def after_gap(au, lo=0.3, hi=0.85):
    """cut at the quietest frame in the middle part of the clip: the pause between the carrier word and the target"""
    import parselmouth
    inten = parselmouth.Sound(au, sampling_frequency=16000).to_intensity(minimum_pitch=70, time_step=0.005)
    n = len(au) / 16000
    win = [(v, t) for t, v in zip(inten.xs(), inten.values[0]) if lo * n <= t <= hi * n]
    if not win: return au
    t = min(win)[1]
    return trim(au[int(t * 16000):])

def hear(au, n):
    x = np.concatenate([gap] + sum([[au, gap] for _ in range(n)], []))
    segs, _ = model.transcribe(x, language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt=PROMPT)
    return ''.join(s.text for s in segs).strip()

def judge_folder(d):
    female = True   # the reference voice is Amal (female) for every engine here
    refs = {}
    for v, t in [('a', 'بَا'), ('i', 'بِي'), ('u', 'بُو')]:
        rp = os.path.join(d, f'_ref-{v}.wav')
        if os.path.exists(rp):
            r = analyze(rp, female); refs[v] = (r['f1'], r['f2'])
    rows = []
    for f in sorted(os.listdir(d)):
        if not f.endswith('.wav') or f.startswith('_ref'): continue
        i = f[:-4]; tp = os.path.join(d, i + '.txt')
        if not os.path.exists(tp): continue
        text = open(tp, encoding='utf-8').read().strip(); k = kind(text)
        au = trim(load(os.path.join(d, f)))
        if os.path.exists(os.path.join(d, i + '.gen.txt')):   # carrier «نَعَم، X» / «هَذَا: X»: keep what follows the gap
            au = after_gap(au); import parselmouth
            parselmouth.Sound(au, sampling_frequency=16000).save(os.path.join(d, i + '.cut.wav'), 'WAV')
        dur = round(len(au) / 16000, 2)
        heard = hear(au, 3 if k != 'multi' else 1)
        score = round(difflib.SequenceMatcher(None, norm(text), norm(heard)).ratio(), 2)
        bare = round(difflib.SequenceMatcher(None, nomark(norm(text)), nomark(norm(heard))).ratio(), 2)
        vow = ''; voiced = 0
        if k == 'syl':
            import parselmouth
            wav = os.path.join(d, i + '.trim.wav'); parselmouth.Sound(au, sampling_frequency=16000).save(wav, 'WAV')
            an = analyze(wav, female); voiced = an['voiced']
            vow = classify(an['f1'], an['f2'], refs)[0] if refs else '?'
            why = syl_why(text, heard, vow, voiced)
        elif k == 'one':
            ws = [w for w in re.split('[\\s.،؟!:]+', heard) if w]
            s3 = round(max([difflib.SequenceMatcher(None, norm(text), norm(w)).ratio() for w in ws] + [0]), 2)
            b3 = round(max([difflib.SequenceMatcher(None, nomark(norm(text)), nomark(norm(w))).ratio() for w in ws] + [0]), 2)
            why = one_why(text, [heard], max(score, s3), max(bare, b3))
        else:
            why = multi_why(text, heard, bare)
        rows.append(dict(id=i, text=text, kind=k, dur=dur, heard=heard[:80], score=score, bare=bare, vow=vow, voiced=round(voiced, 2), verdict='check' if why else 'pass', why=why))
        print(f"{os.path.basename(d):10s} {i:10s} {text:28s} {dur:5.2f}s {'PASS ' if not why else 'check'} {why[:40]:40s} «{heard[:40]}»", flush=True)
    json.dump(rows, open(os.path.join(d, 'judge.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ok = sum(1 for r in rows if r['verdict'] == 'pass')
    print(f'{d}: {ok}/{len(rows)} pass', flush=True)

for d in sys.argv[1:]: judge_folder(os.path.join(HERE, d) if not os.path.isabs(d) else d)
