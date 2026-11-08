"""Summarise judged local-engine probe folders into bench/cloud/REPORT.md: pass counts per kind, every clip's heard
text, generation time per clip, licence.   python tools/voice-qa/bench_report.py habibi silma chatterbox"""
import os, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__)); CLOUD = os.path.join(HERE, 'bench', 'cloud')
INFO = {
    'habibi': ('SWivid/Habibi-TTS · Specialized/MSA model_200000 (F5-TTS v1 base, 32 NFE)', 'Apache-2.0 (this checkpoint; Unified/SAU/UAE are CC-BY-NC-SA-4.0)', 'pip habibi-tts 0.1.1 + torch 2.8 cpu, torchaudio 2.8'),
    'silma': ('silma-ai/silma-tts · SILMA TTS v1 150M (F5 family, 16 NFE), normaliser/CATT off', 'Apache-2.0', 'pip silma-tts 1.0.5 + torch 2.15 cpu'),
    'silma-s08': ('same SILMA TTS v1, F5 speed 0.8 (TTS_SPEED=0.8: 25% more duration for the squeezed carrier clips)', 'Apache-2.0', 'as silma'),
    'chatterbox': ('ResembleAI/chatterbox · Chatterbox Multilingual (t3_mtl23ls_v2), language_id ar, exaggeration 0.3, cfg 0.5, temp 0.6', 'MIT', 'pip chatterbox-tts 0.1.7 + torch 2.6 cpu'),
}

NOTES = """## Findings

- **chatterbox is the only engine that says a lone short syllable**: 5/7 syllables pass (جَ جِ جُ بِ دُ), the sentence
  passes, 3/9 single words pass. Misses: ث comes out as س/ست (ثَ, ثَاء), كَ as ق, كَاف/رَنَّة/جَمَل/ضَاد/أَيْنَ not
  recognised in the carrier cut (short bursts, Whisper hallucinates «اشتركوا في القناة» on them). ~10 s per clip on CPU.
- **silma** reads whole words and the sentence well (6/9 words + sentence at speed 1.0; بَطَّة رَنَّة دَال جَمَل أَلِف أَيْنَ with
  harakat intact) but **no lone syllable passes**: the F5 duration formula sizes «نَعَم، X» to ~0.9 s, «نَعَم» takes 0.45 s
  and the target syllable is a 0.12–0.15 s burst after the gap. Speed 0.8 (silma-s08) stretches the clips but the vowel
  comes out wrong (جِ/جُ heard «جَاك», formants a). ث is wrong here too (زُب/زون/سَاء), ضَاد loses its long vowel. ~15 s/clip.
- **habibi (Specialized/MSA) cannot read fully vocalised text**: its vocab has َ ُ ِ ْ but no shadda, tanween or «،»
  (expanded by `habibi_text()`), and the model was trained on bare text: with harakat every clip is a ~0.5 s garble
  («حَغَيْفٌ جَغَيْم» for هَيَّا نَجْمَعُ حَرْفَ جِيم). Side experiments (not in the table): speed 0.7 still garbled; bare reference
  text + bare target («هيا نجمع حرف جيم») is intelligible but rushed; bare reference + vocalised target garbled. Since
  the game's atoms are single vocalised syllables, habibi is out. ~65 s/clip on CPU (32 NFE over ref + text).
- The judge's Whisper ×3 reading hallucinates a fixed phrase («اشتركوا في القناة», «ترجمة نانسي قنقر») on very short or
  non-speech cuts: read those rows as "nothing usable was heard", not as the engine saying that.
- Formant references (_ref-a/i/u) come from the same engine folder, so the syllable vowel class is per engine.
- Timings: silma-s08 (and habibi's 241 s outlier) ran while another engine was generating on the same 4 cores;
  alone, silma takes ~15 s and habibi ~65 s per clip.

## Decision

Step B (all 344 Arabic lines) runs with **chatterbox**: `local_tts.py --engine chatterbox --ids all --out bench/cloud/chatterbox-all`,
then `bench_judge.py bench/cloud/chatterbox-all` and `cloud_cand.py chatterbox` -> `cand/chatterbox/<id>.mp3` + `report.json`.

## Step B result (chatterbox, all 344 Arabic lines)

`cand/chatterbox/<id>.mp3` + `cand/chatterbox/report.json` (rows id,text,heard,score,bare,vow,verdict,why,kind + dur,voiced,secs),
judged by `bench_judge.py` on `bench/cloud/chatterbox-all`: **189/344 pass** = syllables 39/84, single words 26/101,
sentences 124/159. Generation 5307 s for 344 clips (median 11.2 s, max 281 s while silma-s08 shared the CPU).

- syllables (45 to check): 32 «consonant heard as X» (ث→س, خ→ه, ذ→د, ظ→ض, غ→ح, emphatics ض/ط/ع and ر heard as
  ا/ب), 5 read the letter name instead of the syllable (قِ …), the rest vowel/length slips.
- single words (75 to check): 72 «word not recognised» in the carrier cut, mostly 2–3 letter words that Whisper does not
  recognise as bare words; listen before rejecting.
- sentences (35 to check): 16 a dropped word, 9 a shortened long vowel, 10 not recognised; chatterbox does not read every
  haraka (it ignores shadda often), and the Whisper judge is harsh on vocalised text it does not expect.

The judge rows with «check» are the owner's listening list; `choose.py` installs the clips picked from `cand/chatterbox`.

## Recipe (one venv per engine; CPU torch from download.pytorch.org/whl/cpu)

    uv venv -p 3.11 venvs/habibi     && uv pip install --python venvs/habibi/bin/python     --extra-index-url https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match habibi-tts "torchaudio==2.8.0"
    uv venv -p 3.11 venvs/silma      && uv pip install --python venvs/silma/bin/python      --extra-index-url https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match silma-tts
    uv venv -p 3.11 venvs/chatterbox && uv pip install --python venvs/chatterbox/bin/python --extra-index-url https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match chatterbox-tts "setuptools<80"
    uv venv -p 3.12 venvs/judge      && uv pip install --python venvs/judge/bin/python faster-whisper praat-parselmouth av numpy
    venvs/<engine>/bin/python tools/voice-qa/local_tts.py --engine <engine>      # probe set -> bench/cloud/<engine>
    venvs/judge/bin/python tools/voice-qa/bench_judge.py bench/cloud/<engine>    # -> judge.json
    venvs/judge/bin/python tools/voice-qa/bench_report.py habibi silma silma-s08 chatterbox

habibi needs torchaudio pinned to its torch (uv picks 2.11 otherwise: `undefined symbol: torch_library_impl`);
chatterbox's resemble-perth imports pkg_resources, gone from setuptools >= 80. Weights: SWivid/Habibi-TTS Specialized/MSA
(1.35 GB), silma-ai/silma-tts (2.6 GB), ResembleAI/chatterbox t3_mtl23ls_v2 + s3gen (3.2 GB), charactr/vocos-mel-24khz,
mobiuslabsgmbh/faster-whisper-large-v3-turbo (1.6 GB).
"""

def main(engines):
    out = ['# Open TTS engines on CPU: probe benchmark', '',
           'Voice cloned from `ref/amal-haraka-howto.mp3` (Amal, verified text in `ref/amal-haraka-howto.txt`). The 20 probe texts of',
           '`local_tts.py` (17 clips the Microsoft voices got wrong + 3 long-vowel references), generated by the same script',
           'and judged by `bench_judge.py` with the game\'s own rules (lone syllable: Whisper ×3 + formants against the same',
           'engine\'s بَا/بِي/بُو; one word: Whisper ×3 word-by-word; sentence: Whisper ×1). Short texts ride in a carrier',
           '(«نَعَم، X» / «هَذَا: X») and are cut out after the gap. Runtime = wall seconds per clip on this 4-vCPU box, no GPU.', '']
    summary = []
    for e in engines:
        d = os.path.join(CLOUD, e); jp = os.path.join(d, 'judge.json')
        if not os.path.exists(jp): summary.append((e, None)); continue
        rows = json.load(open(jp, encoding='utf-8')); tp = os.path.join(d, 'times.json')
        times = json.load(open(tp)) if os.path.exists(tp) else {}
        c = collections.Counter((r['kind'], r['verdict']) for r in rows)
        secs = [times[r['id']] for r in rows if r['id'] in times]
        summary.append((e, rows, c, secs, times))
    out += ['## Summary', '', '| engine | licence | pass | syl | one | multi | s/clip (median) | s/clip (max) |', '|---|---|---|---|---|---|---|---|']
    for s in summary:
        e = s[0]
        if s[1] is None: out.append(f'| {e} | {INFO[e][1]} | not judged | | | | | |'); continue
        _, rows, c, secs, _ = s
        tot = len(rows); ok = sum(1 for r in rows if r['verdict'] == 'pass')
        cell = lambda k: f'{c[(k, "pass")]}/{c[(k, "pass")] + c[(k, "check")]}'
        med = sorted(secs)[len(secs) // 2] if secs else '-'; mx = max(secs) if secs else '-'
        out.append(f'| {e} | {INFO[e][1]} | **{ok}/{tot}** | {cell("syl")} | {cell("one")} | {cell("multi")} | {med} | {mx} |')
    out.append('')
    for s in summary:
        e = s[0]; out += [f'## {e}', '', f'- model: {INFO[e][0]}', f'- licence: {INFO[e][1]}', f'- install: {INFO[e][2]}']
        if s[1] is None: out += ['- **not judged** (engine failed, see session notes)', '']; continue
        _, rows, c, secs, times = s
        out += [f'- total generation time for the {len(secs)} clips: {sum(secs):.0f} s', '',
                '| id | kind | text | verdict | why | heard | dur s | gen s |', '|---|---|---|---|---|---|---|---|']
        for r in rows:
            out.append(f"| {r['id']} | {r['kind']} | {r['text']} | {'PASS' if r['verdict'] == 'pass' else 'check'} | {r['why']} | {r['heard'].replace('|', '/')} | {r['dur']} | {times.get(r['id'], '')} |")
        out.append('')
    open(os.path.join(CLOUD, 'REPORT.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n' + NOTES)
    print('\n'.join(out[:len(engines) + 12]))

if __name__ == '__main__': main(sys.argv[1:] or ['habibi', 'silma', 'chatterbox'])
