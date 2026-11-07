# Beta release: Google Play internal testing + Apple TestFlight

App ID on both stores: **`com.satoof.learningkart`**. It is permanent once uploaded.
In-app product: **`full_game`**, non-consumable, US $1.99.
Texts, categories and privacy answers are in [STORE-LISTING.md](STORE-LISTING.md).

## 0. Before you start
- [ ] Google Play Console developer account (one-time $25).
- [ ] Apple Developer Program membership ($99/year) and a Mac with Xcode 16 or later.
- [ ] Graphics: run `npm run build`, then `node tools/store-shots.js`. Output goes to `store/`.

## 1. Privacy policy page (both stores require one)
1. Open `docs/privacy.html` and replace `SUPPORT_EMAIL` with the support address you want to publish (it appears twice).
2. Push. In GitHub, go to **Settings → Pages → Deploy from a branch → `main` / `/docs`**.
3. The URL becomes `https://sites.google.com/view/learningkart`. Open it once to check.

## 2. Android: Google Play internal testing
### 2a. Upload key (one time)
```bash
keytool -genkeypair -v -keystore learningkart-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```
Keep the file and both passwords safe and out of git. Add four repository secrets in GitHub (**Settings → Secrets and variables → Actions**):
- `ANDROID_KEYSTORE_BASE64`: the output of `base64 -w0 learningkart-upload.jks`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`: `upload`
- `ANDROID_KEY_PASSWORD`

### 2b. Build
In GitHub, go to **Actions → "Android release (signed AAB + APK)" → Run workflow**. The build number is the run number, so every run can be uploaded. Download the **LearningKart-release** artifact and take the `.aab` from it.

### 2c. Play Console
1. **Create app:** name "LearningKart", default language, App, Free. Accept the declarations.
2. **Testing → Internal testing → Create release.** Accept Play App Signing and upload the `.aab`. Add testers (an email list) and save. Uploading a build turns on the in-app products section.
3. **Monetize → Products → In-app products → Create product.** Product ID `full_game`, name "Full game", price $1.99. Activate it.
4. **Monetize → Monetization setup:** set up a payments profile. It's needed before testers can buy.
5. **Setup → License testing:** add the testers' Google accounts. Their purchases are free test purchases.
6. Fill in **App content**:
   - privacy policy URL (step 1)
   - Ads: **No**
   - App access: all features available; the parent gate asks to tap the number words
   - Content rating questionnaire
   - Target audience: **5 and under, 6–8**. Answer "Designed for Families": yes.
   - Data safety: **no data collected or shared**
   - Government apps: no
7. **Main store listing:** short and full description, the 512 icon, the feature graphic, phone and tablet screenshots (the tablet folder covers both 7-inch and 10-inch).
8. Send the release to review. Internal testing is usually live within minutes to a few hours. Testers open the opt-in link from the Internal testing page.

## 3. iOS: TestFlight
Run this part on a Mac. `npm ci && npm run build && npx cap sync ios && npx cap open ios`.
1. In Xcode, select the **App** target → **Signing & Capabilities**. Choose your Team; the bundle ID is already `com.satoof.learningkart`. Click **+ Capability → In-App Purchase**.
2. In **General**, set Version `1.0.0` and Build `1`. Raise the Build number for every upload.
3. In [App Store Connect](https://appstoreconnect.apple.com), go to **Apps → + → New App**: iOS, name, primary language, bundle ID `com.satoof.learningkart`, SKU `learningkart`.
4. Go to **Business → Agreements:** accept the **Paid Apps** agreement and add bank and tax details. Without them the purchase never loads; the button then shows "Could not reach the store".
5. Go to **Your app → Monetization → In-App Purchases → +**: type **Non-Consumable**, reference name "Full game", Product ID `full_game`, price $1.99. Add the display name and description in English and Arabic, plus a review screenshot of the unlock screen (`en-6-word-packs.png` or a photo of the paywall).
6. In **App Privacy**, choose **Data Not Collected** and add the privacy policy URL.
7. In **Age rating**, choose 4+ and **Made for Kids → 5 and under** (or 6–8).
8. In Xcode, choose **Product → Archive → Distribute App → App Store Connect → Upload**.
9. In **TestFlight**, the build appears after processing (10–30 minutes). Answer the export-compliance question; `ITSAppUsesNonExemptEncryption` is already `false`. Add **internal testers** (up to 100 people on your team, no review) or an **external group** (needs a short beta review).
10. Purchases in TestFlight use the sandbox and are free. The first in-app purchase must go to App Review together with an app version before it can be sold publicly. For TestFlight testing it already works once its status is "Ready to Submit".

## 4. What testers should try
- Letters (Arabic and English), numbers, the first 5 animal words, and the garage, all without paying.
- Tap a word with a gold ★ lock, or a pack with 🔒. The unlock screen opens; **Unlock all** first asks the parent question.
- Buy with a test account. Every word pack should open at once.
- Reinstall the app, then use **Restore purchase**. Everything should open again.
- Interface language switch (ع / EN), pause, Android back button, airplane mode (it plays offline).

## 5. Known limits for this beta
- The app ID change means an app installed from an earlier build has to be uninstalled first.
- The `index.html` bundle is about 11 MB because of the inlined voice clips, so cold start is slower on old phones.
- Tablets on Android 16 may let the app rotate to portrait, because Android ignores the orientation lock on large screens. Check it on a tablet.
