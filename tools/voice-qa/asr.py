"""Voice QA: transcribe the Arabic clips with Whisper and compare with the intended text.
python tools/voice-qa/asr.py [id-prefix ...]   -> tools/voice-qa/report.csv (+ report.json)
The comparison ignores harakat, so it checks WHICH sounds/words are heard; the Arabic
reviewer judges vowels and isolated syllables (Whisper is weak on single syllables)."""
import sys, json, csv, re, difflib, os
import av, numpy as np
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VOICE = os.path.join(ROOT, 'assets', 'voice')
lines = json.load(open(os.path.join(VOICE, 'lines.json'), encoding='utf-8'))
lines = lines['lines'] if isinstance(lines, dict) else lines
pref = sys.argv[1:]
todo = [l for l in lines if l.get('lang') != 'en' and re.search('[؀-ۿ]', l['text']) and (not pref or any(l['id'].startswith(p) for p in pref))]

def load(path):
    c = av.open(path); r = av.AudioResampler(format='flt', layout='mono', rate=16000); out = []
    for fr in c.decode(audio=0):
        for f in r.resample(fr): out.append(f.to_ndarray().reshape(-1))
    for f in r.resample(None): out.append(f.to_ndarray().reshape(-1))
    c.close(); return np.concatenate(out).astype(np.float32) if out else np.zeros(1600, np.float32)

HARAKAT = re.compile('[ً-ْٰـ]')
def norm(t):
    t = HARAKAT.sub('', t)
    t = re.sub('[إأآٱ]', 'ا', t).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    return re.sub('[^ء-ي ]', ' ', t).split()

model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
rows = []
for i, l in enumerate(todo):
    f = os.path.join(VOICE, l['id'] + '.mp3')
    if not os.path.exists(f): rows.append({**l, 'heard': '(missing clip)', 'score': 0}); continue
    a = load(f)
    segs, info = model.transcribe(a, language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt=None)
    heard = ''.join(s.text for s in segs).strip()
    want, got = ' '.join(norm(l['text'])), ' '.join(norm(heard))
    score = round(difflib.SequenceMatcher(None, want, got).ratio(), 2)
    rows.append({'id': l['id'], 'text': l['text'], 'heard': heard, 'score': score, 'secs': round(len(a) / 16000, 2), 'note': l.get('note', '')})
    print(f"{i+1}/{len(todo)} {l['id']} {score} | {l['text']} -> {heard}", flush=True)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'report')
json.dump(rows, open(out + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with open(out + '.csv', 'w', encoding='utf-8-sig', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=['id', 'score', 'text', 'heard', 'secs', 'note']); w.writeheader()
    for r in sorted(rows, key=lambda r: r['score']): w.writerow({k: r.get(k, '') for k in w.fieldnames})
print('done', len(rows), 'clips; below 0.8:', sum(1 for r in rows if r['score'] < 0.8))
