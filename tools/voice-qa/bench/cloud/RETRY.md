# Chatterbox retry of the weak Arabic clips (branch `voice/chatterbox-retry`)

Candidates: `tools/voice-qa/cand/chatterbox-retry/<id>.mp3` + `report.json` (same shape as `cand/chatterbox/report.json`),
172 ids, **97 pass / 75 check**. Nothing under `assets/voice/`, `src/` or `HARAKA_ENABLED` was touched: the owner listens first,
then installs locally with `choose.py` (commands at the end). Generated in the cloud on 2026-11-09 (4 vCPU, no GPU).

## Which ids (read from the repo, not retyped)

| source | ids |
|---|---|
| `assets/voice/VOICE.json` → `stopgap.truncated` + `stopgap.wrong` (the file has no `stopgap.word` key, so 54 ids, not 81) | 54 |
| every word clip `letter-NN-word`, `word-NN-say`, `word-NN-onset` in `lines.json` (also the ones that passed before: the owner hears them as too fast) | 63 |
| every `verdict: check` in `cand/chatterbox/report.json` | 155 |
| **union** | **172** = 47 syllables, 89 single words, 36 sentences |

## Engine and takes

Same engine and voice as `local_tts.py` (Chatterbox Multilingual t3_mtl23ls_v2, MIT; `language_id ar`, exaggeration 0.3,
temperature 0.6, voice cloned from `ref/amal-haraka-howto.mp3` + `.txt`), venvs as in `REPORT.md` (chatterbox-tts 0.1.7 + CPU
torch; faster-whisper large-v3-turbo for the judge). One extra: the tokenizer's Chinese segmenter (pkuseg) downloads a model
from github.com at load time, which the cloud network blocks; `retry_tts.py` sets `sys.modules['spacy_pkuseg'] = None` so the
tokenizer skips it (Arabic never uses it).

Several takes per id, seed = 1000 + take number, up to 6 rounds (4 for sentences, 12 for بُ); an id stops getting new takes
once it has a pass and 3 takes (2 for sentences), so a word with a pass has at least 3 takes to pick the slowest from.

| kind | round 0 | 1 | 2 | 3 | 4 | 5 | 6-11 (بُ only) |
|---|---|---|---|---|---|---|---|
| syllable | نَعَم، X · cfg 0.5 | نَعَم · 0.3 | هَذَا: X · 0.5 | هَذَا · 0.3 | نَعَم · 0.3 | نَعَم · 0.5 | X. X. 0.5/0.3, then the same again |
| word | هَذَا: X · 0.3 | هَذَا · 0.5 | هَذِهِ الكَلِمَة: X. · 0.3 | X. X. · 0.3 | الكَلِمَة · 0.5 | X. X. · 0.5 | |
| sentence | bare · 0.5 | bare · 0.3 | bare · 0.5 | bare · 0.3 | | | |

846 judged cuts (a «X. X.» take yields two) over 172 ids, 19117 s of generation (23 s per take with the
judge sharing the 4 cores; 11 s alone). The generator and the judge each had to be resumed twice (2 h background limit);
both are resumable and no take was lost.

## Cut and cleanliness (the "background voice")

The owner reported a background voice in the recordings. Two sources were found and removed in every retry clip:

- **Stray babble after the target.** Chatterbox often keeps talking after a short carrier target (up to 2 s of murmur or a
  second word). The cutter stops the clip at the first real pause inside the target (0.10 s syllable / 0.15 s word / 0.5 s
  sentence); 52 of the 172 chosen clips had such babble cut off (`stray` seconds in `takes.json`).
- **Murmur in the padding.** The clip is the target's sound (first to last 10 ms frame above −36 dB of its peak) between
  **0.15 s of digital silence before and 0.2 s after**, 5 ms fades; nothing of the carrier or the model's room tone rides
  along. The level of what the 0.2 s after the target held before it was silenced is kept as `tail_db` (median −43 dB over the
  chosen clips) and used as a tiebreaker.

Carrier cut: the carrier ends at the first pause ≥ 80 ms (under −28 dB of the peak) after 0.33 s of carrier (0.7 s for
هَذِهِ الكَلِمَة) that still has sound after it; without one, the quietest frame of the middle part. The 0.25 s used at first
split inside «هَذَا» (heard «ذا عين», «زَا يَمَاما»), hence 0.33 s. For «X. X.» the longest pause in the middle half
separates the two repetitions and both are judged; a «X. X.» said without a pause is a double and is demoted for syllables.

Length floor on top of the judge: syllable ≥ 0.3 s, word ≥ 0.15 s per letter (`dur` as the judge measures it, silence-trimmed);
a word whose ×3 reading holds more than 4 words is «extra sound heard». 3 chosen clips (letter-07-name, letter-16-snd,
word-17-say, all check) peak at 0 dBFS, i.e. the model clipped them; listen before using.

## Result

| group | pass | of | before (cand/chatterbox, same ids) |
|---|---|---|---|
| syllables | 27 | 47 | 2 |
| words | 43 | 89 | 14 |
| sentences | 27 | 36 | 0 |
| **all** | **97** | **172** | 17 |

- Stopgap ids (the 54 playing the old Microsoft clip): **33/54** pass now.
- **بُ (`haraka-02-da`)**: 13 cuts, 11 pass; chosen take 9 (نَعَم، بُ · cfg 0.3), heard «بُ. بُ. بُ. بُ.», formants u, 0.45 s.
  The old clip was a 0.19 s burst heard as nothing.
- Words: mean `dur` 0.56 s before → 0.59 s now (the slowest passing take is chosen); 11 words below are read correctly by
  Whisper but fall under the 0.15 s/letter floor and are marked check «too short»: letter-04-word, letter-07-word, letter-11-word, letter-12-word, letter-21-name, letter-26-name, letter-28-name, letter-28-word, number-08, word-24-say, haraka-name-fa.
- Whisper's fixed hallucination («اشتركوا في القناة» / «ترجمة نانسي قنقر») appears in 0 chosen clip(s): every id now has a cut that
  Whisper hears as speech.
- The failures left are the engine's Arabic weaknesses, not the cut: ث→ت/س, خ→ه/ح, ط→ت/ب, ظ→ض/ذ/ب, ض→د/ب, ع→ا, غ→ح/ر,
  ق→ك/ب (see the table below), plus a few long vowels/shadda the model drops (ضَاد→ضَد, كُوب→كُب, زَاي→زي, دُبّ→دُب).

### Settings of the chosen passing takes

| group | carrier | cfg | passes chosen |
|---|---|---|---|
| sentences | bare | 0.3 | 15 |
| sentences | bare | 0.5 | 12 |
| syllables | naam | 0.5 | 12 |
| syllables | naam | 0.3 | 7 |
| syllables | hatha | 0.5 | 6 |
| syllables | hatha | 0.3 | 2 |
| words | hatha | 0.5 | 14 |
| words | kalima | 0.3 | 9 |
| words | hatha | 0.3 | 8 |
| words | twice | 0.3 | 8 |
| words | twice | 0.5 | 2 |
| words | kalima | 0.5 | 2 |

### Pass rate per setting over every judged cut

| group | carrier | cfg | pass | cuts |
|---|---|---|---|---|
| sentences | bare | 0.3 | 18 | 48 |
| sentences | bare | 0.5 | 17 | 50 |
| syllables | hatha | 0.3 | 4 | 28 |
| syllables | hatha | 0.5 | 14 | 48 |
| syllables | naam | 0.3 | 14 | 73 |
| syllables | naam | 0.5 | 17 | 71 |
| syllables | twice | 0.3 | 2 | 2 |
| syllables | twice | 0.5 | 0 | 1 |
| words | hatha | 0.3 | 13 | 89 |
| words | hatha | 0.5 | 17 | 89 |
| words | kalima | 0.3 | 16 | 89 |
| words | kalima | 0.5 | 2 | 50 |
| words | twice | 0.3 | 11 | 113 |
| words | twice | 0.5 | 2 | 95 |

Reading: `هَذَا: X` at cfg 0.5 and `هَذِهِ الكَلِمَة: X.` at cfg 0.3 are the best word carriers; `X. X.` at cfg 0.3 rescues
words the others miss (بَاء, تِمْسَاح …) but at cfg 0.5 it is mostly read as one run; for syllables `نَعَم، X` at cfg 0.5 is best
and `هَذَا: X` at cfg 0.3 nearly never works. cfg 0.3 does slow the words down a little (it is the chosen setting for 25 of the 43
passing words) but costs recognition on syllables.

### Still failing (75): what the judge heard in the best attempt

| id | text | kind | why | heard | dur s | takes |
|---|---|---|---|---|---|---|
| letter-03-intro | هَيَّا نَجْمَعُ حَرْفَ تَاء | multi | swallowed: تَاء→حرفتا (word) | هيا نجمع حرفتا. | 1.45 | 4 |
| letter-04-name | ثَاء | one | word not recognised | تَاء. تَاء. تَاء. | 0.54 | 8 |
| letter-04-word | ثَعْلَب | one | too short (0.51 s < 0.60) | تَعْلَب. تَعْلَب. تَعْلَب. | 0.51 | 8 |
| letter-04-snd | ثَ | syl | reads the letter name | تَاء. تَاء. تَاء. | 0.36 | 6 |
| letter-06-name | حَاء | one | word not recognised | بَاء. بَاء. بَاء. | 0.55 | 8 |
| letter-06-snd | حِ | syl | formants say a | حَي. حَي. حَي. | 0.46 | 6 |
| letter-07-name | خَاء | one | word not recognised | هَا. هَا. هَا. | 0.58 | 8 |
| letter-07-word | خَرُوف | one | too short (0.57 s < 0.60) | خروف. خروف. خروف. | 0.57 | 8 |
| letter-07-snd | خَ | syl | consonant heard as ه | هَا. هَا. هَا. | 0.46 | 6 |
| letter-08-word | دُبّ | one | swallowed: دُبّ→دُب (shadda) | دُب. دُب. دُب. | 0.56 | 7 |
| letter-09-snd | ذِ | syl | formants say a | زِسَى. زِسَى. زِسَى. | 0.72 | 6 |
| letter-10-name | رَاء | one | word not recognised | رَأَ. رَأَ. رَأَ. | 0.61 | 8 |
| letter-11-word | زَرَافَة | one | too short (0.72 s < 0.75) | زَرَافَة. زَرَافَ. زَرَافَة. | 0.72 | 8 |
| letter-11-wrong | هَذَا حَرْفُ زَاي | multi | swallowed: زَاي→زي (long vowel) | هذا حرف زي. | 2.68 | 4 |
| letter-12-word | سُلَحْفَاة | one | too short (0.77 s < 0.90) | سُلَحْفَاة. سُلَحْفَاة. سُلَحْفَاة. | 0.77 | 8 |
| letter-13-word | شِمْبَانْزِي | one | swallowed: شِمْبَانْزِي→شِمْبَنزي (long vowel) | شِمْبَنزي. شِمْبَنزي. شِمْبَنزي. | 0.96 | 8 |
| letter-14-name | صَاد | one | word not recognised | تَاد. تَاد. تَاد. | 0.59 | 8 |
| letter-14-word | صَقْر | one | word not recognised | سَقر. سَقر. سَقر. | 0.63 | 8 |
| letter-15-name | ضَاد | one | swallowed: ضَاد→ضَد (long vowel) | ضَد. ضَد. ضَد. | 0.46 | 8 |
| letter-15-snd | ضِ | syl | consonant heard as ب | بِ. بِ. بِ. بِ. | 0.47 | 6 |
| letter-15-find | أَيْنَ حَرْفُ ضَاد؟ | multi | swallowed: ضَاد→ضد (long vowel) | أين حرف ضد؟ | 1.19 | 4 |
| letter-16-name | طَاء | one | word not recognised | تَاء. تَاء. تَاء. | 0.44 | 8 |
| letter-16-word | طَاوُوس | one | word not recognised | بَوُوس. بَوُوس. بَوُوس. | 0.86 | 8 |
| letter-16-snd | طَ | syl | reads the letter name | تَاء. تَاء. تَاء. | 0.37 | 6 |
| letter-17-name | ظَاء | one | word not recognised | بَاء. بَاء. بَاء. | 0.7 | 8 |
| letter-17-word | ظَبْيْ | one | word not recognised | زَبْيَا. زَبْيَا. زَبْيَا. | 0.64 | 7 |
| letter-17-intro | هَيَّا نَجْمَعُ حَرْفَ ظَاء | multi | swallowed: ظَاء→ذَا (word) | هَيَّا نَجْمَعُ حَرْفَ ذَا. | 1.59 | 4 |
| letter-17-wrong | هَذَا حَرْفُ ظَاء | multi | swallowed: ظَاء→زاء (word) | هذا حرف زاء. | 1.32 | 4 |
| letter-17-snd | ظَ | syl | consonant heard as ب | بَ. بَ. بَ. بَ. | 0.41 | 6 |
| letter-17-find | أَيْنَ حَرْفُ ظَاء؟ | multi | swallowed: ظَاء→ضَاء (word) | أين حرف ضَاء؟ | 1.47 | 4 |
| letter-18-name | عَيْن | one | word not recognised | اين. اين. اين. | 0.62 | 8 |
| letter-18-word | عُصْفُور | one | word not recognised | أصفور. أصفور. أصفور. | 0.88 | 8 |
| letter-19-word | غَزَال | one | word not recognised | بازل. بازل. بازل. | 0.62 | 8 |
| letter-19-snd | غَ | syl | consonant heard as ر | رَى. رَى. رَى. | 0.56 | 6 |
| letter-20-name | فَاء | one | word not recognised | فَأَ. فَأَ. فَأَ. | 0.49 | 8 |
| letter-20-word | فِيل | one | word not recognised | فل. فل. فل. | 0.46 | 8 |
| letter-21-name | قَاف | one | too short (0.42 s < 0.45) | قَاف. قَاف. قَاف. | 0.42 | 8 |
| letter-22-name | كَاف | one | word not recognised | كف. كف. كف. | 0.38 | 8 |
| letter-22-word | كَنْغَر | one | word not recognised | قَنْ غَر. قَنْ غَر. قَنْ غَر. | 0.49 | 8 |
| letter-26-name | هَاء | one | too short (0.32 s < 0.45) | هَا. هَا. هَا. | 0.32 | 8 |
| letter-28-name | يَاء | one | too short (0.44 s < 0.45) | يَا. يَا. يَا. | 0.44 | 8 |
| letter-28-word | يَمَامَة | one | too short (0.64 s < 0.75) | يَمَامَة. يَمَامَة. يَمَامَة. | 0.64 | 8 |
| number-00 | صِفْر | one | word not recognised | سفر. سفر. سفر. | 0.55 | 8 |
| number-03 | ثَلَاثَة | one | word not recognised | تَلَاسَ. تَلَاسَ. تَلَاسَ. | 0.64 | 8 |
| number-04 | أَرْبَعَة | one | word not recognised | أَرْبَ. أَرْبَ. أَرْبَ. | 0.66 | 8 |
| number-06 | سِتَّة | one | swallowed: سِتَّة→سِتَّ (ة) | سِتَّ. سِتَّ. سِتَّ. | 0.63 | 8 |
| number-07 | سَبْعَة | one | word not recognised | سَبَع. سَبَع. سَبَع. | 0.55 | 8 |
| number-08 | ثَمَانِيَة | one | too short (0.76 s < 0.90) | ثمانية. ثمانية. ثمانية. | 0.76 | 8 |
| number-09 | تِسْعَة | one | word not recognised | تِسَى. تِسَى. تِسَى. | 0.59 | 8 |
| praise-2 | رَائِع! | one | word not recognised | وَبًا. أَلِف. بَعْفِ | 0.52 | 8 |
| praise-5 | شَاطِر! | one | word not recognised | شاطف. شاطف. شاطف. شاطف. | 0.68 | 6 |
| word-07-intro | هَيَّا نَبْنِي كَلِمَةَ نَسْر! | multi | swallowed: نَسْر→نصر (word) | هيا نبني كلمة نصر. | 1.81 | 4 |
| word-07-say | نَسْر | one | word not recognised | نَسْش. نَسْش. نَسْش. | 0.65 | 8 |
| word-10-onset | كُ | syl | consonant heard as ق | قُّ. قُّ. قُّ. | 0.42 | 6 |
| word-10-say | كُوب | one | swallowed: كُوب→كُب (long vowel) | كُب. كُب. كُب. | 0.48 | 8 |
| word-12-onset | قَ | syl | consonant heard as ح | حَ حَ حَ | 0.31 | 6 |
| word-13-intro | هَيَّا نَبْنِي كَلِمَةَ مُشْط! | multi | swallowed: مُشْط→مشت (word) | هيا نبني كلمة مشت. | 1.86 | 4 |
| word-13-say | مُشْط | one | word not recognised | مش. مش. مش. | 0.44 | 8 |
| word-16-onset | خُ | syl | consonant heard as ق | قُن. قُن. قُن. | 0.42 | 6 |
| word-16-say | خُبْز | one | word not recognised | حَبْز. حَبْز. حَبْز. | 0.5 | 8 |
| word-17-onset | عِ | syl | formants say a | ذَاء. ذَاء. ذَاء. ذَاء. | 0.72 | 6 |
| word-17-say | عِنَب | one | word not recognised | عَنَبْ عَنَبْ عَنَبْ عَنَبْ | 0.49 | 8 |
| word-18-say | تَمْر | one | word not recognised | تَمَرْ. تَمَرْ. تَمَرْ. | 0.54 | 8 |
| word-19-onset | حَ | syl | consonant heard as ه | هَا. هَا. هَا. | 0.38 | 6 |
| word-24-say | صَدَف | one | too short (0.41 s < 0.45) | صدف. صدف. صدف. | 0.41 | 8 |
| word-25-say | رَمْل | one | word not recognised | رَمُلْ رَمُلْ رَمُلْ | 0.57 | 8 |
| haraka-name-fa | فَتْحَة | one | too short (0.51 s < 0.60) | فَتْحَة. فَتْحَة. فَتْحَة. | 0.51 | 8 |
| haraka-04-ki | ثِ | syl | consonant heard as ت | تِي. تِي. تِي. | 0.44 | 6 |
| haraka-14-ki | صِ | syl | consonant heard as ت | تِ. تِ. تِ. | 0.31 | 6 |
| haraka-16-ki | طِ | syl | consonant heard as ب | بِ بِ بِ بِ. | 0.39 | 6 |
| haraka-17-intro | هَيَّا نَقْرَأُ حَرْفَ ظَاء بِالحَرَكَاتْ | multi | swallowed: ظَاء→ضاء (word) | هيا نقرأ حرف ضاء بالحركات. | 2.63 | 4 |
| haraka-17-ki | ظِ | syl | consonant heard as ذ | ذِد. ذِد. ذِد. | 0.3 | 6 |
| haraka-18-fa | عَ | syl | consonant heard as ا | أَا أَا. | 0.39 | 6 |
| haraka-19-ki | غِ | syl | consonant heard as ح | حِي. حِي. حِي. | 0.48 | 6 |
| haraka-21-da | قُ | syl | consonant heard as ب | بُ. بُ. بُ. بُ. بُ. | 0.39 | 6 |

### Every id: the chosen take

| id | text | kind | verdict | why | heard | dur s | carrier | cfg | take | best of |
|---|---|---|---|---|---|---|---|---|---|---|
| letter-01-word | أَسَد | one | PASS |  | أسد. أسد. أسد. أسد. | 0.47 | hatha | 0.5 | 1 | 3 |
| letter-02-name | بَاء | one | PASS |  | بَاء. بَاء. بَاء. | 0.56 | twice | 0.5 | 5 | 8 |
| letter-02-word | بَطَّة | one | PASS |  | بَطَّة. بَطَّة. بَطَّة. | 0.69 | hatha | 0.3 | 0 | 3 |
| letter-03-word | تِمْسَاح | one | PASS |  | تِمْسَاح. تِمْسَاح. تِمْسَاح. | 0.8 | kalima | 0.5 | 4 | 6 |
| letter-03-intro | هَيَّا نَجْمَعُ حَرْفَ تَاء | multi | check | swallowed: تَاء→حرفتا (word) | هيا نجمع حرفتا. | 1.45 | bare | 0.5 | 0 | 4 |
| letter-03-find | أَيْنَ حَرْفُ تَاء؟ | multi | PASS |  | أين حرف تَاء؟ | 1.09 | bare | 0.5 | 0 | 2 |
| letter-04-name | ثَاء | one | check | word not recognised | تَاء. تَاء. تَاء. | 0.54 | hatha | 0.3 | 0 | 8 |
| letter-04-word | ثَعْلَب | one | check | too short (0.51 s < 0.60) | تَعْلَب. تَعْلَب. تَعْلَب. | 0.51 | twice | 0.5 | 5 | 8 |
| letter-04-wrong | هَذَا حَرْفُ ثَاء | multi | PASS |  | هَذَا حَرْفُ ثَاء. | 1.52 | bare | 0.5 | 0 | 2 |
| letter-04-snd | ثَ | syl | check | reads the letter name | تَاء. تَاء. تَاء. | 0.36 | naam | 0.5 | 0 | 6 |
| letter-05-word | جَمَل | one | PASS |  | جمل. جمل. جمل. | 0.69 | hatha | 0.3 | 0 | 3 |
| letter-06-name | حَاء | one | check | word not recognised | بَاء. بَاء. بَاء. | 0.55 | twice | 0.3 | 3 | 8 |
| letter-06-word | حِصَان | one | PASS |  | حِصَان. حِصَان. حِصَان. | 0.74 | hatha | 0.5 | 1 | 3 |
| letter-06-intro | هَيَّا نَجْمَعُ حَرْفَ حَاء | multi | PASS |  | هَيَّا نَجْمَعُ حَرْفَ حَا. | 1.48 | bare | 0.3 | 1 | 2 |
| letter-06-snd | حِ | syl | check | formants say a | حَي. حَي. حَي. | 0.46 | naam | 0.5 | 0 | 6 |
| letter-07-name | خَاء | one | check | word not recognised | هَا. هَا. هَا. | 0.58 | twice | 0.5 | 5 | 8 |
| letter-07-word | خَرُوف | one | check | too short (0.57 s < 0.60) | خروف. خروف. خروف. | 0.57 | twice | 0.5 | 5 | 8 |
| letter-07-wrong | هَذَا حَرْفُ خَاء | multi | PASS |  | هذا حرف خاء. | 1.24 | bare | 0.3 | 1 | 2 |
| letter-07-snd | خَ | syl | check | consonant heard as ه | هَا. هَا. هَا. | 0.46 | naam | 0.5 | 0 | 6 |
| letter-08-word | دُبّ | one | check | swallowed: دُبّ→دُب (shadda) | دُب. دُب. دُب. | 0.56 | hatha | 0.5 | 1 | 7 |
| letter-09-name | ذَال | one | PASS |  | ذَال. ذَال. ذَال. | 0.57 | kalima | 0.3 | 2 | 3 |
| letter-09-word | ذِئْب | one | PASS |  | ذِئب. ذِئب. ذِئب. | 0.56 | kalima | 0.3 | 2 | 3 |
| letter-09-intro | هَيَّا نَجْمَعُ حَرْفَ ذَال | multi | PASS |  | هيا نجمعُ حَرْفَ ذَال. | 1.49 | bare | 0.3 | 1 | 2 |
| letter-09-snd | ذِ | syl | check | formants say a | زِسَى. زِسَى. زِسَى. | 0.72 | naam | 0.3 | 1 | 6 |
| letter-09-find | أَيْنَ حَرْفُ ذَال؟ | multi | PASS |  | أين حرف ذال؟ | 1.1 | bare | 0.5 | 0 | 2 |
| letter-10-name | رَاء | one | check | word not recognised | رَأَ. رَأَ. رَأَ. | 0.61 | kalima | 0.5 | 4 | 8 |
| letter-10-word | رَنَّة | one | PASS |  | رَنَّة. حَرَنَّ. حَرَنَّة. حَرَنَّة. | 0.58 | hatha | 0.5 | 1 | 3 |
| letter-10-snd | رَ | syl | PASS |  | رَو. رَو. رَو. | 0.52 | hatha | 0.3 | 3 | 4 |
| letter-11-name | زَاي | one | PASS |  | زَاي. زَاي. زَاي. | 0.63 | kalima | 0.3 | 2 | 3 |
| letter-11-word | زَرَافَة | one | check | too short (0.72 s < 0.75) | زَرَافَة. زَرَافَ. زَرَافَة. | 0.72 | kalima | 0.3 | 2 | 8 |
| letter-11-intro | هَيَّا نَجْمَعُ حَرْفَ زَاي | multi | PASS |  | هيا نجمعُ حَرْفَ زَاي. | 1.58 | bare | 0.3 | 1 | 2 |
| letter-11-wrong | هَذَا حَرْفُ زَاي | multi | check | swallowed: زَاي→زي (long vowel) | هذا حرف زي. | 2.68 | bare | 0.5 | 0 | 4 |
| letter-11-snd | زَ | syl | PASS |  | زَسَ. زَسَ. زَسَ. | 0.6 | hatha | 0.5 | 2 | 3 |
| letter-12-name | سِين | one | PASS |  | سِين. سِين. سِين. | 0.66 | hatha | 0.3 | 0 | 3 |
| letter-12-word | سُلَحْفَاة | one | check | too short (0.77 s < 0.90) | سُلَحْفَاة. سُلَحْفَاة. سُلَحْفَاة. | 0.77 | twice | 0.3 | 3 | 8 |
| letter-13-word | شِمْبَانْزِي | one | check | swallowed: شِمْبَانْزِي→شِمْبَنزي (long vowel) | شِمْبَنزي. شِمْبَنزي. شِمْبَنزي. | 0.96 | twice | 0.5 | 5 | 8 |
| letter-14-name | صَاد | one | check | word not recognised | تَاد. تَاد. تَاد. | 0.59 | twice | 0.5 | 5 | 8 |
| letter-14-word | صَقْر | one | check | word not recognised | سَقر. سَقر. سَقر. | 0.63 | hatha | 0.5 | 1 | 8 |
| letter-14-wrong | هَذَا حَرْفُ صَاد | multi | PASS |  | هذا حرف صاد. | 1.5 | bare | 0.5 | 0 | 2 |
| letter-15-name | ضَاد | one | check | swallowed: ضَاد→ضَد (long vowel) | ضَد. ضَد. ضَد. | 0.46 | twice | 0.5 | 5 | 8 |
| letter-15-word | ضِفْدَع | one | PASS |  | ضِفْدَ. ضِفْدَ. ضِفْدَ. | 0.7 | twice | 0.3 | 3 | 5 |
| letter-15-wrong | هَذَا حَرْفُ ضَاد | multi | PASS |  | هذا حرف ضاد. | 1.33 | bare | 0.5 | 2 | 3 |
| letter-15-snd | ضِ | syl | check | consonant heard as ب | بِ. بِ. بِ. بِ. | 0.47 | naam | 0.3 | 4 | 6 |
| letter-15-find | أَيْنَ حَرْفُ ضَاد؟ | multi | check | swallowed: ضَاد→ضد (long vowel) | أين حرف ضد؟ | 1.19 | bare | 0.5 | 2 | 4 |
| letter-16-name | طَاء | one | check | word not recognised | تَاء. تَاء. تَاء. | 0.44 | kalima | 0.5 | 4 | 8 |
| letter-16-word | طَاوُوس | one | check | word not recognised | بَوُوس. بَوُوس. بَوُوس. | 0.86 | kalima | 0.5 | 4 | 8 |
| letter-16-snd | طَ | syl | check | reads the letter name | تَاء. تَاء. تَاء. | 0.37 | naam | 0.5 | 0 | 6 |
| letter-16-find | أَيْنَ حَرْفُ طَاء؟ | multi | PASS |  | أين حف طاء؟ | 1.11 | bare | 0.5 | 0 | 2 |
| letter-17-name | ظَاء | one | check | word not recognised | بَاء. بَاء. بَاء. | 0.7 | twice | 0.3 | 3 | 8 |
| letter-17-word | ظَبْيْ | one | check | word not recognised | زَبْيَا. زَبْيَا. زَبْيَا. | 0.64 | kalima | 0.3 | 2 | 7 |
| letter-17-intro | هَيَّا نَجْمَعُ حَرْفَ ظَاء | multi | check | swallowed: ظَاء→ذَا (word) | هَيَّا نَجْمَعُ حَرْفَ ذَا. | 1.59 | bare | 0.3 | 1 | 4 |
| letter-17-wrong | هَذَا حَرْفُ ظَاء | multi | check | swallowed: ظَاء→زاء (word) | هذا حرف زاء. | 1.32 | bare | 0.5 | 0 | 4 |
| letter-17-snd | ظَ | syl | check | consonant heard as ب | بَ. بَ. بَ. بَ. | 0.41 | naam | 0.5 | 0 | 6 |
| letter-17-find | أَيْنَ حَرْفُ ظَاء؟ | multi | check | swallowed: ظَاء→ضَاء (word) | أين حرف ضَاء؟ | 1.47 | bare | 0.5 | 2 | 4 |
| letter-18-name | عَيْن | one | check | word not recognised | اين. اين. اين. | 0.62 | twice | 0.5 | 5 | 8 |
| letter-18-word | عُصْفُور | one | check | word not recognised | أصفور. أصفور. أصفور. | 0.88 | twice | 0.5 | 5 | 8 |
| letter-18-snd | عُ | syl | PASS |  | Oh. Oh. Oh. | 0.47 | naam | 0.5 | 0 | 3 |
| letter-19-name | غَيْن | one | PASS |  | غَيْن. غَيْن. غَيْن. | 0.59 | hatha | 0.5 | 1 | 3 |
| letter-19-word | غَزَال | one | check | word not recognised | بازل. بازل. بازل. | 0.62 | kalima | 0.3 | 2 | 8 |
| letter-19-snd | غَ | syl | check | consonant heard as ر | رَى. رَى. رَى. | 0.56 | naam | 0.3 | 1 | 6 |
| letter-20-name | فَاء | one | check | word not recognised | فَأَ. فَأَ. فَأَ. | 0.49 | kalima | 0.5 | 4 | 8 |
| letter-20-word | فِيل | one | check | word not recognised | فل. فل. فل. | 0.46 | hatha | 0.5 | 1 | 8 |
| letter-20-intro | هَيَّا نَجْمَعُ حَرْفَ فَاء | multi | PASS |  | هَيَّا نَجْمَعُ حَرْفَ فَاء. | 1.46 | bare | 0.3 | 1 | 2 |
| letter-20-find | أَيْنَ حَرْفُ فَاء؟ | multi | PASS |  | أين حرف فاء؟ | 1.06 | bare | 0.3 | 1 | 2 |
| letter-21-name | قَاف | one | check | too short (0.42 s < 0.45) | قَاف. قَاف. قَاف. | 0.42 | twice | 0.5 | 5 | 8 |
| letter-21-word | قِرْد | one | PASS |  | قرد. قرد. قرد. | 0.53 | twice | 0.5 | 5 | 8 |
| letter-21-snd | قِ | syl | PASS |  | 可以!可以!可以! | 0.37 | naam | 0.3 | 1 | 3 |
| letter-22-name | كَاف | one | check | word not recognised | كف. كف. كف. | 0.38 | twice | 0.5 | 5 | 8 |
| letter-22-word | كَنْغَر | one | check | word not recognised | قَنْ غَر. قَنْ غَر. قَنْ غَر. | 0.49 | kalima | 0.5 | 4 | 8 |
| letter-22-snd | كَ | syl | PASS |  | كَ. كَ. كَ. | 0.36 | hatha | 0.5 | 2 | 3 |
| letter-23-name | لَام | one | PASS |  | لَام. لَام. لَام. | 0.66 | hatha | 0.3 | 0 | 3 |
| letter-23-word | لَامَا | one | PASS |  | لَاما. لَاما. لَاما. | 0.63 | hatha | 0.5 | 1 | 3 |
| letter-23-wrong | هَذَا حَرْفُ لَام | multi | PASS |  | هَذَا حَرفُ لَام. | 1.55 | bare | 0.5 | 0 | 2 |
| letter-23-snd | لَ | syl | PASS |  | لَا. لَا. لَا. | 0.43 | naam | 0.3 | 1 | 3 |
| letter-24-name | مِيم | one | PASS |  | ميم. ميم. ميم. | 0.54 | kalima | 0.5 | 4 | 6 |
| letter-24-word | مَاعِز | one | PASS |  | ماز. ماز. ماز. | 0.63 | hatha | 0.5 | 1 | 3 |
| letter-25-word | نَمِر | one | PASS |  | نمر. نمر. نمر. | 0.53 | kalima | 0.3 | 2 | 3 |
| letter-26-name | هَاء | one | check | too short (0.32 s < 0.45) | هَا. هَا. هَا. | 0.32 | twice | 0.3 | 3 | 8 |
| letter-26-word | هُدْهُد | one | PASS |  | هُدْهُد. هُدْهُد. هُدْهُد. | 0.68 | twice | 0.3 | 3 | 5 |
| letter-26-snd | هُ | syl | PASS |  | هو. هو. هو. | 0.32 | naam | 0.5 | 0 | 3 |
| letter-26-find | أَيْنَ حَرْفُ هَاء؟ | multi | PASS |  | أين حرف ها؟ | 1.12 | bare | 0.3 | 1 | 2 |
| letter-27-name | وَاو | one | PASS |  | واو. واو. واو. | 0.47 | twice | 0.3 | 3 | 5 |
| letter-27-word | وَحِيدُ القَرْن | multi | PASS |  | وحيد القرن. | 1.13 | bare | 0.3 | 1 | 2 |
| letter-27-intro | هَيَّا نَجْمَعُ حَرْفَ وَاو | multi | PASS |  | هيا نجمع حرف واو. | 1.59 | bare | 0.5 | 2 | 3 |
| letter-27-wrong | هَذَا حَرْفُ وَاو | multi | PASS |  | هذا حرف واو. | 1.52 | bare | 0.3 | 3 | 4 |
| letter-28-name | يَاء | one | check | too short (0.44 s < 0.45) | يَا. يَا. يَا. | 0.44 | twice | 0.3 | 3 | 8 |
| letter-28-word | يَمَامَة | one | check | too short (0.64 s < 0.75) | يَمَامَة. يَمَامَة. يَمَامَة. | 0.64 | kalima | 0.5 | 4 | 8 |
| number-00 | صِفْر | one | check | word not recognised | سفر. سفر. سفر. | 0.55 | kalima | 0.5 | 4 | 8 |
| number-03 | ثَلَاثَة | one | check | word not recognised | تَلَاسَ. تَلَاسَ. تَلَاسَ. | 0.64 | hatha | 0.5 | 1 | 8 |
| number-04 | أَرْبَعَة | one | check | word not recognised | أَرْبَ. أَرْبَ. أَرْبَ. | 0.66 | hatha | 0.5 | 1 | 8 |
| number-06 | سِتَّة | one | check | swallowed: سِتَّة→سِتَّ (ة) | سِتَّ. سِتَّ. سِتَّ. | 0.63 | twice | 0.3 | 3 | 8 |
| number-07 | سَبْعَة | one | check | word not recognised | سَبَع. سَبَع. سَبَع. | 0.55 | kalima | 0.5 | 4 | 8 |
| number-08 | ثَمَانِيَة | one | check | too short (0.76 s < 0.90) | ثمانية. ثمانية. ثمانية. | 0.76 | twice | 0.3 | 3 | 8 |
| number-09 | تِسْعَة | one | check | word not recognised | تِسَى. تِسَى. تِسَى. | 0.59 | twice | 0.5 | 5 | 8 |
| number-10 | عَشَرَة | one | PASS |  | عشرة. عشرة. عشرة. عشرة. | 0.6 | twice | 0.3 | 3 | 5 |
| new-friend | صَدِيقٌ جَدِيدٌ فِي حَدِيقَتِكَ! | multi | PASS |  | صديق جديد في حديقتك. | 2.22 | bare | 0.3 | 1 | 2 |
| praise-2 | رَائِع! | one | check | word not recognised | وَبًا. أَلِف. بَعْفِ | 0.52 | twice | 0.5 | 5 | 8 |
| praise-4 | بَطَل! | one | PASS |  | بَطَل. بَطَل. بَطَل. | 0.6 | kalima | 0.3 | 2 | 3 |
| praise-5 | شَاطِر! | one | check | word not recognised | شاطف. شاطف. شاطف. شاطف. | 0.68 | kalima | 0.3 | 2 | 6 |
| praise-6 | عَظِيم! | one | PASS |  | عظيم. عظيم. عظيم. | 0.66 | kalima | 0.3 | 2 | 3 |
| word-06-intro | هَيَّا نَبْنِي كَلِمَةَ نَمِر! | multi | PASS |  | هيا نبني كلمة نمر. | 1.81 | bare | 0.3 | 1 | 2 |
| word-07-intro | هَيَّا نَبْنِي كَلِمَةَ نَسْر! | multi | check | swallowed: نَسْر→نصر (word) | هيا نبني كلمة نصر. | 1.81 | bare | 0.3 | 1 | 4 |
| word-07-say | نَسْر | one | check | word not recognised | نَسْش. نَسْش. نَسْش. | 0.65 | twice | 0.3 | 3 | 8 |
| word-08-intro | هَيَّا نَبْنِي كَلِمَةَ فِيل! | multi | PASS |  | هيا نبني كلمة فيل. | 1.69 | bare | 0.3 | 1 | 2 |
| word-09-say | بَيْت | one | PASS |  | بَيْت. بَيْت. بَيْت. | 0.65 | hatha | 0.3 | 0 | 3 |
| word-10-onset | كُ | syl | check | consonant heard as ق | قُّ. قُّ. قُّ. | 0.42 | naam | 0.5 | 0 | 6 |
| word-10-say | كُوب | one | check | swallowed: كُوب→كُب (long vowel) | كُب. كُب. كُب. | 0.48 | twice | 0.3 | 3 | 8 |
| word-11-intro | هَيَّا نَبْنِي كَلِمَةَ سَرِير! | multi | PASS |  | هيا نبني كلمة سرير. | 1.76 | bare | 0.5 | 0 | 2 |
| word-11-onset | سَ | syl | PASS |  | سسا. سسا. سسا. | 0.53 | hatha | 0.5 | 2 | 3 |
| word-11-say | سَرِير | one | PASS |  | سَرِير. سَرِير. سَرِير. | 0.73 | twice | 0.3 | 3 | 5 |
| word-12-onset | قَ | syl | check | consonant heard as ح | حَ حَ حَ | 0.31 | hatha | 0.5 | 2 | 6 |
| word-12-say | قَلَم | one | PASS |  | قلم. قلم. قلم. | 0.49 | hatha | 0.3 | 0 | 3 |
| word-13-intro | هَيَّا نَبْنِي كَلِمَةَ مُشْط! | multi | check | swallowed: مُشْط→مشت (word) | هيا نبني كلمة مشت. | 1.86 | bare | 0.3 | 3 | 4 |
| word-13-onset | مُ | syl | PASS |  | مُو. مُو. مُو. | 0.46 | naam | 0.5 | 0 | 3 |
| word-13-say | مُشْط | one | check | word not recognised | مش. مش. مش. | 0.44 | twice | 0.5 | 5 | 8 |
| word-14-say | صَحْن | one | PASS |  | صحن. صحن. صحن. | 0.64 | twice | 0.3 | 3 | 5 |
| word-15-say | مَوْز | one | PASS |  | موز. موز. موز. | 0.45 | hatha | 0.5 | 1 | 3 |
| word-16-intro | هَيَّا نَبْنِي كَلِمَةَ خُبْز! | multi | PASS |  | هيا نبني كلمة خبز. | 1.66 | bare | 0.5 | 0 | 2 |
| word-16-onset | خُ | syl | check | consonant heard as ق | قُن. قُن. قُن. | 0.42 | naam | 0.5 | 0 | 6 |
| word-16-say | خُبْز | one | check | word not recognised | حَبْز. حَبْز. حَبْز. | 0.5 | twice | 0.3 | 3 | 8 |
| word-17-onset | عِ | syl | check | formants say a | ذَاء. ذَاء. ذَاء. ذَاء. | 0.72 | hatha | 0.5 | 2 | 6 |
| word-17-say | عِنَب | one | check | word not recognised | عَنَبْ عَنَبْ عَنَبْ عَنَبْ | 0.49 | hatha | 0.3 | 0 | 8 |
| word-18-intro | هَيَّا نَبْنِي كَلِمَةَ تَمْر! | multi | PASS |  | هيا نبني كلمة تمر. | 1.69 | bare | 0.3 | 3 | 4 |
| word-18-onset | تَ | syl | PASS |  | تَ. تَ. تَ. | 0.31 | naam | 0.5 | 0 | 3 |
| word-18-say | تَمْر | one | check | word not recognised | تَمَرْ. تَمَرْ. تَمَرْ. | 0.54 | twice | 0.3 | 3 | 8 |
| word-19-onset | حَ | syl | check | consonant heard as ه | هَا. هَا. هَا. | 0.38 | naam | 0.3 | 1 | 6 |
| word-19-say | حَلِيب | one | PASS |  | حليب. حليب. حليب. | 0.69 | twice | 0.3 | 3 | 5 |
| word-20-say | جَزَر | one | PASS |  | جزار. جزار. جزار. | 0.57 | hatha | 0.5 | 1 | 3 |
| word-21-say | سَمَك | one | PASS |  | سمك. سمك. سمك. | 0.55 | kalima | 0.3 | 2 | 3 |
| word-22-onset | حُ | syl | PASS |  | حُو. حُو. حُو. | 0.44 | naam | 0.3 | 4 | 5 |
| word-22-say | حُوت | one | PASS |  | حُوت. حُوت. حُوت. | 0.6 | hatha | 0.5 | 1 | 3 |
| word-23-intro | هَيَّا نَبْنِي كَلِمَةَ قِرْش! | multi | PASS |  | هيا نبني كلمة قرش. | 1.88 | bare | 0.5 | 0 | 2 |
| word-23-say | قِرْش | one | PASS |  | قرش. قرش. قرش. | 0.59 | kalima | 0.3 | 2 | 3 |
| word-24-say | صَدَف | one | check | too short (0.41 s < 0.45) | صدف. صدف. صدف. | 0.41 | hatha | 0.3 | 0 | 8 |
| word-25-intro | هَيَّا نَبْنِي كَلِمَةَ رَمْل! | multi | PASS |  | هيا نبني كلمة رمل. | 1.65 | bare | 0.5 | 0 | 2 |
| word-25-say | رَمْل | one | check | word not recognised | رَمُلْ رَمُلْ رَمُلْ | 0.57 | kalima | 0.5 | 4 | 8 |
| word-26-say | مَرْكَب | one | PASS |  | مركب. مركب. مركب. | 0.64 | kalima | 0.3 | 2 | 3 |
| word-27-onset | شَ | syl | PASS |  | ش. ش. ش. ش. | 0.42 | naam | 0.5 | 0 | 3 |
| word-27-say | شَمْس | one | PASS |  | شمس. شمس. شمس. | 0.57 | twice | 0.3 | 3 | 5 |
| word-28-say | قَمَر | one | PASS |  | قَمَار. قَمَار. قَمَار. | 0.55 | hatha | 0.5 | 1 | 3 |
| word-29-say | نَجْم | one | PASS |  | نَجْم. نَجْم. نَجْم. | 0.64 | hatha | 0.5 | 1 | 3 |
| word-30-say | غَيْم | one | PASS |  | غَيْم. غَيْم. غَيْم. | 0.62 | hatha | 0.5 | 1 | 3 |
| word-31-say | وَرْد | one | PASS |  | ورد. ورد. ورد. | 0.57 | hatha | 0.3 | 0 | 3 |
| word-32-intro | هَيَّا نَبْنِي كَلِمَةَ نَحْل! | multi | PASS |  | هيا نبني كلمة نح. | 1.59 | bare | 0.3 | 1 | 2 |
| word-32-say | نَحْل | one | PASS |  | نحل. نحل. نحل. | 0.64 | hatha | 0.3 | 0 | 3 |
| haraka-name-fa | فَتْحَة | one | check | too short (0.51 s < 0.60) | فَتْحَة. فَتْحَة. فَتْحَة. | 0.51 | twice | 0.5 | 5 | 8 |
| haraka-name-da | ضَمَّة | one | PASS |  | ضَمَّة. ضَمَّة. ضَمَّة. | 0.56 | hatha | 0.5 | 1 | 3 |
| haraka-find | أَيْنَ | one | PASS |  | اينا. اينا. اينا. | 0.54 | hatha | 0.5 | 1 | 3 |
| haraka-02-da | بُ | syl | PASS |  | بُ. بُ. بُ. بُ. | 0.45 | naam | 0.3 | 9 | 13 |
| haraka-03-da | تُ | syl | PASS |  | تو. تو. تو. | 0.43 | naam | 0.5 | 0 | 3 |
| haraka-04-ki | ثِ | syl | check | consonant heard as ت | تِي. تِي. تِي. | 0.44 | naam | 0.5 | 5 | 6 |
| haraka-04-da | ثُ | syl | PASS |  | と.と.と.と. | 0.38 | naam | 0.3 | 1 | 3 |
| haraka-08-fa | دَ | syl | PASS |  | دَ. دَ. دَ. | 0.4 | hatha | 0.5 | 2 | 3 |
| haraka-09-da | ذُ | syl | PASS |  | ذو. ذو. ذو. | 0.46 | naam | 0.5 | 5 | 6 |
| haraka-10-ki | رِ | syl | PASS |  | رِ. رِ. رِ. رِ. | 0.48 | naam | 0.3 | 1 | 3 |
| haraka-10-da | رُ | syl | PASS |  | رُو. رُو. رُو. | 0.43 | naam | 0.5 | 0 | 3 |
| haraka-11-ki | زِ | syl | PASS |  | ز. ز. ز. ز. | 0.31 | naam | 0.3 | 4 | 5 |
| haraka-11-da | زُ | syl | PASS |  | زو. زو. زو. | 0.46 | naam | 0.5 | 0 | 3 |
| haraka-12-ki | سِ | syl | PASS |  | سي. سي. سي. | 0.44 | hatha | 0.5 | 2 | 3 |
| haraka-14-ki | صِ | syl | check | consonant heard as ت | تِ. تِ. تِ. | 0.31 | hatha | 0.3 | 3 | 6 |
| haraka-14-da | صُ | syl | PASS |  | صون. صون. صون. | 0.55 | naam | 0.5 | 0 | 3 |
| haraka-15-fa | ضَ | syl | PASS |  | Dodo. Dodo. Dodo. | 0.55 | hatha | 0.3 | 3 | 4 |
| haraka-15-da | ضُ | syl | PASS |  | ضد. ضد. ضد. | 0.48 | hatha | 0.5 | 2 | 3 |
| haraka-16-ki | طِ | syl | check | consonant heard as ب | بِ بِ بِ بِ. | 0.39 | naam | 0.3 | 4 | 6 |
| haraka-16-da | طُ | syl | PASS |  | 또. 또. 또. | 0.35 | naam | 0.5 | 5 | 6 |
| haraka-17-intro | هَيَّا نَقْرَأُ حَرْفَ ظَاء بِالحَرَكَاتْ | multi | check | swallowed: ظَاء→ضاء (word) | هيا نقرأ حرف ضاء بالحركات. | 2.63 | bare | 0.3 | 3 | 4 |
| haraka-17-ki | ظِ | syl | check | consonant heard as ذ | ذِد. ذِد. ذِد. | 0.3 | naam | 0.3 | 4 | 6 |
| haraka-18-fa | عَ | syl | check | consonant heard as ا | أَا أَا. | 0.39 | hatha | 0.3 | 3 | 6 |
| haraka-19-ki | غِ | syl | check | consonant heard as ح | حِي. حِي. حِي. | 0.48 | naam | 0.3 | 4 | 6 |
| haraka-19-da | غُ | syl | PASS |  | Oh. Oh. Oh. | 0.43 | naam | 0.5 | 0 | 3 |
| haraka-20-intro | هَيَّا نَقْرَأُ حَرْفَ فَاء بِالحَرَكَاتْ | multi | PASS |  | هيا نقرأ حرف فاء بالحركات. | 2.59 | bare | 0.3 | 3 | 4 |
| haraka-21-da | قُ | syl | check | consonant heard as ب | بُ. بُ. بُ. بُ. بُ. | 0.39 | hatha | 0.3 | 3 | 6 |

## Review and install (locally)

```bash
python tools/voice-qa/listen.py --cand chatterbox-retry,chatterbox
```

opens `tools/voice-qa/listen.html`: A = chatterbox-retry, B = chatterbox, ▶ = the clip installed in the game; orange A = the
judge's check. Mark ✅/❌, then:

```bash
python tools/voice-qa/choose.py --from chatterbox-retry --dry
```

```bash
python tools/voice-qa/choose.py --from chatterbox-retry
```

installs every id that `cand/chatterbox-retry` has (the 172) except the stopgap ids, which keep the old Microsoft clip until the
owner approves their retry; for the approved ones add `--replace-stopgap` (it drops the whole stopgap list, so do it when every
stopgap id the owner wants is in the set, or copy the single approved mp3 by hand). `--only haraka` / `--only word` limit the
install to one group.

## Files

- `tools/voice-qa/retry_tts.py` – generation (ids, takes plan, carriers)
- `tools/voice-qa/retry_judge.py` – cut + judge loop (padded cut, stray trim, length floor)
- `tools/voice-qa/retry_best.py` – best take per id → `bench/cloud/chatterbox-retry-best/` (+ `SUMMARY.md`, `takes.json` with every cut)
- `tools/voice-qa/bench_judge.py` – `judge_clip()` / `formant_refs()` now importable, same verdicts
- `tools/voice-qa/cloud_cand.py chatterbox-retry --src bench/cloud/chatterbox-retry-best` – the shipped folder
- `bench/cloud/chatterbox-retry/takes/` (every take, cut and judge row) is not committed (gitignored, 110 MB of wav); rerun the
  three scripts in the cloud to regenerate.
