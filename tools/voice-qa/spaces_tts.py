"""Generate Arabic clips with open models that run ONLINE (Hugging Face Spaces, Gradio API): nothing heavy runs
on this PC, only the text goes out and the audio comes back.
python tools/voice-qa/spaces_tts.py --engines habibi,silma,chatterbox [--texts "جَ,جِ,..."] [--ids ...]
Engines (all voice-cloning: they imitate a reference clip; we hand them a verified Amal sentence with its
exact diacritized text so the voice stays the one the owner knows):
  habibi      SWivid Habibi-TTS, Specialized MSA model (Apache-2.0), F5-TTS family, Space chenxie95/Habibi-TTS
  habibi-u    the same Space, Unified model (CC-BY-NC-SA)
  silma       SILMA TTS v1 (Apache-2.0, 150M, F5 family, full tashkeel), Space silma-ai/silma-tts-v1-demo
  chatterbox  Resemble Chatterbox multilingual v3 (MIT), language 'ar', Space ResembleAI/Chatterbox-Multilingual-TTS
  f5ar        IbrahimSalah/Arabic-F5-TTS-v2 via the first community Space that answers (non-commercial licence)
Writes bench/spaces/<engine>/<id>.wav (+ <id>.txt with the text); resumable."""
import os, sys, re, json, time, argparse, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from judge import kind  # noqa

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'bench', 'spaces')
REF_WAV = os.path.join(HERE, 'cand', 'ar-QA-AmalNeural', 'haraka-howto.mp3')
REF_TXT = 'الفَتْحَةُ شَرْطَةٌ فَوْقَ الحَرْفِ، وَالكَسْرَةُ شَرْطَةٌ تَحْتَ الحَرْفِ، وَالضَّمَّةُ وَاوٌ صَغِيرَةٌ فَوْقَ الحَرْفْ'
PROBE = {  # the clips every Microsoft voice got wrong, plus a sentence and a lone name
    'ja': 'جَ', 'ji': 'جِ', 'ju': 'جُ', 'bi': 'بِ', 'ka': 'كَ', 'tha': 'ثَ', 'du': 'دُ',
    'dal': 'دَال', 'kaf': 'كَاف', 'dad': 'ضَاد', 'thaa': 'ثَاء', 'ranna': 'رَنَّة', 'jamal': 'جَمَل', 'alif': 'أَلِف',
    'intro-jim': 'هَيَّا نَجْمَعُ حَرْفَ جِيم', 'ayna': 'أَيْنَ', 'batta': 'بَطَّة',
    '_ref-a': 'بَا', '_ref-i': 'بِي', '_ref-u': 'بُو',   # formant references for bench_judge.py (same voice/engine)
}
F5AR_SPACES = ['IbrahimSalah/Arabic-F5-TTS', 'aymenb5/Arabic-F5-TTS', 'hddhdjdi/Arabic-F5-TTS', 'Onolnhuuuk/Arabic-F5-T']

def client(space):
    from gradio_client import Client
    for attempt in range(3):
        try: return Client(space, verbose=False)
        except Exception as e:
            err = e; time.sleep(5)
    raise err

def mk(engine):
    """returns say(text) -> path of a wav/mp3 produced by the Space"""
    from gradio_client import handle_file
    if engine in ('habibi', 'habibi-u'):
        c = client('chenxie95/Habibi-TTS'); model = 'Specialized' if engine == 'habibi' else 'Unified'
        def say(text):
            r = c.predict('MSA (Modern Standard Arabic)', model, handle_file(REF_WAV), REF_TXT, text, False, 0, api_name='/basic_tts')
            return r[0]
    elif engine == 'silma':
        c = client('silma-ai/silma-tts-v1-demo')
        def say(text): return c.predict(handle_file(REF_WAV), REF_TXT, text, api_name='/do_inference')
    elif engine == 'chatterbox':
        c = client('ResembleAI/Chatterbox-Multilingual-TTS')
        def say(text): return c.predict(text, 'ar', handle_file(REF_WAV), 0.3, 0.6, 0, 0.5, api_name='/generate_tts_audio')
    elif engine == 'f5ar':
        c = None; api = None
        for s in F5AR_SPACES:
            try:
                c = client(s); info = c.view_api(return_format='dict', print_info=False)
                names = list(info.get('named_endpoints', {}))
                api = next((n for n in names if 'infer' in n or 'tts' in n or 'generate' in n), names[0] if names else None)
                print('f5ar: using', s, api, flush=True); break
            except Exception as e:
                print('f5ar: skip', s, str(e)[:80], flush=True); c = None
        if c is None: raise RuntimeError('no working Arabic-F5-TTS Space')
        params = [p for p in info['named_endpoints'][api]['parameters']]
        print('f5ar params:', [(p['label'], p.get('python_type', {}).get('type')) for p in params], flush=True)
        def say(text):
            args = []
            for p in params:
                lab = (p['label'] or '').lower(); typ = p.get('python_type', {}).get('type', '')
                if 'filepath' in typ: args.append(handle_file(REF_WAV))
                elif 'ref' in lab and 'text' in lab: args.append(REF_TXT)
                elif 'text' in lab: args.append(text)
                else: args.append(p.get('parameter_default'))
            r = c.predict(*args, api_name=api)
            return r[0] if isinstance(r, (list, tuple)) else r
    else: raise SystemExit('unknown engine ' + engine)
    return say

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--engines', default='habibi,silma,chatterbox')
    ap.add_argument('--texts', default=''); ap.add_argument('--ids', default='')
    a = ap.parse_args()
    items = dict(PROBE)
    if a.texts: items = {f't{i}': t for i, t in enumerate(a.texts.split(','))}
    if a.ids:   # ids from assets/voice/lines.json
        lines = {l['id']: l['text'] for l in json.load(open(os.path.join(HERE, '..', '..', 'assets', 'voice', 'lines.json'), encoding='utf-8'))}
        items = {i: lines[i] for i in a.ids.split(',')}
    for eng in a.engines.split(','):
        d = os.path.join(OUT, eng); os.makedirs(d, exist_ok=True)
        try: say = mk(eng)
        except Exception as e: print(eng, 'UNAVAILABLE', str(e)[:200], flush=True); continue
        for i, text in items.items():
            dst = os.path.join(d, i + '.wav')
            if os.path.exists(dst): continue
            # cloning models size the output by text length: a lone syllable or a 4-letter word comes out as a
            # 0.3 s burst. Short texts therefore ride in a carrier and bench_judge.py cuts them out at the gap.
            k = kind(text) if not i.startswith('_ref') else 'ref'
            gen = f'نَعَم، {text}' if k == 'syl' else f'هَذَا: {text}' if k == 'one' else text
            t0 = time.time(); err = None
            for attempt in range(4):
                try:
                    p = say(gen); break
                except Exception as e:
                    err = e; msg = str(e)
                    wait = 65 if 'quota' in msg.lower() or 'GPU' in msg else 8 + attempt * 5
                    print(f'{eng} {i} retry {attempt+1}: {msg[:120]} (wait {wait}s)', flush=True); time.sleep(wait)
            else:
                print(f'{eng} {i} FAILED {str(err)[:150]}', flush=True); continue
            if not p.lower().endswith('.wav'):  # mp3/flac -> wav via ffmpeg
                import subprocess; subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', p, dst], check=True)
            else: shutil.copyfile(p, dst)
            open(os.path.join(d, i + '.txt'), 'w', encoding='utf-8').write(text)
            if gen != text: open(os.path.join(d, i + '.gen.txt'), 'w', encoding='utf-8').write(gen)
            print(f'{eng} {i} {text} ok {time.time()-t0:.0f}s', flush=True)

if __name__ == '__main__': main()
