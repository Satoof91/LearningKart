"""Pick the best judged take per id from retry_tts.py + retry_judge.py and lay it out for cloud_cand.py:
  venvs/judge/bin/python tools/voice-qa/retry_best.py [--out bench/cloud/chatterbox-retry]
Writes <out>-best/<id>.wav (the padded cut the owner hears), <id>.txt, <id>.cut.wav (same audio: cloud_cand.py ships
it), the folder's _ref-a/i/u.wav, times.json (generation seconds), judge.json (the chosen take's judge row, the keys
bench_judge.py writes) and takes.json (every judged take, for the report), then prints a Markdown summary
(<out>-best/SUMMARY.md: pass counts per group, the settings that passed, the ids still failing with what was heard).
Choice: a pass beats a check; among passes a word takes the longest (slowest) take, a syllable the one whose formants
agree with the reading and then the longest, a sentence the best score; among checks the best bare/vowelled score, then
the longest clip (so the owner hears the most complete attempt, marked check)."""
import os, sys, re, json, shutil, argparse, collections
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from judge import kind  # noqa

GROUP = {'syl': 'syllables', 'one': 'words', 'multi': 'sentences'}
HALLU = ('اشتركوا', 'نانسي')

def rank(r):
    k = r['kind']; p = r['verdict'] == 'pass'
    if p:
        if k == 'one': return (1, r['dur'], r['score'])
        if k == 'syl': return (1, r['vow'] == {'َ': 'a', 'ِ': 'i', 'ُ': 'u'}[r['text'][1]], r['dur'], r['score'])
        return (1, r['score'], r['bare'], r['dur'])
    hallu = any(h in r['heard'] for h in HALLU)
    return (0, not hallu, max(r['bare'], r['score']), r['score'], r['dur'])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=os.path.join('bench', 'cloud', 'chatterbox-retry'))
    a = ap.parse_args()
    out = a.out if os.path.isabs(a.out) else os.path.join(HERE, a.out); tdir = os.path.join(out, 'takes'); best = out.rstrip('/') + '-best'
    os.makedirs(best, exist_ok=True)
    ids = json.load(open(os.path.join(out, 'ids.json')))
    takes = collections.defaultdict(list)
    for f in sorted(os.listdir(tdir)):
        if f.endswith('.judge.json'):
            for r in json.load(open(os.path.join(tdir, f), encoding='utf-8')): takes[r['id']].append(r)
    chosen, rows, times = {}, [], {}
    for i in ids:
        if not takes[i]: print('no judged take for', i); continue
        r = max(takes[i], key=rank); chosen[i] = r
        shutil.copyfile(os.path.join(tdir, r['cut']), os.path.join(best, i + '.wav'))
        shutil.copyfile(os.path.join(tdir, r['cut']), os.path.join(best, i + '.cut.wav'))
        open(os.path.join(best, i + '.txt'), 'w', encoding='utf-8').write(r['text'])
        times[i] = r['secs']
        rows.append({k: r[k] for k in ('id', 'text', 'kind', 'dur', 'heard', 'score', 'bare', 'vow', 'voiced', 'verdict', 'why')})
    for v in 'aiu': shutil.copyfile(os.path.join(tdir, f'_ref-{v}.wav'), os.path.join(best, f'_ref-{v}.wav'))
    json.dump(rows, open(os.path.join(best, 'judge.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(times, open(os.path.join(best, 'times.json'), 'w'), indent=0)
    json.dump({i: takes[i] for i in ids}, open(os.path.join(best, 'takes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # ---- summary
    L = []
    cnt = collections.defaultdict(lambda: [0, 0])
    for i, r in chosen.items(): g = GROUP[r['kind']]; cnt[g][1] += 1; cnt[g][0] += r['verdict'] == 'pass'
    L.append('| group | pass | of |\n|---|---|---|')
    for g in ('syllables', 'words', 'sentences'): L.append(f'| {g} | {cnt[g][0]} | {cnt[g][1]} |')
    tot = sum(v[0] for v in cnt.values()); L.append(f'| **all** | **{tot}** | **{len(chosen)}** |')
    ntakes = sum(len(v) for v in takes.values()); L.append(f'\n{ntakes} judged cuts over {len(chosen)} ids; generation {int(sum(json.load(open(os.path.join(tdir, f))).get("secs", 0) for f in os.listdir(tdir) if f.endswith(".meta.json")))} s.')
    L.append('\n### Settings of the chosen passing takes\n\n| group | carrier | cfg | passes chosen |\n|---|---|---|---|')
    sc = collections.Counter((GROUP[r['kind']], r['carrier'], r['cfg']) for r in chosen.values() if r['verdict'] == 'pass')
    for (g, c, cfg), n in sorted(sc.items(), key=lambda x: (x[0][0], -x[1])): L.append(f'| {g} | {c} | {cfg} | {n} |')
    L.append('\n### Pass rate per setting over every judged cut\n\n| group | carrier | cfg | pass | cuts |\n|---|---|---|---|---|')
    allc = collections.defaultdict(lambda: [0, 0])
    for rs in takes.values():
        for r in rs: key = (GROUP[r['kind']], r['carrier'], r['cfg']); allc[key][1] += 1; allc[key][0] += r['verdict'] == 'pass'
    for key, (p, n) in sorted(allc.items()): L.append(f'| {key[0]} | {key[1]} | {key[2]} | {p} | {n} |')
    L.append('\n### Every id: the chosen take\n\n| id | text | kind | verdict | why | heard | dur s | carrier | cfg | take | best of |\n|---|---|---|---|---|---|---|---|---|---|---|')
    for i in ids:
        if i not in chosen: continue
        r = chosen[i]
        L.append(f"| {i} | {r['text']} | {r['kind']} | {'PASS' if r['verdict'] == 'pass' else 'check'} | {r['why']} | {r['heard'][:40].replace('|', '/')} | {r['dur']} | {r['carrier']} | {r['cfg']} | {r['take']} | {len(takes[i])} |")
    fails = [chosen[i] for i in ids if i in chosen and chosen[i]['verdict'] != 'pass']
    L.append(f'\n### Still failing ({len(fails)}): what the judge heard in the best attempt\n\n| id | text | kind | why | heard | dur s | takes |\n|---|---|---|---|---|---|---|')
    for r in fails: L.append(f"| {r['id']} | {r['text']} | {r['kind']} | {r['why']} | {r['heard'][:50].replace('|', '/')} | {r['dur']} | {len(takes[r['id']])} |")
    md = '\n'.join(L); open(os.path.join(best, 'SUMMARY.md'), 'w', encoding='utf-8').write(md)
    print(md[:3000]); print(f'\n-> {best}')

if __name__ == '__main__': main()
