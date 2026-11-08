"""Final machine verdict per clip for a candidate folder: 'pass' or 'check' (+ reason).
python tools/voice-qa/verdict.py ar-JO-TaimNeural [--labels tools/voice-qa/owner-review.txt]
Rules (what the measurements can honestly support), calibrated on the owner's own ear labels
(owner-review.txt, 2026-11-08: every clip the owner marked wrong must come out 'check'):
- lone syllable: formant vowel must match (or be undecidable) and the repeated-clip reading must not
  name a different vowel; no stretch
- one word (names, words, praise): heard WITH harakat (score >= 0.85, single or repeated reading) AND
  the heard word keeps the text's long vowels (ا ي و) and its shadda. «دَال» heard «دَل», «رَنَّة»
  heard «رَن» are what the owner hears too: swallowed vowel / gemination = check.
- sentence: words heard right ignoring harakat (bare >= 0.9) and no long vowel lost in any word
Everything else is 'check' = the owner listens to it first. Writes 'verdict'/'why' into report.json."""
import sys, os, json, re, collections, difflib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HERE = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[1]; D = os.path.join(HERE, 'cand', voice)
labels_path = sys.argv[sys.argv.index('--labels') + 1] if '--labels' in sys.argv else os.path.join(HERE, 'owner-review.txt')
rows = json.load(open(os.path.join(D, 'report.json'), encoding='utf-8'))
from judge import kind as _kind, syl_why, one_why, multi_why  # noqa
def kind(r): return _kind(r['text'])

c = collections.Counter()
for r in rows:
    k = kind(r); why = ''
    heard_list = [r.get('heard', ''), r.get('heard3', '')]
    if r.get('stretch'): why = 'stretched'
    elif k == 'syl':
        v, p = r.get('vow', ''), r.get('rep', '')
        want = {'َ': 'a', 'ِ': 'i', 'ُ': 'u'}[r['text'][1]]
        # the ×3 reading is stored in 'heard' for syllables; formant class from the evalset's 'vow' field
        cls = want if v == 'vowel-ok' else '?' if v in ('vowel-?', '') else v[6:]
        why = syl_why(r['text'], r.get('heard', ''), cls, 0)
        if not why and p not in ('rep-ok', 'rep-none', '') and p != 'rep-' + want: why = f'reading says {p[4:]}'
    elif k == 'one':
        why = one_why(r['text'], heard_list, max(r.get('score', 0), r.get('score3', 0)), r.get('bare', 0))
    else:
        why = multi_why(r['text'], r.get('heard', ''), r.get('bare', 0))
    r['verdict'] = 'check' if why else 'pass'; r['why'] = why; r['kind'] = k
    c[(k, r['verdict'])] += 1
json.dump(rows, open(os.path.join(D, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
tot = len(rows); ok = sum(1 for r in rows if r['verdict'] == 'pass')
out = [f'{voice}: {ok}/{tot} pass, {tot - ok} to check by ear']
for k in ('syl', 'one', 'multi'): out.append(f'  {k:6s} pass {c[(k, "pass")]:3d}  check {c[(k, "check")]:3d}')
# calibration against the owner's labels: a clip the owner marked wrong must not be 'pass'
if os.path.exists(labels_path):
    lab = {}
    for line in open(labels_path, encoding='utf-8'):
        m = re.match(r'(\S+) (ok|bad) ?(.*)', line.strip())
        if m: lab[m.group(1)] = 'bad' if (m.group(2) == 'bad' or 'غير' in m.group(3)) else 'ok'
    by = {r['id']: r for r in rows}
    missed = [i for i, v in lab.items() if v == 'bad' and i in by and by[i]['verdict'] == 'pass']
    agree = sum(1 for i, v in lab.items() if i in by and (v == 'bad') == (by[i]['verdict'] == 'check'))
    out.append(f'\nOWNER LABELS: {len(lab)} labelled, machine agrees on {agree}; owner-bad clips the machine still passes: {len(missed)}')
    for i in missed: out.append(f'  MISSED {i:22s} | {by[i]["text"]} -> {by[i].get("heard", "")[:40]}')
out.append('\nCHECK LIST')
for r in rows:
    if r['verdict'] == 'check': out.append(f"{r['id']:22s} {r['why']:28s} | {r['text']} -> {r.get('heard', '')[:40]}")
open(os.path.join(D, 'verdict.txt'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('\n'.join(out[:40]))
