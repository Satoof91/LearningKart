# Modes and roadmap: team review round 2 (2026-11-06)

The owner asked for more levels and modes to add excitement and learning value, starting with "a pronunciation mode where the player collects the letters that make a word". Kart and driver customisation came up next. Five reviewers looked at the word idea: a literacy specialist (Arabic and English), a game designer, the product owner, a developer and a sound/voice designer.

## 1. Word mode: «ابنِ الكلمة» / Build the word (shipped in v1)

**Verdict (unanimous):** yes. Going from letters to words is the step most alphabet apps skip, and it's what parents value. It needed one reframe. The game cannot hear the child, so this is not a speaking or pronunciation test. It is **"hear the word, collect its letters in order, hear it blended"**: segmenting and blending, which decoding is built on.

**What v1 does**
- Each word gets its own map tab (كلمات / Words) and its own saved stars. Word stops never block letter progress (developer: interleaving them into the letter path would shift saved indices).
- A word opens once all its letters have been learned in that language (product owner).
- The top panel shows the word as a pale outline that fills in colour letter by letter. Arabic stays joined while it fills, using a zero-width joiner at the edge of the coloured part. The chip shows the next letter (game designer, developer).
- The bubbles ahead **retarget** after every pickup or miss, so the road always asks for the letter still missing. Distractors are never letters of the word. There is no fail state, and wrong picks and misses count in the honest stars.
- Voice: the letter's name on pickup plus the question for the next letter. At the end, the blend: «دُ، دُ، دُبّ» / "F, O, X. Fox!" (sound designer: only lines neural TTS says reliably). Lines with the same text reuse one clip.
- The card shows «أ + س + د ↓ أسد» and the animal comes out of its habitat.
- **Words:** دب أسد قرد صقر جمل نمر نسر فيل · HEN DOG PIG CAT FOX OX YAK. New animals: cat, dog, pig, hen.
- **Avoided for now (literacy specialist):**
  - ة (not one of the 28 letters, silent at a pause)
  - hamza seats (ذئب) and ال (sun-letter assimilation)
  - لا (ligature)
  - two-word names
  - English digraphs, silent e and doubled letters

**Known limits / next steps for words**
- **Letter sounds in English:** English names the letters ("F, O, X"). True phonics ("/f/ /o/ /ks/ → fox") needs about 25 short **human recordings** of the letter sounds; TTS cannot say isolated phonemes. The same holds for Arabic sukun segments (دْ). Recording these is the single biggest upgrade for both letter and word modes.
- **Tier ladder:** Tier A (now) has the whole word as an outline and the next letter on the chip. Tier B shows only the next outline letter. Tier C is voice only («أين سَ؟») and is the real segmenting test. Move up after 3 stars; drop back after 1.
- **Letter order:** Arabic letters are taught in alphabetical order, so most Arabic words unlock late (letters 21–28). A frequency-first order (ب ت م ن ل ر س د أ …) would bring words in around level 6. This needs a save migration.
- **Word ideas for later:**
  - باب, تاج (long ا, "the letter that stretches the sound")
  - بوم, ثور, خروف (و)
  - هدهد
  - بطة (ة, last)
  - English CVC words: bed, bag, fig, jam, sun, cup, web, hat (need props)

## 2. Garage: kart and driver customisation (shipped in v1)

**Evaluation:** a strong engagement hook for 3–6-year-olds. Ownership and self-expression make "my kart" something to show off. The design rules keep it a learning reward:
- **Unlock with learning stars:** the 1–3 honest stars of every finished level, in every track. Never with road coins, purchases or ads.
- **Nothing is spent or lost.** Items open at thresholds and stay open, so a toddler never "loses" stars.
- **The co-pilot:** any animal friend the child has met (a finished letter or word) can ride on the back of the kart and cheers after every right pick. The zoo collection becomes something the child drives with: a direct pull to learn the next letter.
- **"🎁 New in the garage!"** appears on the celebration card when a level crosses a threshold.
- **Contents:**
  - Bodies: classic (free), racer ★6, safari jeep ★15, rocket ★30
  - Colours: 8 colours (3 unlock at ★4, ★9, ★18)
  - Hats: helmet (free), cap ★3, safari ★10, bunny ears ★20, crown ★40
  - Skin tones: 4, all free from the start
  - Co-pilot: any animal friend
- The garage is reached from the title screen and the map, never during a level.

**Next for the garage:** stickers/decals earned from words; a kart horn that says the last letter learned; a "show-off lap" on the title screen; wheels and trails (sparkle, bubbles, rainbow) as late rewards.

## 3. More modes, ranked (excitement × learning ÷ effort)

| # | Mode | Why | Effort |
|---|---|---|---|
| 1 | **"Who's calling?"** ears-only pairs: an animal calls a sound from a bush, the chip is blank, steer to the right letter | The strongest sound→shape link; reuses recall rounds and the existing sound clips | S–M |
| 2 | **Parade review** every 4 letters: the last 4 animals follow the kart in a conga line and each right pick adds a dancer | Spaced review that feels like a party; reuses `weakestLearned` and the pair spawner | M |
| 3 | **Number choice race** (٣ vs ٥, then «كَمْ تُفَّاحَةً؟») | Number levels still test nothing (a no-steer run gets 3 stars) | M |
| 4 | **First-sound hunt**: "which animal starts with بَ / /b/?"; steer to pictures, not letters | Phonemic awareness before print; works for age 3 and prepares for word mode | M |
| 5 | **Sticker book / my zoo**: a page per animal (tap to hear letter, sound and word), gold for 3 stars | Retention and pride | M |
| 6 | **Daily visitor**: once a day an animal at the start of the map asks for the letter the child missed most, for a bonus sticker; no penalty for skipped days | A reason to come back tomorrow with no streak guilt | S |
| 7 | **Trace to free the animal** at the gate | Motor memory of letter forms; later the Arabic joined forms (بـ ـبـ ـب) | L |

## 4. Platform work the team flagged as urgent

- **Bundle size:** `index.html` is 8.3 MB because all 407 clips are inlined as base64. Move them to `www/assets/voice/` and play them through WebAudio: faster cold start, less memory, and no iOS autoplay risk for clips started without a tap. This should happen before more audio is added. (Product owner and developer, both rounds.)
- **Parent progress page** behind the parent gate: stars per letter, number and word, and the most-confused pairs (the data is already saved).
- **Low-end performance:** merge animal meshes (about 40 → 8 draw calls each) and turn off shadows for zoo-slot animals.
- **Owner listening pass:** listen to the new clips (letter sounds, word intros and blends) before release.
