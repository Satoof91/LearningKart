# Team review — round 1 (2026-11-05)

Nine reviewers looked at the game: a graphic designer, a sound engineer, a QA tester, a scenario/learning designer, the product owner and four developers (game flow, rendering, voice/audio code, platform/UI). The question was whether the game is creative and really teaches a child of 3–6.

**Verdict:** the 3D zoo, the kart and the animals you collect are a strong, creative hook. The *learning loop* was weak, though. A child could win without knowing any letters, and the game never taught letter sounds.

## What the team found (consensus, by impact)

| # | Finding | Who raised it |
|---|---|---|
| 1 | A child who never steers finished every level with **3 stars** (verified by QA: 5/5, 0 wrong). Misses did not count, and help put the letter straight ahead. | QA, PO, Dev 1 |
| 2 | The **hint glow was always on** and washed out the glyph, so the child learned to follow the light, not the letter. | Designer, PO, Scenario, Dev 2 |
| 3 | Only letter **names** were taught, never letter **sounds** (بَ), which matter most for reading. | Sound, Scenario, PO |
| 4 | A correct pickup said only "رائع"; the target letter was **never spoken while driving**. Wrong picks never said what to look for. | QA, Dev 1, Dev 3, Sound |
| 5 | **Look-alike letters** (ب/ت/ث) appeared on level 2, before the child knew any shapes. | Dev 1, Scenario |
| 6 | **No review**: earlier letters only came back as "wrong" answers. | PO, Dev 1, Scenario |
| 7 | The game only tested recognition (matching a visible glyph), never **recall** (hear the name, find the shape). | Scenario |
| 8 | Voice bugs: speech overlapping, screen praise ≠ spoken praise, «رائع… رائع!», the intro could be skipped, and a grammar error («إلى اثنان»). | Dev 3, Sound, Dev 1 |
| 9 | Bugs: completed number tiles on the map were blank (uncaught error); in the number-10 celebration ٨ ٩ ١٠ were hidden behind the card. | QA |
| 10 | Android **Back closed the app** mid-level; the parent lock was a 1.2 s hold a toddler can do; reset had no timeout. | Dev 4 |
| 11 | Small bubbles read too late; the thick outline filled in the dots; لاما highlight broke the ligature. | Designer, Dev 2 |

## What changed in this version

**Learning loop**
- **Honest stars**: misses count as well as wrong picks; a level the game had to steer for gets at most 2 stars. QA's "never steers" test now gets **1 star** (it got 3 before).
- **Help only after mistakes**: the glow (now a ring *behind* the bubble) appears only after a wrong pick or a miss. After 3 misses in a row the letter comes straight ahead.
- **Letter sounds**: 28 new clips «بَ، بَ، بَطَّة» (sound + sound + animal word). They play at the intro, on the 1st, 3rd and 5th pickup, at the celebration and when the chip is tapped.
- **Correct pickup** says the sound or the letter name, and the spoken praise now matches the praise on screen (never the same twice in a row).
- **Wrong pickup**: «هَذَا حَرْفُ تَاء» → «أَيْنَ حَرْفُ بَاء؟», and the chip shows the right letter for a moment. A softer, neutral sound replaces the sad falling tone.
- **Recall rounds**: after 2 pickups the HUD chip shows «؟» and the voice asks «أَيْنَ حَرْفُ …؟» before each pair. Tapping the chip shows the letter again.
- **Difficulty ladder**: the first pairs use a clearly different shape (preferably one already learned); dotted look-alikes come only when the child is doing well.
- **Spaced review**: from letter 3 on, one pair per level asks for an earlier letter. It picks the one the child missed most, which is saved per letter. That pair gives bonus stars.
- **The intro card shows the animal** next to the letter.

**Fixes**
- Voice: lines queue instead of overlapping, `stop()` releases waiting lines straight away, the intro can't be skipped by an old promise and is repeated after a pause, the gate line is now «هَيَّا إِلَى البَوَّابَة!», and «إِلَى اثْنَيْن» is fixed.
- Number tiles on the map show the digit (no more crash). The number celebration uses two rows for 7–10 apples, so all of them stay in view.
- Android Back pauses the level (and steps back on other screens). Fingers are released on pause and app switch. Tilt ignores the phone lying flat.
- **Parent gate**: after the hold, tap two digits in the written order. Reset disarms after 3 s, and the unlock label updates.
- Saved progress is validated (old or damaged saves can't break the game); the newer of the localStorage/native copies wins.
- Bubbles are larger at a distance and their dots are clearer; the لا ligature is highlighted correctly; the bubble shadow is shared (memory leak fixed).
- 58 new Hamed clips (198 in total).

## Backlog (next rounds, not done yet)

| Item | Why | Effort |
|---|---|---|
| Move the clips out of `index.html` into `www/assets/voice/` and play them through WebAudio | the bundle is now 4.5 MB of base64; iOS can block new `Audio()` elements started without a tap | M |
| Number levels with a real choice: pick the right digit (٣ vs ٥), finish with «كَمْ تُفَّاحَةً؟» | number levels still test nothing and always give 3 stars | M |
| Move ٠ after ٥ and teach it as "taking away" | meeting "nothing" before "one" is backwards (needs a save migration) | S–M |
| Parent page: stars per letter + most confused pairs (data is now saved) | real value for parents | M |
| Tracing at the gate: "trace the letter to free the animal" | the motor pathway fixes letter forms best | L |
| "Who's calling?" ears-only rounds (sound only, no glyph) | the strongest sound → shape link | M |
| Merge animal meshes (≈40 → ≈8 draw calls each), no shadows for zoo-slot animals | stutter on low-end phones | M |
| Animal look: a banana for the monkey, a howling wolf, bigger reindeer antlers, an olive sprig for the dove | several animals are hard for a 3-year-old to tell apart | S each |
| Words to reconsider: رنة, كنغر, لاما (→ لقلق), وحيد القرن (two words) | unfamiliar to Gulf toddlers | S + new animal |
| Story frame: "the animals are lost; the letter is the key to their home" | gives a 4-year-old a reason | S |
| `prefers-reduced-motion`; a colour-blind-safe apple slot | accessibility | S |
| Short silence trim on the clips (ffmpeg), counting timed from clip length | a snappier rhythm | S |
