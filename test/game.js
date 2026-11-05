// Headless playtest: title -> map -> letter level (autopilot) -> celebration -> number levels -> settings
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false });
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
  await p.waitForFunction('window.__lk.S.mode === "drive" && window.__lk.S.collected >= 1', null, { timeout: 90000 });
  await wait(1500); await p.screenshot({ path: OUT + '/4-drive.png' });
  // also hit one wrong letter on purpose to see the feedback
  await p.evaluate(() => { const L = window.__lk; const w = L.S.pickups.find(q => q.kind === 'wrong' && q.alive); if (w) L.hitPickup(w); });
  await wait(300); await p.screenshot({ path: OUT + '/5-wrong.png' });
  await p.waitForFunction('window.__lk.S.arch', null, { timeout: 120000 });
  await wait(1200); await p.screenshot({ path: OUT + '/6-gate.png' });
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 120000 });
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
  await p.waitForFunction('window.__lk.S.mode === "drive" && window.__lk.S.collected >= 2', null, { timeout: 90000 });
  await wait(600); await p.screenshot({ path: OUT + '/10-number-drive.png' });
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 120000 });
  await wait(3500); await p.screenshot({ path: OUT + '/11-number-celebrate.png' });
  // number 0
  await p.evaluate(() => window.__lk.startLevel('number', 0)); await auto();
  await p.waitForFunction('window.__lk.S.mode === "celebrate"', null, { timeout: 120000 });
  await wait(1500); await p.screenshot({ path: OUT + '/12-zero.png' });
  // pause + settings
  await p.evaluate(() => window.__lk.startLevel('letter', 9)); await auto();
  await p.waitForFunction('window.__lk.S.mode === "drive"', null, { timeout: 60000 });
  await wait(2500); await p.screenshot({ path: OUT + '/13-letter10-drive.png' });
  await p.click('#pausebtn', { force: true }); await wait(300); const paused = await p.evaluate(() => window.__lk.S.paused); await p.screenshot({ path: OUT + '/14-pause.png' });
  await p.evaluate(() => { window.__lk.toMap(); window.__lk.openSettings(); }); await wait(500); await p.screenshot({ path: OUT + '/15-settings.png' });
  console.log('paused', paused);
  console.log('errors', errs.length ? errs : 'none');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
