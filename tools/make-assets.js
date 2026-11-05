// Renders assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png
// Run with: node tools/make-assets.js   (needs playwright + chromium)   then: npm run assets
const { chromium } = require('playwright');
const fs = require('fs');
fs.mkdirSync('assets', { recursive: true });

const kart = (s = 1) => `
<g transform="scale(${s})">
  <ellipse cx="0" cy="235" rx="270" ry="42" fill="rgba(0,0,0,.28)"/>
  <rect x="-262" y="70" width="96" height="170" rx="26" fill="#1d1d1d"/><rect x="-236" y="110" width="44" height="22" rx="8" fill="#ddd"/>
  <rect x="166" y="70" width="96" height="170" rx="26" fill="#1d1d1d"/><rect x="192" y="110" width="44" height="22" rx="8" fill="#ddd"/>
  <rect x="-205" y="95" width="410" height="135" rx="34" fill="#3da5ff"/>
  <rect x="-205" y="95" width="410" height="40" rx="20" fill="#7cc3ff"/>
  <rect x="-175" y="196" width="350" height="40" rx="16" fill="#2b2d42"/>
  <rect x="-85" y="-10" width="170" height="130" rx="28" fill="#fff"/>
  <circle cx="0" cy="-115" r="112" fill="#3da5ff"/>
  <rect x="-15" y="-226" width="30" height="104" rx="12" fill="#fff"/>
  <rect x="-32" y="-5" width="64" height="26" rx="12" fill="#ffd6a5"/>
  <rect x="-158" y="28" width="28" height="86" fill="#2b2d42"/><rect x="130" y="28" width="28" height="86" fill="#2b2d42"/>
  <rect x="-240" y="-22" width="480" height="62" rx="18" fill="#ff4d4d"/>
  <rect x="-240" y="-22" width="480" height="20" rx="10" fill="#ff8a8a"/>
</g>`;

const scene = `
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4db8ff"/><stop offset="1" stop-color="#d5f1ff"/></linearGradient></defs>
<rect width="1024" height="1024" fill="url(#sky)"/>
<circle cx="800" cy="210" r="90" fill="#fff3a0"/>
<polygon points="-40,540 220,250 480,540" fill="#5fb24f"/><polygon points="300,540 600,200 900,540" fill="#4fa043"/><polygon points="130,300 220,250 310,300 220,320" fill="#fff" opacity=".9"/>
<rect y="520" width="1024" height="504" fill="#79cf58"/>
<polygon points="440,520 584,520 1010,1024 14,1024" fill="#e8e8e8"/>
<polygon points="452,520 572,520 960,1024 64,1024" fill="#4b5060"/>
<polygon points="494,540 530,540 560,640 464,640" fill="#fff" opacity=".9"/><polygon points="470,680 554,680 600,820 424,820" fill="#fff" opacity=".9"/>
<polygon points="440,520 452,520 64,1024 14,1024" fill="#ff4d4d"/><polygon points="572,520 584,520 1010,1024 960,1024" fill="#ff4d4d"/>`;

const svg = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${inner}</svg>`;
const pages = {
  'icon-only': svg(scene + `<g transform="translate(512 600)">${kart(0.95)}</g>`),
  'icon-foreground': svg(`<g transform="translate(512 560)">${kart(0.78)}</g>`),
  'icon-background': svg(scene),
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  for (const [name, s] of Object.entries(pages)) {
    await p.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`);
    await p.screenshot({ path: `assets/${name}.png`, omitBackground: name === 'icon-foreground' });
  }
  // splash 2732x2732
  const big = await b.newPage({ viewport: { width: 2732, height: 2732 }, deviceScaleFactor: 1 });
  for (const dark of [false, true]) {
    await big.setContent(`<html><body style="margin:0;width:2732px;height:2732px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:90px;background:${dark ? 'radial-gradient(circle,#2b6aa8,#12304f)' : 'radial-gradient(circle,#bfe8ff,#5db7f5)'};font-family:'Trebuchet MS','DejaVu Sans',Arial,sans-serif">
      <div style="width:860px;height:860px;border-radius:190px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.35)">${pages['icon-only'].replace('width="1024" height="1024"', 'width="860" height="860"')}</div>
      <div style="font-size:230px;font-weight:900;color:#fff;letter-spacing:4px;text-shadow:0 14px 0 #d62828,0 30px 50px rgba(0,0,0,.35)">Learning<span style="color:#ffd23f">Kart</span></div>
    </body></html>`);
    await big.screenshot({ path: dark ? 'assets/splash-dark.png' : 'assets/splash.png' });
  }
  await b.close();
  console.log('assets written:', fs.readdirSync('assets').join(', '));
})();
