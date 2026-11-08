"""Install a verified candidate clip set into assets/voice.
python tools/voice-qa/choose.py --from ar-EG-ShakirNeural [--atoms-from ar-BH-AliNeural] [--only haraka,letter] [--dry]

- copies tools/voice-qa/cand/<voice>/<id>.mp3 for every Arabic line in assets/voice/lines.json
  (--atoms-from: lone syllables, letter names and haraka names come from that second voice instead)
- updates assets/voice/clips-texts.json (the text each clip was made from) and assets/voice/VOICE.json
- deletes Arabic clips in assets/voice that no line uses any more (old -sound/-chant/-blend ids)
English clips are never touched."""
import argparse, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
VOICE = os.path.join(ROOT, 'assets', 'voice')
ap = argparse.ArgumentParser()
ap.add_argument('--from', dest='src', required=True); ap.add_argument('--atoms-from', dest='atoms', default='')
ap.add_argument('--only', default=''); ap.add_argument('--dry', action='store_true')
ap.add_argument('--fix-from', dest='fix', default='', help='a fixups.py folder (e.g. ar-QA-AmalNeural__fix): its passing clips override the base set')
a = ap.parse_args()
fixed = {}
if a.fix:
    fp = os.path.join(HERE, 'cand', a.fix, 'report.json')
    fixed = {r['id']: r['variant'] for r in json.load(open(fp, encoding='utf-8')) if r.get('verdict') == 'pass' and os.path.exists(os.path.join(HERE, 'cand', a.fix, r['id'] + '.mp3'))}

lines = json.load(open(os.path.join(VOICE, 'lines.json'), encoding='utf-8'))
pref = [p for p in a.only.split(',') if p]
SYL = re.compile('^[ء-ي][َ-ِ]$')
def is_atom(l): return bool(SYL.match(l['text'])) or l['id'].endswith('-name') or l['id'].startswith('haraka-name-')
man_path = os.path.join(VOICE, 'clips-texts.json')
made = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {}
copied = missing = nfix = 0
for l in lines:
    if l.get('lang') == 'en' or (pref and not any(l['id'].startswith(p) for p in pref)): continue
    v = a.fix if l['id'] in fixed else a.atoms if (a.atoms and is_atom(l)) else a.src
    src = os.path.join(HERE, 'cand', v, l['id'] + '.mp3')
    if l['id'] in fixed: nfix += 1
    if not os.path.exists(src): missing += 1; print('MISSING', v, l['id'], l['text']); continue
    if not a.dry: shutil.copyfile(src, os.path.join(VOICE, l['id'] + '.mp3')); made[l['id']] = l['text']
    copied += 1
# obsolete Arabic clips
ids = {l['id'] for l in lines}
removed = 0
for f in os.listdir(VOICE):
    if f.endswith('.mp3') and f[:-4] not in ids and not f.startswith('en-'):
        removed += 1
        if not a.dry: os.remove(os.path.join(VOICE, f)); made.pop(f[:-4], None)
if not a.dry:
    json.dump(made, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True)
    json.dump({'arabic': a.src, 'atoms': a.atoms or a.src, 'fixups': {k: fixed[k] for k in sorted(fixed)}, 'english': 'en-US-JennyNeural'}, open(os.path.join(VOICE, 'VOICE.json'), 'w', encoding='utf-8'), indent=1)
print(f'{"(dry) " if a.dry else ""}copied {copied} ({nfix} from fixups), missing {missing}, removed obsolete {removed}')
