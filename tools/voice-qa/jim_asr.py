"""Second ج test: what does Whisper hear when a voice says «جَ» three times, «جِيم», «جَمَل» and «نَجْمَعُ»?
A voice whose ج is /ʒ/ or /g/ is heard as غ / ق / ك / ش or similar; a clean /dʒ/ is heard as ج.
python tools/voice-qa/jim_asr.py --voices ar-IQ-BasselNeural,ar-QA-MoazNeural [--rate=-10%]
Writes bench/jim/<voice>/*.mp3 (+ .heard.txt) and bench/jim/asr.txt"""
import os, sys, re, json, asyncio, argparse
import numpy as np, edge_tts
from faster_whisper import WhisperModel
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evalset_common import load  # noqa

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('--voices', required=True); ap.add_argument('--rate', default='-10%'); ap.add_argument('--pitch', default='+5Hz')
a = ap.parse_args(); OUT = os.path.join(HERE, 'bench', 'jim')
PROBES = [('ja', 'جَ', 3), ('jim', 'جِيم', 3), ('jamal', 'جَمَل', 3), ('najma', 'هَيَّا نَجْمَعُ حَرْفَ بَاء', 1), ('ji', 'جِ', 3), ('ju', 'جُ', 3)]
PROMPT = 'جَ جَ جَ. غَ غَ غَ. قَ قَ قَ. شَ شَ شَ. جِيم. غَيْن. جَمَل. غَزَال. هَيَّا نَجْمَعُ حَرْفَ بَاء.'

async def gen(voice, text, path):
    if os.path.exists(path): return True
    for attempt in range(6):
        try:
            c = edge_tts.Communicate(text, voice, rate=a.rate, pitch=a.pitch); audio = b''
            async for ch in c.stream():
                if ch['type'] == 'audio': audio += ch['data']
            open(path, 'wb').write(audio); return True
        except Exception as e:
            err = e; await asyncio.sleep(3 + attempt * 2)
    print('FAIL', voice, text, err); return False

async def main():
    model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
    gap = np.zeros(int(16000 * 0.3), np.float32)
    lines = []
    for v in a.voices.split(','):
        d = os.path.join(OUT, v); os.makedirs(d, exist_ok=True); out = [v]
        for pid, text, n in PROBES:
            p = os.path.join(d, pid + '.mp3')
            if not await gen(v, text, p): out.append(f'{pid}: FAIL'); continue
            hp = p + '.heard.txt'
            if os.path.exists(hp): heard = open(hp, encoding='utf-8').read()
            else:
                au = load(p); x = np.concatenate([gap] + sum([[au, gap] for _ in range(n)], []))
                segs, _ = model.transcribe(x, language='ar', beam_size=5, condition_on_previous_text=False, initial_prompt=PROMPT)
                heard = ''.join(s.text for s in segs).strip(); open(hp, 'w', encoding='utf-8').write(heard)
            out.append(f'{text}→{heard}')
        line = ' | '.join(out); lines.append(line); print(line, flush=True)
    with open(os.path.join(OUT, 'asr.txt'), 'a', encoding='utf-8') as fh: fh.write('\n'.join(lines) + '\n')

asyncio.run(main())
