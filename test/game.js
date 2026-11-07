// Headless playtest: title -> map -> letter level (autopilot) -> celebration -> number levels -> settings
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false, locale: 'ar-SA' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../www/index.html'));
  await p.waitForFunction('window.__lk && window.__lk.S.mode === "title"', null, { timeout: 60000 });
  await wait(1500); await p.screenshot({ path: OUT + '/1-title.png' });
  await p.click('#play', { force: true }); await wait(800); await p.screenshot({ path: OUT + '/2-map.png' });
  await p.click('.node.current', { force: true }); await wait(1200); await p.screenshot({ path: OUT + '/3-intro.png' });
  // autopilot: steer toward the nearest target bubble ahead
  const auto = () => p.evaluate(() => {
    const L = window.__lk; L.S.timeScale = 2.5; L.S.noAdapt = true;
    clearInterval(window.__ap);
    window.__ap = setInterval(() => {
      const S = L.S; let best = null, bd = 1e9;
      for (const q of S.pickups) { if (!q.alive || !['target', 'apple'].includes(q.kind)) continue; const du = L.T.delta(S.u, q.u); if (du > -1 && du < bd) { bd = du; best = q; } }
      const want = best ? best.d : 0;
      L.keys.arrowleft = S.d < want - 0.8; L.keys.arrowright = S.d > want + 0.8;
    }, 30);
  });
  await auto();
  await p.waitForFunction('window.__lk.S.mode === "drive" && window.__lk.S.collected >= 1', null, { timeout: 600000 });
  await wait(1500); await p.screenshot({ path: OUT + '/4-drive.png' });
  // also hit one wrong letter on purpose to see the feedback
  await p.evaluate(() => { const L = window.__lk; const w = L.S.pickups.find(q => q.kind === 'wrong' && q.alive); if (w) L.hitPickup(w); });
  await wait(300); await p.screenshot({ path: OUT + '/5-wrong.png' });
  await p.waitForFunction('window.__lk.S.arch', null, { timeout: 600000 });
  await wait(1200); await p.screenshot({ path: OUT + '/6-gate.png' });
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 600000 });
  await wait(2500); await p.screenshot({ path: OUT + '/7-celebrate.png' });
  const prog = await p.evaluate(() => ({ letters: window.__lk.Store.data.letters.slice(0, 3), stars: window.__lk.Store.data.totalStars, wrong: window.__lk.S.wrong }));
  console.log('progress', JSON.stringify(prog));
  // next level button -> letter 2 intro
  await p.click('#cnext', { force: true }); await wait(1500); await p.screenshot({ path: OUT + '/8-next-intro.png' });
  // map with a finished node
  await p.evaluate(() => window.__lk.toMap()); await wait(1500); await p.screenshot({ path: OUT + '/9-map-progress.png' });
  // number level 3
  await p.evaluate(() => { window.__lk.Store.data.unlockAll = true; window.__lk.startLevel('number', 3); });
  await auto();
  await p.waitForFunction('window.__lk.S.mode === "drive" && window.__lk.S.collected >= 2', null, { timeout: 600000 });
  await wait(600); await p.screenshot({ path: OUT + '/10-number-drive.png' });
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 600000 });
  await wait(3500); await p.screenshot({ path: OUT + '/11-number-celebrate.png' });
  // number 0
  await p.evaluate(() => window.__lk.startLevel('number', 0)); await auto();
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 600000 });
  await wait(1500); await p.screenshot({ path: OUT + '/12-zero.png' });
  // pause + settings
  await p.evaluate(() => window.__lk.startLevel('letter', 9)); await auto();
  await p.waitForFunction('window.__lk.S.mode === "drive"', null, { timeout: 60000 });
  await wait(2500); await p.screenshot({ path: OUT + '/13-letter10-drive.png' });
  await p.click('#pausebtn', { force: true }); await wait(300); const paused = await p.evaluate(() => window.__lk.S.paused); await p.screenshot({ path: OUT + '/14-pause.png' });
  await p.evaluate(() => { window.__lk.toMap(); window.__lk.openSettings(); }); await wait(500); await p.screenshot({ path: OUT + '/15-settings.png' });
  await p.evaluate(() => { document.getElementById('settings').classList.add('hidden'); window.__lk.openGate(); }); await wait(400); await p.screenshot({ path: OUT + '/16-parent-gate.png' });
  await p.evaluate(() => document.getElementById('pgate').classList.add('hidden'));
  // a child who never steers must not get 3 stars
  await p.evaluate(() => { clearInterval(window.__ap); const L = window.__lk; for (const k in L.keys) L.keys[k] = false; L.startLevel('letter', 4, 'ar'); L.S.timeScale = 4; L.S.noAdapt = true; });
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 600000 });
  const passive = await p.evaluate(() => ({ stars: window.__lk.Store.data.letters[4], misses: window.__lk.S.misses, assisted: window.__lk.S.assisted }));
  console.log('passive child', JSON.stringify(passive), passive.stars <= 1 ? 'OK' : 'TOO MANY STARS');
  // English track: letter A, number 3, and the ABC map with every animal (shows all new animals)
  await p.evaluate(() => { window.__lk.startLevel('letter', 0, 'en'); }); await auto();
  await wait(1200); await p.screenshot({ path: OUT + '/17-en-intro.png' });
  await p.waitForFunction('window.__lk.S.mode === "drive" && window.__lk.S.collected >= 1', null, { timeout: 600000 });
  await wait(800); await p.screenshot({ path: OUT + '/18-en-drive.png' });
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 600000 });
  await wait(2500); await p.screenshot({ path: OUT + '/19-en-celebrate.png' });
  const enProg = await p.evaluate(() => window.__lk.Store.prog('letter', 'en').slice(0, 2));
  console.log('english progress', JSON.stringify(enProg));
  await p.evaluate(() => window.__lk.startLevel('number', 3, 'en')); await auto();
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 600000 });
  await wait(4500); await p.screenshot({ path: OUT + '/20-en-number.png' });
  await p.evaluate(() => { clearInterval(window.__ap); const L = window.__lk; L.Store.prog('letter', 'en').fill(3); L.toMap('enletter'); });
  for (const [i, x] of [[0, 0], [1, 0.5], [2, 1]]) {
    await p.evaluate(x => { const el = document.getElementById('path'); el.scrollLeft = (el.scrollWidth - el.clientWidth) * x; }, x);
    await wait(2500); await p.screenshot({ path: OUT + `/21-en-map-${i}.png` });
  }
  // word mode: build «دب» (Arabic) and "HEN" (English) with the autopilot
  for (const [lang, tag] of [['ar', 'ar'], ['en', 'en']]) {
    await p.evaluate(lang => { window.__lk.Store.data.unlockAll = true; window.__lk.startLevel('word', 0, lang); }, lang); await auto();
    await p.waitForFunction('window.__lk.S.mode === "drive" && window.__lk.S.collected >= 1', null, { timeout: 600000 });
    await wait(900); await p.screenshot({ path: OUT + `/28-word-${tag}-drive.png` });
    await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 600000 });
    await wait(2500); await p.screenshot({ path: OUT + `/29-word-${tag}-card.png` });
    console.log('word', tag, 'stars', await p.evaluate(lang => window.__lk.Store.prog('word', lang)[0], lang));
  }
  // harakat mode: read أ with fatha / kasra / damma (6 syllables), stars go to the harakat array only
  {
    const before = await p.evaluate(() => JSON.stringify(window.__lk.Store.data.numbers));
    await p.evaluate(() => { const L = window.__lk; L.Store.data.letters[0] = Math.max(1, L.Store.data.letters[0]); L.startLevel('haraka', 0, 'ar'); }); await auto();
    await p.waitForFunction('window.__lk.S.mode === "drive" && window.__lk.S.collected >= 1', null, { timeout: 600000 });
    await wait(900); await p.screenshot({ path: OUT + '/34-haraka-drive.png' });
    await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 600000 });
    await wait(2500); await p.screenshot({ path: OUT + '/35-haraka-card.png' });
    const h = await p.evaluate(() => { const L = window.__lk, d = L.Store.data; return { star: d.harakat[0], need: L.S.need, numbers: JSON.stringify(d.numbers) }; });
    console.log('haraka stars', h.star, h.need === 6 ? 'OK' : 'need=' + h.need, h.numbers === before ? 'numbers untouched' : 'NUMBERS CHANGED');
    // first 5 harakat letters are free, the 6th needs the full game
    console.log('haraka free', await p.evaluate(() => { const P = window.__lk.Purchase; return [P.isFree('haraka', 4), P.isFree('haraka', 5)].join(','); }));
  }
  // garage: a level that crosses a star threshold announces the gift; then customise and drive with a co-pilot
  await p.evaluate(() => { const L = window.__lk, d = L.Store.data; for (const k of ['letters', 'numbers', 'enLetters', 'enNumbers', 'words', 'enWords', 'harakat']) d[k].fill(0); d.letters[0] = 1; d.letters[1] = 1; L.startLevel('letter', 2, 'ar'); }); await auto();
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 600000 });
  await wait(1500);
  console.log('gift text', await p.evaluate(() => document.getElementById('friend').textContent));
  await p.evaluate(() => { clearInterval(window.__ap); const d = window.__lk.Store.data; d.letters.fill(1, 0, 12); d.enLetters.fill(1, 0, 6); window.__lk.toTitle(); });
  await wait(800); await p.click('#garagebtn', { force: true }); await wait(1500);
  const pickItem = async (tab, n) => { await p.click(`.gtab:nth-child(${tab})`, { force: true }); await wait(200); await p.click(`.gitem:nth-child(${n})`, { force: true }); await wait(250); };
  await pickItem(1, 2); await pickItem(3, 4); await pickItem(2, 6); await pickItem(5, 2);
  await wait(1500); await p.screenshot({ path: OUT + '/30-garage.png' });
  await p.click('.gtab:nth-child(3)', { force: true }); await wait(1500); await p.screenshot({ path: OUT + '/31-garage-hats.png' });
  const look = await p.evaluate(() => ({ look: window.__lk.Store.data.look, color: window.__lk.Store.data.kart, stars: window.__lk.Store.learnStars() }));
  console.log('garage look', JSON.stringify(look));
  await p.click('#gclose', { force: true }); await wait(500);
  await p.evaluate(() => window.__lk.startLevel('letter', 3, 'ar')); await auto();
  await p.waitForFunction('window.__lk.S.mode === "drive" && window.__lk.S.collected >= 1', null, { timeout: 600000 });
  await wait(500); await p.screenshot({ path: OUT + '/32-drive-copilot.png' });
  await p.evaluate(() => clearInterval(window.__ap));
  // English interface: switch with the map's language button, then check map, intro (banner), pause, gate, settings, title
  await p.evaluate(() => { const L = window.__lk; L.Store.prog('letter', 'en').fill(0); L.toMap('letter'); });
  await wait(800); await p.click('#map .langbtn', { force: true }); await wait(1500);
  await p.screenshot({ path: OUT + '/22-ui-en-map.png' });
  const ui = await p.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, tab: document.querySelector('.tab.on').dataset.tab, saved: window.__lk.Store.data.settings.uiLang }));
  console.log('english ui', JSON.stringify(ui));
  await p.evaluate(() => window.__lk.startLevel('letter', 1, 'ar')); await wait(1500); await p.screenshot({ path: OUT + '/23-ui-en-intro.png' });
  await p.click('#pausebtn', { force: true }); await wait(400); await p.screenshot({ path: OUT + '/24-ui-en-pause.png' });
  await p.evaluate(() => { window.__lk.toMap(); window.__lk.openGate(); }); await wait(400); await p.screenshot({ path: OUT + '/25-ui-en-gate.png' });
  await p.evaluate(() => { document.getElementById('pgate').classList.add('hidden'); window.__lk.openSettings(); }); await wait(500); await p.screenshot({ path: OUT + '/26-ui-en-settings.png' });
  await p.evaluate(() => { document.getElementById('settings').classList.add('hidden'); window.__lk.toTitle(); }); await wait(1500); await p.screenshot({ path: OUT + '/27-ui-en-title.png' });
  await p.click('#tlang', { force: true }); await wait(300);
  console.log('back to arabic', await p.evaluate(() => document.documentElement.dir));
  console.log('paused', paused);
  console.log('errors', errs.length ? errs : 'none');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
