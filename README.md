# LearningKart — حديقة الحروف والأرقام

A kart game that teaches **Arabic letters (أ–ي) and numbers (٠–١٠)** and **English letters (A–Z) and numbers (0–10)** to children aged 3–6, set in a zoo.
Built with Three.js and packaged for **Android** and **iOS** with [Capacitor 8](https://capacitorjs.com). Landscape, full screen, works offline.

| | |
|---|---|
| App name | LearningKart |
| App ID (bundle ID) | `com.example.learningkart` &nbsp;← **change before publishing** (see below) |
| Content | `src/data.js`: 28 Arabic letters and 26 English letters, each with an animal and a word; numbers 0–10 in both languages (`TRACKS`) |
| Game | `src/main.js` (flow, levels, map, celebration), `src/world.js` (zoo, road, habitats, kart), `src/animals.js` (28 animals) |
| Voice / sound | `src/voice.js` (Arabic text-to-speech), `src/audio.js` (synthesized effects + music) |
| UI | `template.html` (Arabic, right-to-left) |

## How the game plays

1. **Zoo map**: a winding path of letters (or numbers). Finished letters show their animal and 1–3 stars. The next letter has the kart on it; later ones are locked.
2. **Level intro**: the letter appears big and is spoken: «أَلِف ... هَيَّا نَجْمَعُ حَرْفَ أَلِف».
3. **Drive**: the kart drives itself (no gas or brake). The child only steers left or right. Letter bubbles come in pairs: the right letter on one side, another letter on the other. Collect the right letter **5 times**.
   - A correct pick says the letter's **sound** with its word («بَ، بَ، بَطَّة») or its name plus praise.
   - A wrong pick names that letter and asks again: «هَذَا حَرْفُ تَاء… أَيْنَ حَرْفُ بَاء؟».
   - The first pairs use a clearly different shape; dotted look-alikes come once the child is doing well.
   - After 2 pickups the chip shows «؟» and the child finds the letter by ear (recall).
   - From letter 3 on, one pair brings back an earlier letter the child found hard (review, bonus stars).
   - Help only comes after mistakes: a glow, then (after 3 misses) the letter straight ahead.
   - Stars count wrong picks *and* misses.

   See [docs/TEAM-REVIEW.md](docs/TEAM-REVIEW.md) for the reasoning and the backlog.
4. **Gate**: a rainbow gate with the letter and word appears; drive through it.
5. **Meet the animal**: the animal's habitat appears. The card shows the letter, the word with the first letter highlighted (أسد), and stars. The letter and word are spoken, the animal jumps, and tapping the animal says it again. The animal then lives in your zoo and appears in the enclosures along the road in later levels.
6. **Numbers**: collect *n* apples (each one is counted aloud), then exactly *n* apples appear one by one on a table, each with its number (counted right to left). Zero shows an empty basket: «صفر يعني لا شيء».

### Word mode (map tabs **كلمات** and **Words**)
Hear the word, collect its letters in order, hear it blended: «دُ، دُ، دُبّ» / "F, O, X. Fox!". The word fills in at the top (Arabic stays joined). A word opens once all its letters are learned. Words: دب أسد قرد صقر جمل نمر نسر فيل · HEN DOG PIG CAT FOX OX YAK.

### Garage (🛠️ on the title screen and the map)
Kart body, colour, hat, skin tone and an **animal co-pilot** (any animal friend the child has met). Items unlock with *learning stars*, the stars of finished levels. Nothing is bought or spent. A level that unlocks something shows "🎁 New in the garage!". Items and thresholds are in `src/garage.js`.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the team's evaluation and the next modes.

### Interface language (AR / EN)
The round **EN / ع** button on the title screen and the map switches the whole interface: menus, pause, parent settings, parent gate, on-screen instructions and the zoo banner. The layout also flips between right-to-left and left-to-right. It is separate from what the child learns: an English-speaking family can study the Arabic letters with an English interface, and the other way round. On first launch the interface follows the device language. Strings are in `src/i18n.js`.

### English track (map tabs **ABC** and **123**)
The same game in English, with its own saved progress. Capital letters are in the bubbles and «Aa» on the card. Lines are spoken by a US English neural voice: «Let's find the letter B!», «B is for bear.», «Where is the letter B?», «That is the letter D.». English numbers use the digits 1 2 3 and count left to right, and the card also shows the Arabic digit (٣).

A Alligator · B Bear · C Camel · D Duck · E Elephant · F Fox · G Giraffe · H Horse · I Iguana · J Jaguar · K Kangaroo · L Lion · M Monkey · N Newt · O Owl · P Peacock · Q Quail · R Rhino · S Sheep · T Tiger · U Unicorn · V Vulture · W Wolf · X Ox (the x is highlighted) · Y Yak · Z Zebra.

Letters and animals: أ أسد · ب بطة · ت تمساح · ث ثعلب · ج جمل · ح حصان · خ خروف · د دب · ذ ذئب · ر رنة · ز زرافة · س سلحفاة · ش شمبانزي · ص صقر · ض ضفدع · ط طاووس · ظ ظبي · ع عصفور · غ غزال · ف فيل · ق قرد · ك كنغر · ل لاما · م ماعز · ن نمر · ه هدهد · و وحيد القرن · ي يمامة.
Wrong-letter choices come from letters already learned plus look-alikes (ب/ت/ث, ج/ح/خ, د/ذ, ر/ز, س/ش ...).

### Parent settings
Hold the ⚙ button on the map for about one second. Options: sound effects, music, letter voice, vibration, glowing hint on the right letter, tilt steering (+ flip direction), car speed (slow/normal), unlock all levels, reset progress, and a voice test showing whether an Arabic voice is installed.

### Arabic voice
The game speaks in this order of preference:
1. **Recorded clips** in `assets/voice/<id>.mp3`. They are bundled into the app, so they work offline and sound the same on every device. This is the recommended setup for release.
2. **The device's Arabic text-to-speech**: the best Arabic voice found is chosen automatically, and parents can pick another one and set the speed in settings. If a device has **no** Arabic voice, the game stays silent rather than reading Arabic with an English voice.

**Making the voice pack**
- `npm run voice` writes `assets/voice/lines.csv`: all 384 lines (Arabic and English) (letter names, words, intros, "this is letter …", numbers, praise) with their file names.
- **Option A, neural voice (Azure Speech, licensed for apps):** `AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=uaenorth npm run voice` generates every clip. Defaults: `ar-SA-ZariyahNeural`, slightly slower for children. Change it with `AZURE_VOICE=ar-SA-HamedNeural`, `VOICE_RATE=-15%`.
- **Option B, a real voice:** record each line from `lines.csv` (e.g. with a phone) and save it as `assets/voice/<id>.mp3`. Missing clips fall back to text-to-speech, so you can record a few at a time.
- Then run `npm run build` (or `npm run sync`). Parent settings show how many recorded clips are in use.


### Free option: Microsoft neural voices (edge-tts)

On a PC with internet access:

```
pip install edge-tts
python tools/make-voice-edge.py                 # Arabic: Saudi male voice (Hamed); English: en-US-JennyNeural
python tools/make-voice-edge.py --voice ar-SA-ZariyahNeural --voice-en en-US-AnaNeural --force   # other voices
npm run build
```

The clips land in `assets/voice/` and are bundled into the game on the next build.

## What's in the mobile app

- **Landscape only, full screen** (Android immersive mode, iOS status bar hidden, notch-safe HUD).
- **Haptics** on collect, wrong letter, boost and the final celebration.
- **Tilt steering** (parent settings), re-centred when a level starts or resumes.
- **Pause on app switch / call / lock screen**, with Resume / Restart / Map.
- **Progress saved on the device** (stars per letter and number, total collected stars).
- **Automatic quality**: on a slow phone it lowers resolution, then turns off shadows.

## Prerequisites

- Node.js 22+
- **Android**: Android Studio (includes the SDK) and JDK 21
- **iOS**: a Mac with Xcode 16+ (Capacitor 8 uses Swift Package Manager, no CocoaPods needed)

## Quick start (on your computer)

```bash
npm install
npm run build          # bundles the game into www/index.html
npx cap sync           # copies www/ + plugins into android/ and ios/

npm run android        # build + sync + open Android Studio  -> press ▶ Run
npm run ios            # build + sync + open Xcode            -> pick a device/simulator, press ▶ Run
npm run android:apk    # command-line debug APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Every time you change anything in `src/` or `template.html`, run `npm run sync` again.

### Try it in a browser first

```bash
npm run build && python3 -m http.server -d www 8080     # or just open www/index.html
```
Keyboard: ← → (or A / D) steer, Esc pauses.

## Cloud builds (GitHub Actions)

Push this folder to a GitHub repository and the workflows in `.github/workflows/` run automatically:

| Workflow | Does | Output |
|---|---|---|
| `android.yml` | Builds a **debug APK** on every push / PR | Artifact `LearningKart-debug-apk`; download, copy to the phone, install (allow "install unknown apps") |
| `ios.yml` | Compiles the iOS app for the simulator (unsigned) | Artifact `LearningKart-ios-simulator`; a build check only, it cannot be installed on a real iPhone |
| `android-release.yml` | Manual: signed **AAB + APK** for Google Play | Needs the 4 keystore secrets listed at the top of the file |

You can also run any workflow by hand from the repository's **Actions** tab ("Run workflow").

## Before you publish

1. **Change the app ID** from `com.example.learningkart` to yours (e.g. `sa.com.yourcompany.learningkart`):
   - `capacitor.config.json` → `appId`
   - `android/app/build.gradle` → `namespace` and `applicationId`
   - move `android/app/src/main/java/com/example/learningkart/MainActivity.java` to the matching folder and fix its `package` line
   - `android/app/src/main/res/values/strings.xml` → `package_name`, `custom_url_scheme`
   - iOS: Xcode → target **App** → *Signing & Capabilities* → Bundle Identifier (also `PRODUCT_BUNDLE_IDENTIFIER` in `ios/App/App.xcodeproj/project.pbxproj`)
   - then `npx cap sync`
2. **Android signing**: create a keystore (`keytool -genkey -v -keystore learningkart.keystore -alias learningkart -keyalg RSA -keysize 2048 -validity 10000`), keep it safe and **never commit it**. Locally, export `KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` and run `cd android && ./gradlew bundleRelease`; in CI add them as repository secrets and run `android-release.yml`.
3. **iOS signing**: in Xcode choose your Apple Developer *Team* under Signing & Capabilities, then Product → Archive → Distribute (TestFlight / App Store).
4. Bump `versionCode` / `versionName` (`android/app/build.gradle`) and the iOS *Version / Build* for every store upload.
5. App icon / splash: edit `tools/make-assets.js` (or replace the PNGs in `assets/`), then `npm run assets`.
6. **Kids' apps**: Google Play (Families policy) and the App Store (Kids category) have extra rules. The app has no ads, accounts, analytics or network calls. The voice uses the phone's offline engine. If you want to be strict, remove `<uses-permission android:name="android.permission.INTERNET" />` from `AndroidManifest.xml` after confirming the app still runs on a device.

## Project layout

```
src/data.js            letters, animals, words, numbers, spoken lines (edit content here)
src/main.js            game flow: map, levels, pickups, gate, celebration, settings
src/world.js           zoo: road, fences, trees, habitats, kart, gate, confetti
src/animals.js         the 28 low-poly animals (built in code, no model files)
src/text.js            bundled Arabic font (Baloo Bhaijaan 2) + Arabic text drawing
src/voice.js           Arabic text-to-speech (native plugin / Web Speech)
src/audio.js           synthesized sound effects and music
src/store.js           saved progress and settings
src/platform.js        Capacitor layer (haptics, orientation lock, lifecycle) + tilt steering
template.html          HTML/CSS for menus + HUD (landscape + safe-area aware)
build.js               esbuild bundler -> www/index.html (single file)
capacitor.config.json  app name / id / webDir
android/  ios/         native projects (commit these)
assets/                icon + splash sources;  tools/make-assets.js renders them
test/                  headless Playwright checks (npm run build first)
```

Tuning: letters needed per level (`S.need` in `startLevel`), car speed (`baseSpeed()`), spacing of letter pairs (`spawnAhead`), road shape (`CP` in `src/world.js`). `npm test` runs a headless playthrough (needs Playwright) and saves screenshots to `test/shots/`.

## Notes / known limits

- The Android and iOS projects were generated and configured without compiling them (no Android SDK / Xcode in the authoring environment). The web game itself was tested in headless Chromium, including a landscape phone viewport. The first CI run is the real native build check, so please report any build error and it is usually a one-line fix.
- Tilt direction was verified with the W3C `deviceorientation` maths, not on a physical phone. Use the flip option in parent settings if it feels reversed.
- Speech quality depends on the phone's Arabic voice; test it from parent settings.
- iOS asks for motion permission the first time tilt steering is switched on.
