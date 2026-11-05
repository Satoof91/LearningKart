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
export function drawWord(g, word, x, y, px, color, hiColor, stroke) {
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

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };
const bubbleCache = new Map();
// round glossy bubble with a big glyph (letter or digit)
export function bubbleTexture(text, colorHex) {
  const key = text + colorHex;
  if (bubbleCache.has(key)) return bubbleCache.get(key);
  const t = canvasTexture(256, 256, (g, w, h) => {
    const r = 118, cx = 128, cy = 128;
    const grd = g.createRadialGradient(cx - 30, cy - 40, 10, cx, cy, r);
    grd.addColorStop(0, shade(colorHex, 1.35)); grd.addColorStop(0.7, '#' + new THREE.Color(colorHex).getHexString()); grd.addColorStop(1, shade(colorHex, 0.7));
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = 9; g.strokeStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(cx, cy, r - 5, 0, Math.PI * 2); g.stroke();
    g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const px = text.length > 1 ? 120 : 178;
    g.font = `800 ${px}px ${FONT}, sans-serif`;
    // a thinner outline keeps the dots of ب ت ث / ج ح خ separate: they are what tells these letters apart
    g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = shade(colorHex, 0.4); g.strokeText(text, cx, cy + 12);
    g.fillStyle = '#ffffff'; g.fillText(text, cx, cy + 12);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(cx - 42, cy - 62, 34, 16, -0.5, 0, Math.PI * 2); g.fill();
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
    g.font = `800 ${word ? 190 : 260}px ${FONT}, sans-serif`;
    g.fillStyle = hi; g.fillText(big, w / 2, word ? 150 : h / 2 + 18);
    if (word) drawWord(g, word, w / 2, 300, word.length > 6 ? 70 : 92, fg, hi);
  });
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
