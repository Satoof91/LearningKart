"""Long vowels / shadda / ta-marbuta in short words: which generation variant keeps them?
The owner hears «دَال» as «دَل», «رَنَّة» as «رَن», «بَطَّة» as «بَطَّ» in the standalone clips. Variants tried:
  solo@-10%  solo@-25%  solo@-40%   (the word alone, slower)
  cut:حَرْفُ X / cut:هَذِهِ X          (a carrier phrase, the last word sliced out with the engine's word timings)
  solo:X.  (a period after the word; some engines then finish the word properly)
Each variant is transcribed ×3 by Whisper (diacritized prompt) and judged with verdict.long_lost + the
voiced length of the word. python tools/voice-qa/names_exp.py --voices ar-IQ-BasselNeural,ar-QA-MoazNeural
Writes bench/names/<voice>/*.mp3 and bench/names/result.txt"""
import os, sys, re, json, asyncio, argparse, difflib
import numpy as np, edge_tts
from faster_whisper import WhisperModel
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evalset_common import load, norm, nomark  # noqa
from vowel import analyze  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('--voices', required=True); ap.add_argument('--words', default='')
a = ap.parse_args(); OUT = os.path.join(HERE, 'bench', 'names')
WORDS = a.words.split(',') if a.words else ['دَال', 'ضَاد', 'لَام', 'قَاف', 'نُون', 'ذَال', 'صَاد', 'كَاف', 'رَنَّة', 'بَطَّة', 'حِصَان', 'جَمَل', 'تَاء', 'خَاء']
PROMPT = 'أَلِف. بَاء. تَاء. جِيم. حَاء. دَال. ضَاد. لَام. قَاف. نُون. رَنَّة. بَطَّة. حِصَان. سُلَحْفَاة.'

async def gen(voice, text, path, rate):
    if os.path.exists(path + '.json'): return json.load(open(path + '.json', encoding='utf-8'))
    for attempt in range(6):
        try:
            c = edge_tts.Communicate(text, voice, rate=rate, pitch='+5Hz', boundary='WordBoundary'); audio, words = b'', []
            async for ch in c.stream():
                if ch['type'] == 'audio': audio += ch['data']
                elif ch['type'] == 'WordBoundary': words.append([ch['offset'] / 1e7, ch['duration'] / 1e7, ch['text']])
            open(path, 'wb').write(audio); json.dump(words, open(path + '.json', 'w', encoding='utf-8'), ensure_ascii=False); return words
        except Exception as e:
            err = e; await asyncio.sleep(3 + attempt * 2)
    print('FAIL', voice, text, err); return None

def cut_last(au, t_word, sr=16000):
    """slice the last word out of a carrier phrase: the engine's word offset is only approximate (mp3 latency),
    so the cut is placed at the quietest 10 ms frame within [t-0.2, t+0.15] s — the gap before the word"""
    import parselmouth
    snd = parselmouth.Sound(au, sampling_frequency=sr); inten = snd.to_intensity(minimum_pitch=70, time_step=0.005)
    ts = inten.xs(); vals = inten.values[0]
    win = [(v, t) for t, v in zip(ts, vals) if t_word - 0.2 <= t <= t_word + 0.15]
    t0 = min(win)[1] if win else t_word
    return au[int(t0 * sr):]

def shape(w):
    w = re.sub('[إأآٱ]', 'ا', w).replace('ة', '')
    return ''.join(ch for ch in nomark(w) if ch in 'اوي'), w.count('ّ')
def judge(text, heard):
    words = [w for w in re.split('[\\s.،؟!:]+', norm(heard)) if w]
    if not words: return 'nothing'
    hw = max(words, key=lambda w: difflib.SequenceMatcher(None, norm(text), w).ratio())
    if difflib.SequenceMatcher(None, nomark(text), nomark(hw)).ratio() < 0.75: return f'word→{hw}'
    tl, ts = shape(text); hl, hs = shape(hw)
    if tl and tl not in hl: return f'long→{hw}'
    if ts and re.search('[ً-ْ]', hw) and hs < ts: return f'shadda→{hw}'
    if text.endswith('ة') and not nomark(hw).endswith(('ة', 'ه', 'ا')): return f'ة→{hw}'
    return 'OK ' + hw

async def main():
    model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
    gap = np.zeros(int(16000 * 0.3), np.float32)
    def hear(au):
        x = np.concatenate([gap, au, gap, au, gap, au, gap])
        segs, _ = model.transcribe(x, language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt=PROMPT)
        return ''.join(s.text for s in segs).strip()
    res = []
    for v in a.voices.split(','):
        d = os.path.join(OUT, v); os.makedirs(d, exist_ok=True)
        for w in WORDS:
            variants = []
            for rate in ('-10%', '-25%', '-40%'):
                p = os.path.join(d, f'{w}_solo{rate}.mp3')
                if await gen(v, w, p, rate) is not None: variants.append((f'solo{rate}', load(p)))
            p = os.path.join(d, f'{w}_dot.mp3')
            if await gen(v, w + '.', p, '-10%') is not None: variants.append(('solo.', load(p)))
            for tag, carrier in (('cut:حرف', f'حَرْفُ {w}'), ('cut:نعم', f'نَعَم، {w}'), ('cut:هذا', f'هَذَا: {w}')):
                p = os.path.join(d, f'{w}_{tag.split(":")[1]}.mp3'); words = await gen(v, carrier, p, '-10%')
                if words and len(words) >= 2:
                    au = load(p); variants.append((tag, cut_last(au, words[-1][0])))
            line = [f'{v.split("-")[2].replace("Neural", ""):8s} {w:8s}']
            for tag, au in variants:
                hp = os.path.join(d, f'{w}_{tag.replace(":", "-")}.heard.txt')
                if os.path.exists(hp): h = open(hp, encoding='utf-8').read()
                else: h = hear(au); open(hp, 'w', encoding='utf-8').write(h)
                import parselmouth, tempfile  # voiced length via the vowel analyzer (expects a path)
                tp = os.path.join(d, '_tmp.wav'); parselmouth.Sound(au, sampling_frequency=16000).save(tp, 'WAV')
                vd = analyze(tp)['voiced']
                line.append(f'{tag}: {judge(w, h)} ({vd:.2f}s)')
            s = ' | '.join(line); res.append(s); print(s, flush=True)
    open(os.path.join(OUT, 'result.txt'), 'a', encoding='utf-8').write('\n'.join(res) + '\n')

asyncio.run(main())
