// Store screenshots + Play graphics, rendered from the real game (npm run build first).
//   node tools/store-shots.js            -> store/screenshots/<device>/<lang>-N-<scene>.png
//                                            store/play-icon-512.png, store/play-feature-1024x500.png
// Sizes follow the store rules: Google Play phone 16:9 and 10" tablet, Apple 6.9" iPhone and 13" iPad (landscape).
const path = require('path'), fs = require('fs');
const { chromium } = require(path.resolve('node_modules/playwright'));
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'store');
const URL = 'file://' + path.join(ROOT, 'www/index.html');
const wait = ms => new Promise(r => setTimeout(r, ms));
const DEVICES = [
  { id: 'play-phone-1920x1080', w: 960, h: 540, s: 2 },
  { id: 'play-tablet-2560x1600', w: 1280, h: 800, s: 2 },
  { id: 'apple-iphone-6.9in-2868x1320', w: 956, h: 440, s: 3 },
  { id: 'apple-ipad-13in-2752x2064', w: 1376, h: 1032, s: 2 }
];
const only = process.argv[2], mapsOnly = process.argv[3] === 'maps'; // 2nd arg 'maps': only redo the map screenshot
// // optional: a device id part (e.g. ipad), or 'graphics' for the Play icon + feature graphic only

// progress that makes the map and garage look lived-in (first letters and words done, a racer with a lion)
function seed(lang) {
  const L = window.__lk, d = L.Store.data;
  d.settings.uiLang = lang; d.settings.voice = false; d.settings.music = false; d.settings.sfx = false;
  const fill = (a, n, st) => { for (let i = 0; i < n; i++) a[i] = st[i % st.length]; };
  fill(d.letters, 9, [3, 3, 2, 3]); fill(d.enLetters, 9, [3, 2, 3]); fill(d.numbers, 6, [3]); fill(d.enNumbers, 6, [3]);
  fill(d.words, 3, [3, 2]); fill(d.enWords, 3, [3, 3, 2]);
  d.totalStars = 214; d.kart = 1; d.look = { body: 'racer', hat: 'cap', skin: 1, pilot: lang === 'en' ? 'bear' : 'lion' };
  d.full = true; L.Store.save();
}
async function shoot(p, dev, lang, n, name) {
  const dir = path.join(OUT, 'screenshots', dev.id); fs.mkdirSync(dir, { recursive: true });
  await p.screenshot({ path: path.join(dir, `${lang}-${n}-${name}.png`), timeout: 180000 });
}
// drive the kart toward the nearest wanted bubble until `cond` holds
async function autopilot(p, cond, timeout = 240000) {
  await p.evaluate(() => {
    const L = window.__lk; clearInterval(window.__ap);
    window.__ap = setInterval(() => {
      const S = L.S; let best = null, bd = 1e9;
      for (const q of S.pickups) { if (!q.alive || q.kind !== 'target') continue; const du = L.T.delta(S.u, q.u); if (du > -1 && du < bd) { bd = du; best = q; } }
      const want = best ? best.d : 0;
      L.keys.arrowleft = S.d < want - 0.8; L.keys.arrowright = S.d > want + 0.8;
    }, 30);
  });
  await p.waitForFunction(cond, null, { timeout });
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const dev of DEVICES.filter(d => !only || (only !== 'graphics' && (only === 'all' || d.id.includes(only))))) {
    for (const lang of ['en', 'ar']) {
      const ctx = await browser.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.s, hasTouch: true, locale: lang === 'en' ? 'en-US' : 'ar-SA' });
      const p = await ctx.newPage();
      p.on('pageerror', e => console.log('  pageerror', e.message));
      await p.goto(URL); await p.waitForFunction('window.__lk && window.__lk.S.mode === "title"', null, { timeout: 120000 });
      await p.evaluate(seed, lang); await p.reload();
      await p.waitForFunction('window.__lk && window.__lk.S.mode === "title"', null, { timeout: 120000 });
      const tr = lang; // the learning track follows the interface language in the screenshots
      console.log(dev.id, lang);
      if (mapsOnly) { await p.evaluate(tr => window.__lk.toMap(tr === 'en' ? 'enword' : 'word'), tr); await wait(2500); await shoot(p, dev, lang, 6, 'word-packs'); await ctx.close(); continue; }
      // 1 title
      await wait(2500); await shoot(p, dev, lang, 1, 'title');
      // 2 letter level: bubbles on the road
      await p.evaluate(tr => { const L = window.__lk; L.startLevel('letter', 9, tr); L.S.timeScale = 2; }, tr);
      await autopilot(p, 'window.__lk.S.mode === "drive" && window.__lk.S.collected >= 1');
      await p.evaluate(() => { window.__lk.S.timeScale = 1; });
      await p.waitForFunction(() => { const L = window.__lk, S = L.S; return S.pickups.some(q => q.alive && q.kind === 'target' && L.T.delta(S.u, q.u) > 22 && L.T.delta(S.u, q.u) < 34); }, null, { timeout: 120000 });
      await shoot(p, dev, lang, 2, 'letters');
      // 3 letter celebration
      await p.evaluate(() => { window.__lk.S.timeScale = 2.5; });
      await autopilot(p, 'window.__lk.S.mode === "celebrate"');
      await wait(3500); await shoot(p, dev, lang, 3, 'new-friend');
      // 4 word mode: the word fills in letter by letter
      await p.evaluate(tr => { const L = window.__lk; L.startLevel('word', tr === 'en' ? 4 : 1, tr); L.S.timeScale = 2; }, tr);
      await autopilot(p, 'window.__lk.S.mode === "drive" && window.__lk.S.collected >= 2');
      await p.evaluate(() => { window.__lk.S.timeScale = 1; });
      await p.waitForFunction(() => { const L = window.__lk, S = L.S; return S.pickups.some(q => q.alive && q.kind === 'target' && L.T.delta(S.u, q.u) > 22 && L.T.delta(S.u, q.u) < 34); }, null, { timeout: 120000 });
      await wait(400); await shoot(p, dev, lang, 4, 'words');
      // 5 counting apples
      await p.evaluate(tr => { const L = window.__lk; L.startLevel('number', 5, tr); L.S.timeScale = 2.5; }, tr);
      await autopilot(p, 'window.__lk.S.mode === "celebrate"');
      await p.evaluate(() => { window.__lk.S.timeScale = 1; });
      await p.waitForFunction('window.__lk.S.countSaid', null, { timeout: 120000 }); await wait(1200); await shoot(p, dev, lang, 5, 'counting');
      await p.evaluate(() => clearInterval(window.__ap));
      // 6 map with word packs
      await p.evaluate(tr => window.__lk.toMap(tr === 'en' ? 'enword' : 'word'), tr); await wait(2500);
      await shoot(p, dev, lang, 6, 'word-packs');
      // 7 garage
      await p.evaluate(() => window.__lk.openGarage('map')); await wait(4000);
      await shoot(p, dev, lang, 7, 'garage');
      await ctx.close();
    }
  }
  // Google Play: 512 icon and the 1024x500 feature graphic (title screen + logo text)
  if (!only || only === 'graphics') {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets/icon-only.png')).toString('base64');
    await p.setContent(`<body style="margin:0"><img src="${icon}" style="width:512px;height:512px;display:block"></body>`);
    await p.setViewportSize({ width: 512, height: 512 }); await wait(300);
    await p.screenshot({ path: path.join(OUT, 'play-icon-512.png'), clip: { x: 0, y: 0, width: 512, height: 512 } });
    const bg = path.join(OUT, 'screenshots', 'play-phone-1920x1080', 'en-4-words.png');
    const bgData = fs.existsSync(bg) ? 'data:image/png;base64,' + fs.readFileSync(bg).toString('base64') : '';
    await p.setViewportSize({ width: 1024, height: 500 });
    await p.setContent(`<body style="margin:0;width:1024px;height:500px;overflow:hidden;font-family:'Trebuchet MS',sans-serif;background:#8fd3ff">
      <div style="position:absolute;inset:0;background:url('${bgData}') center/cover"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(43,27,107,.82) 0%,rgba(43,27,107,.55) 45%,rgba(43,27,107,0) 75%)"></div>
      <img src="${icon}" style="position:absolute;left:48px;top:60px;width:150px;height:150px;border-radius:34px;box-shadow:0 8px 0 rgba(0,0,0,.25)">
      <div style="position:absolute;left:48px;top:236px;color:#fff;font-weight:900;font-size:76px;text-shadow:0 5px 0 #ff4d6d">LearningKart</div>
      <div style="position:absolute;left:52px;top:340px;color:#fff;font-weight:800;font-size:30px">ABC · أ ب ت · 123 — race, learn, read!</div>
    </body>`);
    await wait(500);
    await p.screenshot({ path: path.join(OUT, 'play-feature-1024x500.png') });
    await ctx.close();
  }
  await browser.close();
  console.log('done ->', OUT);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
