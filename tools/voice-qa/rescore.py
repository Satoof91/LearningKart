"""Second opinion for short single-word clips (letter names, haraka names, single words) in a candidate
folder: Whisper hallucinates on a 0.4 s clip, so every low-scoring one-word line is transcribed again
as the clip repeated three times with gaps, and the better of the two scores is kept.
python tools/voice-qa/rescore.py ar-JO-TaimNeural [--all]"""
import sys, os, re, json, csv, difflib
import numpy as np
from faster_whisper import WhisperModel
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evalset_common import load, norm, nomark  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[1]; ALL = '--all' in sys.argv
D = os.path.join(HERE, 'cand', voice)
rows = json.load(open(os.path.join(D, 'report.json'), encoding='utf-8'))
model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
gap = np.zeros(int(16000 * 0.35), np.float32)
n = 0
for r in rows:
    one_word = ' ' not in r['text'].strip('،:؟!. ') and not re.match('^[ء-ي][َ-ِ]$', r['text'])
    if not one_word or (r['score'] >= 0.85 and not ALL): continue
    path = os.path.join(D, r['id'] + '.mp3')
    if not os.path.exists(path): continue
    hp = path + '.heard3.txt'
    if os.path.exists(hp): h3 = open(hp, encoding='utf-8').read()
    else:
        au = load(path); x = np.concatenate([gap, au, gap, au, gap, au, gap])
        prompt = f"{r['text']}. {r['text']}. {r['text']}."
        segs, _ = model.transcribe(x, language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt='أَلِف. بَاء. تَاء. جِيم. حَاء. فَتْحَة. كَسْرَة. ضَمَّة. بَطَّة. سُلَحْفَاة.')
        h3 = ''.join(s.text for s in segs).strip(); open(hp, 'w', encoding='utf-8').write(h3)
    # the repeated clip should read as the word three times: score each heard word against the text
    words = [w for w in re.split('[\\s.،؟!:]+', h3) if w]
    best = max([difflib.SequenceMatcher(None, norm(r['text']), norm(w)).ratio() for w in words] + [0])
    s3 = round(best, 2)
    r['heard3'] = h3[:60]; r['score3'] = s3
    if s3 > r['score']: r['score_single'] = r['score']; r['score'] = s3; r['heard'] = h3[:40]
    n += 1
    print(f"{r['id']} {r.get('score_single', r['score'])} -> {s3} | {r['text']} -> {h3[:50]}", flush=True)
json.dump(rows, open(os.path.join(D, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with open(os.path.join(D, 'report.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=['id', 'score', 'bare', 'stretch', 'last', 'vow', 'rep', 'text', 'heard']); w.writeheader()
    for r in sorted(rows, key=lambda r: (r['score'], -r.get('last', 0))): w.writerow({k: r.get(k, '') for k in w.fieldnames})
good = sum(1 for r in rows if r['score'] >= 0.85 and not r.get('stretch'))
print(f'rescored {n} one-word clips; now {good}/{len(rows)} pass')
