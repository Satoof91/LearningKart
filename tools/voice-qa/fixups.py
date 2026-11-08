"""For every clip of a candidate that the verdict left on 'check', try other ways of generating the same
text and keep the first one that passes the same measurements.
python tools/voice-qa/fixups.py ar-QA-AmalNeural [--ids letter-05-snd,...] [--all]
Variants (in order):
  lone syllable «X»: X + tatweel «Xـ», «X،», sliced out of «نَعَم، X», first of «X X X», solo at -25%
  one word «X»:      solo -25%, solo -40%, «X.», sliced out of «هَذَا: X», sliced out of «نَعَم، X»
  sentence:          -20%, -30%
A sliced clip is cut at the quietest frame around the engine's word boundary (the gap before the word).
Writes tools/voice-qa/cand/<voice>__fix/<id>.mp3 (+ .wav scratch) and report.json rows with 'variant' and
'verdict'; choose.py --fix-from installs the passing ones over the base set."""
import os, sys, re, json, asyncio, argparse
import numpy as np, edge_tts, parselmouth
from faster_whisper import WhisperModel
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evalset_common import load, norm, nomark  # noqa
from vowel import analyze, classify  # noqa
from judge import kind, syl_why, one_why, multi_why, VOW  # noqa
import difflib

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('voice'); ap.add_argument('--ids', default=''); ap.add_argument('--all', action='store_true')
a = ap.parse_args(); SRC = os.path.join(HERE, 'cand', a.voice); OUT = os.path.join(HERE, 'cand', a.voice + '__fix'); os.makedirs(OUT, exist_ok=True)
FEMALE = any(n in a.voice for n in ['Fatima', 'Laila', 'Amina', 'Salma', 'Rana', 'Sana', 'Noura', 'Layla', 'Iman', 'Mouna', 'Aysha', 'Amal', 'Zariyah', 'Amany', 'Reem', 'Maryam'])
PROMPT = 'بَ بَ بَ. بِ بِ بِ. بُ بُ بُ. جِ جِ جِ. حِ حِ حِ. أَلِف. بَاء. تَاء. جِيم. دَال. لَام. قَاف. فَتْحَة. كَسْرَة. ضَمَّة. بَطَّة. رَنَّة. حِصَان. سُلَحْفَاة. هَيَّا نَجْمَعُ حَرْفَ بَاء.'

async def gen(text, path, rate='-10%'):
    if os.path.exists(path + '.json'): return json.load(open(path + '.json', encoding='utf-8'))
    err = None
    for attempt in range(6):
        try:
            c = edge_tts.Communicate(text, a.voice, rate=rate, pitch='+5Hz', boundary='WordBoundary'); audio, words = b'', []
            async for ch in c.stream():
                if ch['type'] == 'audio': audio += ch['data']
                elif ch['type'] == 'WordBoundary': words.append([ch['offset'] / 1e7, ch['duration'] / 1e7, ch['text']])
            open(path, 'wb').write(audio); json.dump(words, open(path + '.json', 'w', encoding='utf-8'), ensure_ascii=False); return words
        except Exception as e:
            err = e; await asyncio.sleep(3 + attempt * 2)
    print('FAIL', text, err); return None

def quietest(au, t_from, t_to, sr=16000):
    inten = parselmouth.Sound(au, sampling_frequency=sr).to_intensity(minimum_pitch=70, time_step=0.005)
    win = [(v, t) for t, v in zip(inten.xs(), inten.values[0]) if t_from <= t <= t_to]
    return min(win)[1] if win else (t_from + t_to) / 2

def to_mp3(wav, mp3):
    """the game ships mp3: encode the sliced wav with ffmpeg if present, else keep the wav as .mp3 fails loudly"""
    import subprocess, shutil
    ff = shutil.which('ffmpeg')
    if not ff: raise SystemExit('ffmpeg is needed to write sliced clips as mp3')
    subprocess.run([ff, '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '4', mp3], check=True)

async def main():
    rows = json.load(open(os.path.join(SRC, 'report.json'), encoding='utf-8'))
    want_ids = set(a.ids.split(',')) if a.ids else None
    todo = [r for r in rows if (want_ids and r['id'] in want_ids) or (not want_ids and (a.all or r.get('verdict') == 'check'))]
    model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
    gap = np.zeros(int(16000 * 0.3), np.float32)
    refs = {}
    for v, t in [('a', 'بَا'), ('i', 'بِي'), ('u', 'بُو')]:
        rp = os.path.join(SRC, f'_ref-{v}.mp3')
        if not os.path.exists(rp): await gen(t, rp)
        r = analyze(rp, FEMALE); refs[v] = (r['f1'], r['f2'])
    def hear(au, n):
        x = np.concatenate([gap] + sum([[au, gap] for _ in range(n)], []))
        segs, _ = model.transcribe(x, language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt=PROMPT)
        return ''.join(s.text for s in segs).strip()
    rp_out = os.path.join(OUT, 'report.json')
    out = {r['id']: r for r in json.load(open(rp_out, encoding='utf-8'))} if os.path.exists(rp_out) else {}
    for n, r in enumerate(todo):
        text, k = r['text'], kind(r['text'])
        if k == 'syl':
            variants = [('tatweel', text + 'ـ', '-10%', None), ('comma', text + '،', '-10%', None), ('carrier', f'نَعَم، {text}', '-10%', 'last'),
                        ('chant1st', f'{text} {text} {text}', '-10%', 'first'), ('slow25', text, '-25%', None)]
        elif k == 'one':
            variants = [('slow25', text, '-25%', None), ('slow40', text, '-40%', None), ('dot', text + '.', '-10%', None),
                        ('carrier-hatha', f'هَذَا: {text}', '-10%', 'last'), ('carrier-naam', f'نَعَم، {text}', '-10%', 'last')]
        else:
            variants = [('slow20', text, '-20%', None), ('slow30', text, '-30%', None)]
        chosen = None; tried = []
        for tag, gtext, rate, cut in variants:
            p = os.path.join(OUT, f"{r['id']}__{tag}.mp3"); words = await gen(gtext, p, rate)
            if words is None: continue
            au = load(p)
            if cut == 'last' and len(words) >= 2: au = au[int(quietest(au, words[-1][0] - 0.2, words[-1][0] + 0.15) * 16000):]
            elif cut == 'first' and len(words) >= 2: au = au[:int(quietest(au, words[1][0] - 0.2, words[1][0] + 0.1) * 16000)]
            elif cut: continue
            wav = os.path.join(OUT, f"{r['id']}__{tag}.wav"); parselmouth.Sound(au, sampling_frequency=16000).save(wav, 'WAV')
            hp = wav + '.heard.txt'
            if os.path.exists(hp): heard = open(hp, encoding='utf-8').read()
            else: heard = hear(au, 3 if k != 'multi' else 1); open(hp, 'w', encoding='utf-8').write(heard)
            score = round(difflib.SequenceMatcher(None, norm(text), norm(heard)).ratio(), 2)
            bare = round(difflib.SequenceMatcher(None, nomark(norm(text)), nomark(norm(heard))).ratio(), 2)
            vow = ''; voiced = 0
            if k == 'syl':
                an = analyze(wav, FEMALE); vow = classify(an['f1'], an['f2'], refs)[0]; voiced = an['voiced']
                why = syl_why(text, heard, vow, voiced)
            elif k == 'one':
                # the ×3 reading: score each heard word against the text, like rescore.py
                ws = [w for w in re.split('[\\s.،؟!:]+', heard) if w]
                s3 = round(max([difflib.SequenceMatcher(None, norm(text), norm(w)).ratio() for w in ws] + [0]), 2)
                b3 = round(max([difflib.SequenceMatcher(None, nomark(norm(text)), nomark(norm(w))).ratio() for w in ws] + [0]), 2)
                why = one_why(text, [heard], max(score, s3), max(bare, b3))
            else:
                why = multi_why(text, heard, bare)
            tried.append(f'{tag}:{why or "OK"}')
            if not why:
                chosen = dict(id=r['id'], text=text, heard=heard[:60], score=score, bare=bare, vow=vow, voiced=voiced, variant=tag, verdict='pass', why='', kind=k)
                if cut: to_mp3(wav, os.path.join(OUT, r['id'] + '.mp3'))
                else: open(os.path.join(OUT, r['id'] + '.mp3'), 'wb').write(open(p, 'rb').read())
                break
        if chosen: out[r['id']] = chosen
        else: out[r['id']] = dict(id=r['id'], text=text, variant='', verdict='check', why='no variant passed: ' + ' '.join(tried), kind=k)
        print(f"{n+1}/{len(todo)} {r['id']} {text} -> {chosen['variant'] + ' «' + chosen['heard'][:25] + '»' if chosen else 'NONE ' + ' '.join(tried)}", flush=True)
        json.dump(list(out.values()), open(rp_out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ok = sum(1 for r in out.values() if r['verdict'] == 'pass')
    print(f'fixed {ok}/{len(out)}; still to check by ear: {len(out) - ok}')

asyncio.run(main())
