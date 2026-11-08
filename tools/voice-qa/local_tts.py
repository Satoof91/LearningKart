"""Generate Arabic clips with open voice-cloning models running LOCALLY on CPU (no Space, no quota): the same
probe set, carrier rule and file layout bench_judge.py expects (<id>.wav + <id>.txt [+ <id>.gen.txt]).
  python tools/voice-qa/local_tts.py --engine habibi|silma|chatterbox [--out bench/cloud/<engine>] [--ids all|id1,id2] [--texts ...]
Each engine pins its own torch, so run it with that engine's venv python (see bench/cloud/REPORT.md for the recipe):
  habibi      SWivid Habibi-TTS, Specialized/MSA checkpoint (Apache-2.0; the Unified/SAU/UAE ones are CC-BY-NC-SA), F5-TTS v1 base
  silma       SILMA TTS v1 (Apache-2.0, 150M, F5 family); tashkeel in the text is kept, the normaliser/CATT are switched off
  chatterbox  Resemble Chatterbox Multilingual (MIT), language_id 'ar'
Every engine clones the owner's Amal voice from ref/amal-haraka-howto.mp3 + its exact text (ref/amal-haraka-howto.txt).
Writes <out>/<id>.wav (+ <id>.txt with the text, <id>.gen.txt with the carrier text when one was used) and times.json
(seconds per clip, for the report); resumable.  `--ids all` = every Arabic line of assets/voice/lines.json + the three
long-vowel references the formant check needs."""
import os, sys, json, time, argparse, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
REF_WAV = os.path.join(HERE, 'ref', 'amal-haraka-howto.mp3')   # verified Amal sentence (8.35 s): the voice every engine clones
REF_TXT = open(os.path.join(HERE, 'ref', 'amal-haraka-howto.txt'), encoding='utf-8').read().strip()
PROBE = {  # the clips every Microsoft voice got wrong, plus a sentence and a lone name
    'ja': 'جَ', 'ji': 'جِ', 'ju': 'جُ', 'bi': 'بِ', 'ka': 'كَ', 'tha': 'ثَ', 'du': 'دُ',
    'dal': 'دَال', 'kaf': 'كَاف', 'dad': 'ضَاد', 'thaa': 'ثَاء', 'ranna': 'رَنَّة', 'jamal': 'جَمَل', 'alif': 'أَلِف',
    'intro-jim': 'هَيَّا نَجْمَعُ حَرْفَ جِيم', 'ayna': 'أَيْنَ', 'batta': 'بَطَّة',
    '_ref-a': 'بَا', '_ref-i': 'بِي', '_ref-u': 'بُو',   # formant references for bench_judge.py (same voice/engine)
}
from judge import kind  # noqa

SEED = 0
SPEED = float(os.environ.get('TTS_SPEED', '1.0'))   # F5 engines: duration scale (<1 = slower, longer clip)

def habibi_text(t):
    """Habibi's MSA vocab knows fatha/damma/kasra/sukun but no shadda, tanween or Arabic comma (unknown chars become
    blanks), so: shadda -> the consonant twice (first with sukun), tanween dropped, Arabic punctuation -> ASCII"""
    import re
    t = re.sub('([ء-ي])([َُِ]?)ّ([َُِ]?)', lambda m: m[1] + 'ْ' + m[1] + (m[2] or m[3]), t)
    t = re.sub('[ًٌٍ]', '', t)
    return t.replace('،', ',').replace('؟', '?').replace('؛', ';')

def ref_wav(out):
    """the reference as a 24 kHz mono wav next to the output folders (torchaudio/librosa mp3 decoding differs per venv)"""
    p = os.path.join(os.path.dirname(out.rstrip('/')), '_ref-amal.wav')
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', REF_WAV, '-ac', '1', '-ar', '24000', p], check=True)
    return p

def mk(engine, ref):
    """returns say(text, dst_wav)"""
    import torch
    torch.set_num_threads(os.cpu_count() or 4)
    if engine == 'habibi':
        from importlib.resources import files
        from cached_path import cached_path
        from omegaconf import OmegaConf
        from hydra.utils import get_class
        import soundfile as sf
        from f5_tts.infer.utils_infer import load_model, load_vocoder, preprocess_ref_audio_text
        from habibi_tts.infer.utils_infer import infer_process
        cfg = OmegaConf.load(str(files('f5_tts').joinpath('configs/F5TTS_v1_Base.yaml')))
        ckpt = str(cached_path('hf://SWivid/Habibi-TTS/Specialized/MSA/model_200000.safetensors'))
        vocab = str(cached_path('hf://SWivid/Habibi-TTS/Specialized/MSA/vocab.txt'))
        model = load_model(get_class(f'f5_tts.model.{cfg.model.backbone}'), cfg.model.arch, ckpt, mel_spec_type='vocos', vocab_file=vocab, device='cpu')
        vocoder = load_vocoder(vocoder_name='vocos', is_local=False, device='cpu')
        rt = habibi_text(REF_TXT)
        if os.environ.get('HABIBI_BARE_REF'): import re; rt = re.sub('[ً-ْ]', '', rt)   # experiment: reference text without harakat
        ref_audio, ref_text = preprocess_ref_audio_text(ref, rt, show_info=lambda *a: None)
        def say(text, dst):
            torch.manual_seed(SEED)
            wav, sr, _ = infer_process(ref_audio, ref_text, habibi_text(text), model, vocoder, mel_spec_type='vocos', show_info=lambda *a: None,
                                       progress=None, device='cpu', dialect_id=None, speed=SPEED)   # Specialized model: no dialect tag
            sf.write(dst, wav, sr)
    elif engine == 'silma':
        from silma_tts.api import SilmaTTS
        tts = SilmaTTS(device='cpu', enable_normalizer=False, force_tashkeel=False)   # our texts carry full tashkeel already
        def say(text, dst):
            tts.infer(ref, REF_TXT, text, show_info=lambda *a: None, seed=SEED, speed=SPEED, normalize_numbers=False, force_tashkeel=False, file_wave=dst)
    elif engine == 'chatterbox':
        import torchaudio
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        m = ChatterboxMultilingualTTS.from_pretrained('cpu')
        def say(text, dst):
            torch.manual_seed(SEED)
            wav = m.generate(text, language_id='ar', audio_prompt_path=ref, exaggeration=0.3, cfg_weight=0.5, temperature=0.6)
            torchaudio.save(dst, wav.cpu(), m.sr)
    else: raise SystemExit('unknown engine ' + engine)
    return say

def all_lines():
    lines = json.load(open(os.path.join(HERE, '..', '..', 'assets', 'voice', 'lines.json'), encoding='utf-8'))
    lines = lines['lines'] if isinstance(lines, dict) else lines
    return {l['id']: l['text'] for l in lines if l.get('lang') != 'en'}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--engine', required=True); ap.add_argument('--out', default='')
    ap.add_argument('--texts', default=''); ap.add_argument('--ids', default='')
    a = ap.parse_args()
    out = a.out or os.path.join(HERE, 'bench', 'cloud', a.engine)
    out = out if os.path.isabs(out) else os.path.join(HERE, out)
    refs = {k: v for k, v in PROBE.items() if k.startswith('_ref')}
    items = dict(PROBE)
    if a.texts: items = {f't{i}': t for i, t in enumerate(a.texts.split(','))}
    if a.ids == 'all': items = {**all_lines(), **refs}
    elif a.ids:
        lines = all_lines(); items = {**{i: lines[i] for i in a.ids.split(',')}, **refs}
    os.makedirs(out, exist_ok=True)
    tp = os.path.join(out, 'times.json'); times = json.load(open(tp)) if os.path.exists(tp) else {}
    say = mk(a.engine, ref_wav(out))
    todo = [i for i in items if not os.path.exists(os.path.join(out, i + '.wav'))]
    print(f'{a.engine}: {len(todo)} of {len(items)} clips to make -> {out}', flush=True)
    for n, i in enumerate(todo):
        text = items[i]; dst = os.path.join(out, i + '.wav')
        # cloning models size the output by text length: a lone syllable or a 4-letter word comes out as a 0.3 s burst.
        # Short texts therefore ride in a carrier and bench_judge.py cuts them out at the gap.
        k = kind(text) if not i.startswith('_ref') else 'ref'
        gen = f'نَعَم، {text}' if k == 'syl' else f'هَذَا: {text}' if k == 'one' else text
        t0 = time.time()
        try: say(gen, dst + '.part.wav')
        except Exception as e:
            print(f'{a.engine} {i} FAILED {str(e)[:200]}', flush=True)
            if os.path.exists(dst + '.part.wav'): os.remove(dst + '.part.wav')
            continue
        os.replace(dst + '.part.wav', dst)
        open(os.path.join(out, i + '.txt'), 'w', encoding='utf-8').write(text)
        if gen != text: open(os.path.join(out, i + '.gen.txt'), 'w', encoding='utf-8').write(gen)
        times[i] = round(time.time() - t0, 1); json.dump(times, open(tp, 'w'), indent=0)
        print(f'{a.engine} {n+1}/{len(todo)} {i} {text} ok {times[i]}s', flush=True)

if __name__ == '__main__': main()
