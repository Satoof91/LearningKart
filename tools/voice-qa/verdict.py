"""Final machine verdict per clip for a candidate folder: 'pass' or 'check' (+ reason).
python tools/voice-qa/verdict.py ar-JO-TaimNeural
Rules (what the measurements can honestly support):
- lone syllable: formant vowel must match (or be undecidable) and the repeated-clip reading must not
  name a different vowel; no stretch
- one word (names, words, praise): the words are heard right ignoring harakat (bare >= 0.85) in the
  single or the repeated reading
- sentence: words heard right ignoring harakat (bare >= 0.9)
Everything else is 'check' = the owner listens to it first. Writes 'verdict'/'why' into report.json."""
import sys, os, json, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
voice = sys.argv[1]; D = os.path.join(HERE, 'cand', voice)
rows = json.load(open(os.path.join(D, 'report.json'), encoding='utf-8'))
SYL = re.compile('^[ء-ي][َ-ِ]$')
def kind(r): return 'syl' if SYL.match(r['text']) else 'one' if ' ' not in r['text'].strip('،:؟!. ') else 'multi'
c = collections.Counter()
for r in rows:
    k = kind(r); why = ''
    if r.get('stretch'): why = 'stretched'
    elif k == 'syl':
        v, p = r.get('vow', ''), r.get('rep', '')
        want = {'َ': 'a', 'ِ': 'i', 'ُ': 'u'}[r['text'][1]]
        if v not in ('vowel-ok', 'vowel-?'): why = f'formants say {v[6:]}'
        elif p not in ('rep-ok', 'rep-none', '') and p != 'rep-' + want: why = f'reading says {p[4:]}'
    elif k == 'one':
        if max(r.get('bare', 0), r.get('score3', 0), r.get('score', 0)) < 0.85: why = 'word not recognised'
    else:
        if r.get('bare', 0) < 0.9: why = 'words not recognised'
    r['verdict'] = 'check' if why else 'pass'; r['why'] = why; r['kind'] = k
    c[(k, r['verdict'])] += 1
json.dump(rows, open(os.path.join(D, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
tot = len(rows); ok = sum(1 for r in rows if r['verdict'] == 'pass')
with open(os.path.join(D, 'verdict.txt'), 'w', encoding='utf-8') as fh:
    fh.write(f'{voice}: {ok}/{tot} pass, {tot - ok} to check by ear\n')
    for k in ('syl', 'one', 'multi'): fh.write(f'  {k:6s} pass {c[(k, "pass")]:3d}  check {c[(k, "check")]:3d}\n')
    fh.write('\nCHECK LIST\n')
    for r in rows:
        if r['verdict'] == 'check': fh.write(f"{r['id']:22s} {r['why']:22s} | {r['text']} -> {r.get('heard', '')[:40]}\n")
print(open(os.path.join(D, 'verdict.txt'), encoding='utf-8').read())
