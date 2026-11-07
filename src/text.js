// Arabic font (bundled, offline) + canvas text helpers.
import * as THREE from 'three';
import ar800 from '@fontsource/baloo-bhaijaan-2/files/baloo-bhaijaan-2-arabic-800-normal.woff2';
import ar700 from '@fontsource/baloo-bhaijaan-2/files/baloo-bhaijaan-2-arabic-700-normal.woff2';
import la800 from '@fontsource/baloo-bhaijaan-2/files/baloo-bhaijaan-2-latin-800-normal.woff2';
import la700 from '@fontsource/baloo-bhaijaan-2/files/baloo-bhaijaan-2-latin-700-normal.woff2';

export const FONT = 'LKFont';
const AR_RANGE = 'U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F';
const LA_RANGE = 'U+0000-00FF, U+2000-206F';

export async function loadFonts() {
  if (!('FontFace' in window)) return;
  const defs = [[ar800, '800', AR_RANGE], [ar700, '700', AR_RANGE], [la800, '800', LA_RANGE], [la700, '700', LA_RANGE]];
  await Promise.all(defs.map(async ([url, weight, unicodeRange]) => {
    try { const f = new FontFace(FONT, `url(${url})`, { weight, unicodeRange }); await f.load(); document.fonts.add(f); } catch (e) { /* fall back to system font */ }
  }));
  // make sure both subsets are actually ready before any canvas uses them
  try { await document.fonts.load(`800 40px ${FONT}`, 'أبت 123'); await document.fonts.load(`700 40px ${FONT}`, 'أبت 123'); } catch (e) { /* ignore */ }
}

// letters that never connect to the following letter
const NON_JOIN = 'اأإآدذرزوةء ';
// Draw an Arabic word with its first letter in another color (keeps proper letter joining):
// the whole word is drawn, then the first letter (+ zero-width joiner when it connects) is drawn on top.
const LATIN = /^[ -~]+$/; // printable ASCII only
// Latin words (English track): left-to-right, the letter at hiIndex highlighted (Ox -> the x)
function drawWordLtr(g, word, x, y, px, color, hiColor, stroke, hiIndex = 0) {
  g.save();
  g.direction = 'ltr'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.font = `800 ${px}px ${FONT}, sans-serif`;
  const w = g.measureText(word).width, left = x - w / 2;
  if (stroke) { g.lineJoin = 'round'; g.lineWidth = px * 0.12; g.strokeStyle = stroke; g.strokeText(word, left, y); }
  g.fillStyle = color; g.fillText(word, left, y);
  if (hiColor) {
    const i = Math.max(0, Math.min(word.length - 1, hiIndex));
    g.fillStyle = hiColor; g.fillText(word[i], left + g.measureText(word.slice(0, i)).width, y);
  }
  g.restore();
  return w;
}
export function drawWord(g, word, x, y, px, color, hiColor, stroke, hiIndex) {
  if (LATIN.test(word)) return drawWordLtr(g, word, x, y, px, color, hiColor, stroke, hiIndex);
  g.save();
  g.direction = 'rtl'; g.textAlign = 'right'; g.textBaseline = 'middle';
  g.font = `800 ${px}px ${FONT}, sans-serif`;
  const w = g.measureText(word).width;
  const right = x + w / 2;
  if (stroke) { g.lineJoin = 'round'; g.lineWidth = px * 0.12; g.strokeStyle = stroke; g.strokeText(word, right, y); }
  g.fillStyle = color; g.fillText(word, right, y);
  if (hiColor) {
    // lam + alef is one ligature (لا): highlight both, otherwise a lone lam is drawn over the ligature
    const lamAlef = word[0] === 'ل' && 'اأإآ'.includes(word[1] || '');
    const first = lamAlef ? word.slice(0, 2) : word[0];
    const joins = !lamAlef && word.length > 1 && !NON_JOIN.includes(first) && word[1] !== ' ';
    g.fillStyle = hiColor; g.fillText(joins ? first + '‍' : first, right, y);
  }
  g.restore();
  return w;
}

// Word mode HUD: the whole word as a pale outline, the first n letters in colour on top.
// Arabic keeps its joined shapes: the coloured prefix ends with a zero-width joiner when its last
// letter connects to the next one, so it lines up exactly with the outline drawn underneath.
export function drawWordProgress(g, word, n, x, y, px, ghost, color) {
  g.save();
  g.font = `800 ${px}px ${FONT}, sans-serif`; g.textBaseline = 'middle';
  const latin = LATIN.test(word);
  g.direction = latin ? 'ltr' : 'rtl'; g.textAlign = latin ? 'left' : 'right';
  const w = g.measureText(word).width, at = latin ? x - w / 2 : x + w / 2;
  g.lineJoin = 'round'; g.lineWidth = px * 0.1; g.strokeStyle = 'rgba(43,27,107,.18)'; g.strokeText(word, at, y);
  g.fillStyle = ghost; g.fillText(word, at, y);
  if (n > 0) {
    let pre = word.slice(0, n);
    if (!latin && n < word.length && !NON_JOIN.includes(word[n - 1])) pre += '‍';
    g.fillStyle = color; g.fillText(pre, at, y);
  }
  g.restore();
  return w;
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}


// A letter with one haraka, drawn to fit a box of `box` px centred on (cx, cy): the letter from the font,
// the mark drawn by hand and large (fatha / kasra: a thick slanted stroke above / below the letter's ink,
// damma: a small و above). Every part gets an outline so it reads on any background.
const MARK = { '\u064E': 'fa', '\u0650': 'ki', '\u064F': 'da' };
export function drawSyllable(g, text, cx, cy, box, fill, stroke, markColor) {
  const bare = text.replace(/[\u064B-\u0652]/g, ''), kind = MARK[text.slice(bare.length)] || 'fa';
  g.save();
  g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  // size the letter so letter + mark fit the box (tall letters like أ إ ل ط ك get a smaller font)
  let px = box * 0.82, m, h, mk;
  for (let k = 0; k < 12; k++) {
    g.font = `800 ${px}px ${FONT}, sans-serif`;
    m = g.measureText(bare); mk = px * 0.3;
    h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + mk + px * 0.06;
    if (h <= box * 0.86 && m.width <= box * 0.8) break;
    px *= 0.92;
  }
  const inkTop = -m.actualBoundingBoxAscent, inkBot = m.actualBoundingBoxDescent, gap = px * 0.06;
  // vertical layout (baseline at 0): the mark sits above (fatha, damma) or below (kasra) the ink
  const top = kind === 'ki' ? inkTop : inkTop - gap - mk, bot = kind === 'ki' ? inkBot + gap + mk : inkBot;
  const base = cy - (top + bot) / 2; // baseline y that centres the whole syllable
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.lineWidth = px * 0.075; g.strokeStyle = stroke; g.strokeText(bare, cx, base);
  g.fillStyle = fill; g.fillText(bare, cx, base);
  // the mark
  const mx = cx, L = mk * 1.05, T = mk * 0.34;
  const my = kind === 'ki' ? base + inkBot + gap + mk / 2 : base + inkTop - gap - mk / 2;
  const halo = Math.max(6, px * 0.07);
  if (kind === 'da') {
    g.font = `800 ${mk * 1.9}px ${FONT}, sans-serif`; g.textBaseline = 'middle';
    g.lineWidth = halo; g.strokeStyle = '#ffffff'; g.strokeText('\u0648', mx, my + mk * 0.08);
    g.lineWidth = halo * 0.45; g.strokeStyle = stroke; g.strokeText('\u0648', mx, my + mk * 0.08);
    g.fillStyle = markColor; g.fillText('\u0648', mx, my + mk * 0.08);
  } else {
    // a short stroke rising to the right, like a written fatha / kasra
    const dx = L / 2 * Math.cos(0.42), dy = L / 2 * Math.sin(0.42);
    const line = (w, c) => { g.lineWidth = w; g.strokeStyle = c; g.beginPath(); g.moveTo(mx - dx, my + dy); g.lineTo(mx + dx, my - dy); g.stroke(); };
    line(T + halo * 1.1, '#ffffff'); line(T + halo * 0.45, stroke); line(T, markColor);
  }
  g.restore();
}

// the same syllable as an image for the HTML (chip, slots, intro card, map): cached data URLs
const sylCache = new Map();
export function syllableURL(text, markColor = '#ffffff', fill = '#ffffff', stroke = '#2b1b6b') {
  const key = text + markColor + fill + stroke;
  if (!sylCache.has(key)) {
    const c = document.createElement('canvas'); c.width = c.height = 200;
    drawSyllable(c.getContext('2d'), text, 100, 100, 196, fill, stroke, markColor);
    sylCache.set(key, c.toDataURL('image/png'));
  }
  return sylCache.get(key);
}
const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };
const bubbleCache = new Map();
// round glossy bubble with a big glyph (letter or digit)
// markColor (harakat mode): the vowel mark is painted in that colour, the letter stays white
export function bubbleTexture(text, colorHex, markColor) {
  const key = text + colorHex + (markColor || '');
  if (bubbleCache.has(key)) return bubbleCache.get(key);
  const t = canvasTexture(256, 256, (g, w, h) => {
    const r = 118, cx = 128, cy = 128;
    const grd = g.createRadialGradient(cx - 30, cy - 40, 10, cx, cy, r);
    grd.addColorStop(0, shade(colorHex, 1.35)); grd.addColorStop(0.7, '#' + new THREE.Color(colorHex).getHexString()); grd.addColorStop(1, shade(colorHex, 0.7));
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = 9; g.strokeStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(cx, cy, r - 5, 0, Math.PI * 2); g.stroke();
    const bare = text.replace(/[\u064B-\u0652]/g, ''), marked = bare !== text;
    if (marked) {
      // harakat: big hand-drawn marks (font marks are too small to read on a moving bubble)
      drawSyllable(g, text, cx, cy, 196, '#ffffff', shade(colorHex, 0.4), markColor || '#ffffff');
    } else {
      g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const px = bare.length > 1 ? 120 : 178;
      g.font = `800 ${px}px ${FONT}, sans-serif`;
      // a thinner outline keeps the dots of ب ت ث / ج ح خ separate: they are what tells these letters apart
      g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = shade(colorHex, 0.4); g.strokeText(text, cx, cy + 12);
      g.fillStyle = '#ffffff'; g.fillText(text, cx, cy + 12);
    }
    // gloss: smaller and further out on marked letters so it never sits on a mark
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath();
    if (marked) g.ellipse(cx - 78, cy - 52, 18, 9, -0.7, 0, Math.PI * 2); else g.ellipse(cx - 42, cy - 62, 34, 16, -0.5, 0, Math.PI * 2);
    g.fill();
  });
  bubbleCache.set(key, t);
  return t;
}

// rounded sign board: big glyph on top, word under it (first letter highlighted)
export function signTexture(big, word, bg = '#ffffff', fg = '#3a2a7a', hi = '#ff4d6d') {
  return canvasTexture(512, 384, (g, w, h) => {
    g.fillStyle = bg; roundRect(g, 8, 8, w - 16, h - 16, 48); g.fill();
    g.lineWidth = 14; g.strokeStyle = hi; roundRect(g, 14, 14, w - 28, h - 28, 42); g.stroke();
    g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    // shrink long text (a whole word on the gate) until it fits the board
    let px = word ? 190 : 260; g.font = `800 ${px}px ${FONT}, sans-serif`;
    while (px > 60 && g.measureText(big).width > w - 70) { px -= 10; g.font = `800 ${px}px ${FONT}, sans-serif`; }
    g.fillStyle = hi; g.fillText(big, w / 2, word ? 150 : h / 2 + 18);
    if (word) { const k = LATIN.test(word) ? Math.max(0, word.toUpperCase().indexOf(big)) : 0; drawWord(g, word, w / 2, 300, word.length > 6 ? 70 : 92, fg, hi, null, k); }
  });
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
