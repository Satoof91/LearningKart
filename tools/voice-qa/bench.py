"""Benchmark every Microsoft Arabic voice on the lines TTS gets wrong most: letter names, letter
sounds, isolated syllables (fatha/kasra/damma), the find-question and a sentence.
python tools/voice-qa/bench.py [--voices ar-SA-HamedNeural,ar-EG-SalmaNeural] [--out tools/voice-qa/bench]
Writes bench/<voice>/<probe>.mp3, bench/results.csv and bench/ranking.txt.

Scores per clip:
- heard: Whisper large-v3-turbo with a vowel-marked prompt, so it writes harakat
- match: similarity between the wanted text and what was heard (harakat kept)
- for isolated syllables: the engine's own word duration, compared with the same voice saying the
  long-vowel twin («بِ» vs «بِي»). short = duration ratio < 0.75
"""
import sys, os, re, csv, json, asyncio, argparse, difflib
import av, numpy as np, edge_tts
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--voices', default='')
ap.add_argument('--out', default=os.path.join(HERE, 'bench'))
ap.add_argument('--rate', default='-10%'); ap.add_argument('--pitch', default='+5Hz')
a = ap.parse_args()
OUT = a.out; os.makedirs(OUT, exist_ok=True)

ALL = ['ar-AE-FatimaNeural', 'ar-AE-HamdanNeural', 'ar-BH-AliNeural', 'ar-BH-LailaNeural', 'ar-DZ-AminaNeural', 'ar-DZ-IsmaelNeural',
       'ar-EG-SalmaNeural', 'ar-EG-ShakirNeural', 'ar-IQ-BasselNeural', 'ar-IQ-RanaNeural', 'ar-JO-SanaNeural', 'ar-JO-TaimNeural',
       'ar-KW-FahedNeural', 'ar-KW-NouraNeural', 'ar-LB-LaylaNeural', 'ar-LB-RamiNeural', 'ar-LY-ImanNeural', 'ar-LY-OmarNeural',
       'ar-MA-JamalNeural', 'ar-MA-MounaNeural', 'ar-OM-AbdullahNeural', 'ar-OM-AyshaNeural', 'ar-QA-AmalNeural', 'ar-QA-MoazNeural',
       'ar-SA-HamedNeural', 'ar-SA-ZariyahNeural', 'ar-SY-AmanyNeural', 'ar-SY-LaithNeural', 'ar-TN-HediNeural', 'ar-TN-ReemNeural',
       'ar-YE-MaryamNeural', 'ar-YE-SalehNeural']
VOICES = a.voices.split(',') if a.voices else ALL

# (id, text, kind)  kind: name | sound | syl | long | find | chant | sent
PROBES = [
    ('name-ba', 'بَاءْ', 'name'), ('name-ba0', 'بَاء', 'name'), ('name-ta', 'تَاءْ', 'name'), ('name-alif', 'أَلِفْ', 'name'),
    ('name-ayn', 'عَيْنْ', 'name'), ('name-jim', 'جِيمْ', 'name'), ('name-ha', 'هَاءْ', 'name'), ('name-dal', 'دَالْ', 'name'),
    ('sound-ba', 'بَ، بَ، بَطَّة', 'sound'), ('sound-hu', 'هُ، هُ، هُدْهُد', 'sound'), ('sound-u', 'عُ، عُ، عُصْفُور', 'sound'), ('sound-ti', 'تِ، تِ، تِمْسَاح', 'sound'),
    ('syl-ba', 'بَ', 'syl'), ('syl-bi', 'بِ', 'syl'), ('syl-bu', 'بُ', 'syl'), ('syl-hu', 'هُ', 'syl'), ('syl-li', 'لِ', 'syl'), ('syl-fi', 'فِ', 'syl'), ('syl-a', 'أَ', 'syl'), ('syl-i', 'إِ', 'syl'),
    ('long-ba', 'بَا', 'long'), ('long-bi', 'بِي', 'long'), ('long-bu', 'بُو', 'long'), ('long-hu', 'هُو', 'long'), ('long-li', 'لِي', 'long'), ('long-fi', 'فِي', 'long'),
    ('find-bi', 'أَيْنَ بِ؟', 'find'), ('find-bi2', 'أَيْنَ بِ يَا بَطَلْ؟', 'find'),
    ('chant-b', 'بَ بِ بُ', 'chant'), ('chant-b2', 'بَ، بِ، بُ', 'chant'),
    ('sent-1', 'هَيَّا نَجْمَعُ حَرْفَ بَاءْ', 'sent'), ('sent-2', 'أَيْنَ حَرْفُ بَاءْ؟', 'sent'), ('word-1', 'بَطَّة', 'sent'), ('word-2', 'سُلَحْفَاة', 'sent')
]
TWIN = {'syl-ba': 'long-ba', 'syl-bi': 'long-bi', 'syl-bu': 'long-bu', 'syl-hu': 'long-hu', 'syl-li': 'long-li', 'syl-fi': 'long-fi'}

async def gen(voice, text, path):
    """returns word boundaries [(offset_s, dur_s, word)]"""
    if os.path.exists(path + '.json'):
        return json.load(open(path + '.json', encoding='utf-8'))
    for attempt in range(3):
        try:
            c = edge_tts.Communicate(text, voice, rate=a.rate, pitch=a.pitch)
            audio, words = b'', []
            async for ch in c.stream():
                if ch['type'] == 'audio': audio += ch['data']
                elif ch['type'] == 'WordBoundary': words.append([ch['offset'] / 1e7, ch['duration'] / 1e7, ch['text']])
            open(path, 'wb').write(audio); json.dump(words, open(path + '.json', 'w', encoding='utf-8'), ensure_ascii=False)
            return words
        except Exception as e:
            err = e; await asyncio.sleep(2)
    print('FAIL', voice, text, err); return None

def load(path):
    c = av.open(path); r = av.AudioResampler(format='flt', layout='mono', rate=16000); out = []
    for fr in c.decode(audio=0):
        for f in r.resample(fr): out.append(f.to_ndarray().reshape(-1))
    for f in r.resample(None): out.append(f.to_ndarray().reshape(-1))
    c.close(); return np.concatenate(out).astype(np.float32) if out else np.zeros(1600, np.float32)

PROMPT = 'أَلِفْ. بَاءْ. تَاءْ. أَيْنَ حَرْفُ بَاءْ؟ بَ، بَ، بَطَّة. بَ بِ بُ. أَيْنَ بِ يَا بَطَلْ؟ سُلَحْفَاة.'
def norm(t):
    t = re.sub('[^ء-ْ ]', ' ', t).replace('ـ', '')
    return ' '.join(t.split())
def nomark(t): return re.sub('[ً-ْ]', '', t)

async def main():
    model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
    rows = []
    for v in VOICES:
        d = os.path.join(OUT, v); os.makedirs(d, exist_ok=True)
        res = {}
        for pid, text, kind in PROBES:
            path = os.path.join(d, pid + '.mp3')
            words = await gen(v, text, path)
            if words is None or not os.path.exists(path): continue
            au = load(path)
            segs, _ = model.transcribe(au, language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt=PROMPT)
            heard = ''.join(s.text for s in segs).strip()
            match = round(difflib.SequenceMatcher(None, norm(text), norm(heard)).ratio(), 2)
            bare = round(difflib.SequenceMatcher(None, nomark(norm(text)), nomark(norm(heard))).ratio(), 2)
            speech = round(sum(w[1] for w in words), 3) if words else round(len(au) / 16000, 3)
            res[pid] = dict(id=pid, voice=v, kind=kind, text=text, heard=heard, match=match, bare=bare, speech=speech, nwords=len(words))
            print(f'{v} {pid} match={match} dur={speech} | {text} -> {heard}', flush=True)
        # syllable shortness: duration against the long twin
        for s, l in TWIN.items():
            if s in res and l in res and res[l]['speech'] > 0:
                res[s]['ratio'] = round(res[s]['speech'] / res[l]['speech'], 2)
        rows += list(res.values())
    with open(os.path.join(OUT, 'results.csv'), 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['voice', 'id', 'kind', 'text', 'heard', 'match', 'bare', 'speech', 'ratio', 'nwords']); w.writeheader()
        for r in rows: w.writerow({k: r.get(k, '') for k in w.fieldnames})
    # ranking: mean match per kind, syllable shortness, merge errors
    rank = []
    for v in VOICES:
        R = [r for r in rows if r['voice'] == v]
        if not R: continue
        def mean(kind, key='match'): xs = [r[key] for r in R if r['kind'] == kind]; return round(sum(xs) / len(xs), 2) if xs else 0
        ratios = [r['ratio'] for r in R if 'ratio' in r]
        short = round(sum(1 for x in ratios if x < 0.75) / len(ratios), 2) if ratios else 0
        syl_ok = round(sum(1 for r in R if r['kind'] == 'syl' and norm(r['heard']) == norm(r['text'])) / max(1, sum(1 for r in R if r['kind'] == 'syl')), 2)
        score = round(0.3 * mean('name') + 0.2 * mean('sound') + 0.2 * syl_ok + 0.15 * short + 0.15 * mean('sent'), 3)
        rank.append((score, v, dict(name=mean('name'), sound=mean('sound'), syl_exact=syl_ok, short=short, find=mean('find'), chant=mean('chant'), sent=mean('sent'))))
    rank.sort(reverse=True)
    with open(os.path.join(OUT, 'ranking.txt'), 'w', encoding='utf-8') as fh:
        for sc, v, m in rank: fh.write(f'{sc:.3f} {v:24s} {m}\n')
    print('\n'.join(f'{sc:.3f} {v:24s} {m}' for sc, v, m in rank))

asyncio.run(main())
