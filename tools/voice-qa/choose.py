"""Install a verified candidate clip set into assets/voice.
python tools/voice-qa/choose.py --from chatterbox [--atoms-from <other-folder>] [--only haraka,letter] [--dry]

- copies tools/voice-qa/cand/<voice>/<id>.mp3 for every Arabic line in assets/voice/lines.json
  (--atoms-from: lone syllables, letter names and haraka names come from that second voice instead)
- updates assets/voice/clips-texts.json (the text each clip was made from) and assets/voice/VOICE.json
- deletes Arabic clips in assets/voice that no line uses any more (old -sound/-chant/-blend ids)
- VOICE.json "stopgap" lists ids whose installed clip was kept from an earlier set because the candidate's is unusable
  (truncated burst / wrong consonant); they are skipped and the list is carried over, unless --replace-stopgap
English clips are never touched."""
import argparse, json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from judge import kind  # noqa

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
VOICE = os.path.join(ROOT, 'assets', 'voice')
ap = argparse.ArgumentParser()
ap.add_argument('--from', dest='src', required=True); ap.add_argument('--atoms-from', dest='atoms', default='')
ap.add_argument('--only', default=''); ap.add_argument('--dry', action='store_true')
ap.add_argument('--replace-stopgap', action='store_true', help='also overwrite the clips VOICE.json keeps as stopgaps')
a = ap.parse_args()
vpath = os.path.join(VOICE, 'VOICE.json')
old = json.load(open(vpath, encoding='utf-8')) if os.path.exists(vpath) else {}
stopgap = old.get('stopgap') or {}
kept = set() if a.replace_stopgap else {i for k, v in stopgap.items() if isinstance(v, list) for i in v}

lines = json.load(open(os.path.join(VOICE, 'lines.json'), encoding='utf-8'))
pref = [p for p in a.only.split(',') if p]
def is_atom(l): return kind(l['text']) == 'syl' or l['id'].endswith('-name') or l['id'].startswith('haraka-name-')
man_path = os.path.join(VOICE, 'clips-texts.json')
made = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {}
copied = missing = skipped = 0
for l in lines:
    if l.get('lang') == 'en' or (pref and not any(l['id'].startswith(p) for p in pref)): continue
    if l['id'] in kept: skipped += 1; continue
    v = a.atoms if (a.atoms and is_atom(l)) else a.src
    src = os.path.join(HERE, 'cand', v, l['id'] + '.mp3')
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
    out = {'arabic': a.src, 'atoms': a.atoms or a.src, 'english': old.get('english', 'en-US-JennyNeural')}
    if kept: out['stopgap'] = stopgap
    json.dump(out, open(vpath, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(f'{"(dry) " if a.dry else ""}copied {copied}, kept stopgap {skipped}, missing {missing}, removed obsolete {removed}')
