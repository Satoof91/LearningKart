"""Stage 2: generate EVERY Arabic line with one voice into a candidate folder and score each clip.
python tools/voice-qa/evalset.py --voice ar-EG-SalmaNeural [--rate -10%] [--pitch +5Hz] [--only haraka,letter]
-> tools/voice-qa/cand/<voice>/<id>.mp3 (+ .json word timings) and report.csv / report.json / summary.txt

Score per clip (0..1): similarity between the wanted text and what vowel-aware Whisper heard, with the
harakat kept. Lines that end in a lone syllable also get a 'stretch' flag when the final word's
duration is long for a short syllable (> 0.42 s), which is the error the owner hears («بِ» -> «بي»).
Nothing here touches assets/voice: choose.py copies the winners."""
import sys, os, re, csv, json, asyncio, argparse, difflib
import av, numpy as np, edge_tts
from faster_whisper import WhisperModel
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vowel import analyze as vowel_analyze, classify as vowel_classify

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ap = argparse.ArgumentParser()
ap.add_argument('--voice', required=True)
ap.add_argument('--rate', default='-10%'); ap.add_argument('--pitch', default='+5Hz')
ap.add_argument('--only', default='', help='comma-separated id prefixes')
ap.add_argument('--lines', default=os.path.join(ROOT, 'assets', 'voice', 'lines.json'), help='a lines.json (default: the game lines)')
ap.add_argument('--tag', default='', help='folder suffix for text-variant runs')
a = ap.parse_args()
OUT = os.path.join(HERE, 'cand', a.voice + (('__' + a.tag) if a.tag else '')); os.makedirs(OUT, exist_ok=True)

lines = json.load(open(a.lines, encoding='utf-8'))
pref = [p for p in a.only.split(',') if p]
todo = [l for l in lines if l.get('lang') != 'en' and re.search('[؀-ۿ]', l['text']) and (not pref or any(l['id'].startswith(p) for p in pref))]

PROMPT = 'أَلِفْ. بَاءْ. تَاءْ. أَيْنَ حَرْفُ بَاءْ؟ بَ، بَ، بَطَّة. بَ بِ بُ. أَيْنَ بِ يَا بَطَلْ؟ سُلَحْفَاة. هَيَّا نَعُدُّ إِلَى ثَلَاثَة.'
def norm(t):
    t = re.sub('[^ء-ْ ]', ' ', t).replace('ـ', '')
    t = re.sub('[إأآٱ]', 'ا', t)  # hamza seats are not reliable in ASR output
    return ' '.join(t.split())
def nomark(t): return re.sub('[ً-ْ]', '', t)
SYL = re.compile('^[ء-ي][َ-ِ]$')  # one letter + fatha/kasra/damma

async def gen(voice, text, path):
    if os.path.exists(path) and os.path.exists(path + '.json'): return json.load(open(path + '.json', encoding='utf-8'))
    err = None
    for attempt in range(6):
        try:
            c = edge_tts.Communicate(text, voice, rate=a.rate, pitch=a.pitch, boundary='WordBoundary')
            audio, words = b'', []
            async for ch in c.stream():
                if ch['type'] == 'audio': audio += ch['data']
                elif ch['type'] == 'WordBoundary': words.append([ch['offset'] / 1e7, ch['duration'] / 1e7, ch['text']])
            open(path, 'wb').write(audio); json.dump(words, open(path + '.json', 'w', encoding='utf-8'), ensure_ascii=False)
            return words
        except Exception as e:
            err = e; await asyncio.sleep(3 + attempt * 2)
    print('FAIL', text, err); return None

def load(path):
    c = av.open(path); r = av.AudioResampler(format='flt', layout='mono', rate=16000); out = []
    for fr in c.decode(audio=0):
        for f in r.resample(fr): out.append(f.to_ndarray().reshape(-1))
    for f in r.resample(None): out.append(f.to_ndarray().reshape(-1))
    c.close(); return np.concatenate(out).astype(np.float32) if out else np.zeros(1600, np.float32)

FEMALE = any(n in a.voice for n in ['Fatima', 'Laila', 'Amina', 'Salma', 'Rana', 'Sana', 'Noura', 'Layla', 'Iman', 'Mouna', 'Aysha', 'Amal', 'Zariyah', 'Amany', 'Reem', 'Maryam'])
VOW = {'َ': 'a', 'ِ': 'i', 'ُ': 'u'}
def repeat3(au):
    gap = np.zeros(int(16000 * 0.3), np.float32); return np.concatenate([gap, au, gap, au, gap, au, gap])

async def main():
    model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
    rows = []
    # this voice's long-vowel references for the formant check of lone syllables
    refs = {}
    for v, t in [('a', 'بَا'), ('i', 'بِي'), ('u', 'بُو')]:
        rp = os.path.join(OUT, f'_ref-{v}.mp3'); await gen(a.voice, t, rp)
        if os.path.exists(rp): r = vowel_analyze(rp, FEMALE); refs[v] = (r['f1'], r['f2'])
    print('refs', refs)
    for i, l in enumerate(todo):
        path = os.path.join(OUT, l['id'] + '.mp3')
        words = await gen(a.voice, l['text'], path)
        if words is None: rows.append(dict(id=l['id'], text=l['text'], heard='(failed)', score=0, bare=0, stretch='', last=0)); continue
        hp = path + '.heard.txt'
        if os.path.exists(hp): heard = open(hp, encoding='utf-8').read()
        else:
            au = load(path)
            segs, _ = model.transcribe(au, language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt=PROMPT)
            heard = ''.join(s.text for s in segs).strip(); open(hp, 'w', encoding='utf-8').write(heard)
        score = round(difflib.SequenceMatcher(None, norm(l['text']), norm(heard)).ratio(), 2)
        bare = round(difflib.SequenceMatcher(None, nomark(norm(l['text'])), nomark(norm(heard))).ratio(), 2)
        # lone short syllables in the text: each one's spoken duration (from the engine's word timings)
        syls = [w for w in words if SYL.match(w[2].strip('،:؟!. '))]
        longest = round(max([w[1] for w in syls], default=0), 2)
        stretch = 'STRETCH' if longest > 0.42 else ''
        vow = rep = ''
        if SYL.match(l['text']):
            # a lone syllable: Whisper is unreliable on 0.3 s, so (1) formants against this voice's long vowels,
            # (2) Whisper on the clip repeated three times; the clip passes only when both agree with the text
            want = VOW[l['text'][1]]
            r = vowel_analyze(path, FEMALE); c = vowel_classify(r['f1'], r['f2'], refs)
            vow = 'vowel-ok' if c[0] == want else f'vowel-{c[0]}'
            if r['voiced'] > 0.4: stretch = 'STRETCH'
            segs3, _ = model.transcribe(repeat3(load(path)), language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt='بَ بَ بَ. بِ بِ بِ. بُ بُ بُ. هُ هُ هُ. فِ فِ فِ. أَ أَ أَ. إِ إِ إِ.')
            h3 = ''.join(x.text for x in segs3).strip(); heard = h3[:40]
            marks = re.findall('[َ-ِ]', h3); got = {VOW[m] for m in marks}
            rep = 'rep-ok' if got == {want} else ('rep-' + ''.join(sorted(got)) if got else 'rep-none')
            score = 1.0 if (vow == 'vowel-ok' and rep == 'rep-ok') else 0.6 if (vow == 'vowel-ok' or rep == 'rep-ok') else 0.2
        rows.append(dict(id=l['id'], text=l['text'], heard=heard, score=score, bare=bare, stretch=stretch, last=longest, vow=vow, rep=rep))
        print(f"{i+1}/{len(todo)} {l['id']} {score} {stretch} {vow} {rep} | {l['text']} -> {heard}", flush=True)
    # a partial run (--only) updates the matching rows of the existing report instead of replacing it
    rp = os.path.join(OUT, 'report.json')
    if pref and os.path.exists(rp):
        old = {r['id']: r for r in json.load(open(rp, encoding='utf-8'))}
        old.update({r['id']: r for r in rows}); rows = list(old.values())
    json.dump(rows, open(rp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'report.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['id', 'score', 'bare', 'stretch', 'last', 'vow', 'rep', 'text', 'heard']); w.writeheader()
        for r in sorted(rows, key=lambda r: (r['score'], -r['last'])): w.writerow({k: r.get(k, '') for k in w.fieldnames})
    n = len(rows); good = sum(1 for r in rows if r['score'] >= 0.85 and not r['stretch'])
    by = {}
    for r in rows:
        k = re.sub(r'-\d+.*', '', r['id']) if not r['id'].startswith('haraka') else 'haraka-' + (r['id'].split('-')[-1] if r['id'].count('-') >= 2 else 'x')
        by.setdefault(k, []).append(r)
    with open(os.path.join(OUT, 'summary.txt'), 'w', encoding='utf-8') as fh:
        fh.write(f'{a.voice} rate={a.rate} pitch={a.pitch}: {good}/{n} clips pass (score>=0.85, no stretch)\n')
        for k, R in sorted(by.items()):
            g = sum(1 for r in R if r['score'] >= 0.85 and not r['stretch']); fh.write(f'  {k:14s} {g}/{len(R)}  mean={sum(r["score"] for r in R)/len(R):.2f}  stretched={sum(1 for r in R if r["stretch"])}\n')
    print(open(os.path.join(OUT, 'summary.txt'), encoding='utf-8').read())

asyncio.run(main())
