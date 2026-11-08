"""Lone syllables a voice misreads (e.g. «جِ» read as the letter name «جيم»): which generation variant gives
the plain syllable?  python tools/voice-qa/syl_exp.py --voice ar-QA-AmalNeural [--syls جِ,جَ,جُ]
Variants: solo@-10%, solo@-25%, «X،», «Xـ» (tatweel), chant «X X X» with the first syllable sliced out,
carrier «نَعَم، X» with the last word sliced out, «Xْ»? no (sukun kills the vowel), «Xهْ»? no.
Judged by: Whisper ×3 (does it hear the letter name / another vowel?), voiced length (a syllable < 0.35 s),
formant vowel against the voice's own بَا بِي بُو. Writes bench/syl/<voice>/* and bench/syl/result.txt"""
import os, sys, re, json, asyncio, argparse
import numpy as np, edge_tts, parselmouth
from faster_whisper import WhisperModel
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evalset_common import load  # noqa
from vowel import analyze, classify  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('--voice', required=True); ap.add_argument('--syls', default='جِ,جَ,جُ,قِ,حِ,عُ,فِ,وَ,يَ')
a = ap.parse_args(); OUT = os.path.join(HERE, 'bench', 'syl', a.voice); os.makedirs(OUT, exist_ok=True)
FEMALE = any(n in a.voice for n in ['Fatima', 'Laila', 'Amina', 'Salma', 'Rana', 'Sana', 'Noura', 'Layla', 'Iman', 'Mouna', 'Aysha', 'Amal', 'Zariyah', 'Amany', 'Reem', 'Maryam'])
VOW = {'َ': 'a', 'ِ': 'i', 'ُ': 'u'}; NAMES = {'ج': 'جيم', 'ق': 'قاف', 'ح': 'حاء', 'ع': 'عين', 'ف': 'فاء', 'و': 'واو', 'ي': 'ياء', 'ب': 'باء'}

async def gen(text, path, rate='-10%'):
    if os.path.exists(path + '.json'): return json.load(open(path + '.json', encoding='utf-8'))
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

async def main():
    model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
    gap = np.zeros(int(16000 * 0.3), np.float32)
    refs = {}
    for v, t in [('a', 'بَا'), ('i', 'بِي'), ('u', 'بُو')]:
        rp = os.path.join(OUT, f'_ref-{v}.mp3'); await gen(t, rp)
        r = analyze(rp, FEMALE); refs[v] = (r['f1'], r['f2'])
    res = []
    for s in a.syls.split(','):
        want = VOW[s[1]]; name = NAMES.get(s[0], '')
        variants = []
        for rate in ('-10%', '-25%'):
            p = os.path.join(OUT, f'{s}_solo{rate}.mp3')
            if await gen(s, p, rate) is not None: variants.append((f'solo{rate}', load(p)))
        for tag, text in (('comma', s + '،'), ('tatweel', s + 'ـ')):
            p = os.path.join(OUT, f'{s}_{tag}.mp3')
            if await gen(text, p) is not None: variants.append((tag, load(p)))
        p = os.path.join(OUT, f'{s}_chant.mp3'); words = await gen(f'{s} {s} {s}', p)
        if words and len(words) >= 2:
            au = load(p); t1 = quietest(au, words[1][0] - 0.2, words[1][0] + 0.1); variants.append(('chant1st', au[:int(t1 * 16000)]))
        p = os.path.join(OUT, f'{s}_carrier.mp3'); words = await gen(f'نَعَم، {s}', p)
        if words and len(words) >= 2:
            au = load(p); t0 = quietest(au, words[-1][0] - 0.2, words[-1][0] + 0.15); variants.append(('carrier', au[int(t0 * 16000):]))
        line = [f'{s}']
        for tag, au in variants:
            tp = os.path.join(OUT, f'{s}_{tag}.wav'); parselmouth.Sound(au, sampling_frequency=16000).save(tp, 'WAV')
            hp = tp + '.heard.txt'
            if os.path.exists(hp): h = open(hp, encoding='utf-8').read()
            else:
                x = np.concatenate([gap, au, gap, au, gap, au, gap])
                segs, _ = model.transcribe(x, language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt='جِ جِ جِ. جَ جَ جَ. جُ جُ جُ. بِ بِ بِ. قِ قِ قِ. حِ حِ حِ. جِيم. قَاف.')
                h = ''.join(x.text for x in segs).strip(); open(hp, 'w', encoding='utf-8').write(h)
            r = analyze(tp, FEMALE); c = classify(r['f1'], r['f2'], refs)[0]
            marks = {VOW[m] for m in re.findall('[َ-ِ]', h)}
            bad = []
            if name and name[1:] in re.sub('[ً-ْ]', '', h): bad.append('NAME')
            if marks and marks != {want}: bad.append('vowel:' + ''.join(sorted(marks)))
            if c != want and c != '?': bad.append('formant:' + c)
            if r['voiced'] > 0.35: bad.append('long')
            line.append(f"{tag}: {'OK' if not bad else ' '.join(bad)} «{h[:18]}» {r['voiced']:.2f}s")
        out = ' | '.join(line); res.append(out); print(out, flush=True)
    open(os.path.join(HERE, 'bench', 'syl', 'result.txt'), 'a', encoding='utf-8').write(a.voice + '\n' + '\n'.join(res) + '\n')

asyncio.run(main())
