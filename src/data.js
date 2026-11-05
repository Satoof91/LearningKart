// Learning content: 28 Arabic letters (each with a zoo animal) and numbers 0-10.
// `name` / `say` carry harakat so the device text-to-speech pronounces them correctly;
// `word` is what is shown on screen (no harakat, easier to read for small children).

export const LETTERS = [
  { ch: 'أ', name: 'أَلِف', word: 'أسد', say: 'أَسَد', animal: 'lion', biome: 'savanna' },
  { ch: 'ب', name: 'بَاء', word: 'بطة', say: 'بَطَّة', animal: 'duck', biome: 'pond' },
  { ch: 'ت', name: 'تَاء', word: 'تمساح', say: 'تِمْسَاح', animal: 'crocodile', biome: 'pond' },
  { ch: 'ث', name: 'ثَاء', word: 'ثعلب', say: 'ثَعْلَب', animal: 'fox', biome: 'forest' },
  { ch: 'ج', name: 'جِيم', word: 'جمل', say: 'جَمَل', animal: 'camel', biome: 'desert' },
  { ch: 'ح', name: 'حَاء', word: 'حصان', say: 'حِصَان', animal: 'horse', biome: 'farm' },
  { ch: 'خ', name: 'خَاء', word: 'خروف', say: 'خَرُوف', animal: 'sheep', biome: 'farm' },
  { ch: 'د', name: 'دَال', word: 'دب', say: 'دُبّ', animal: 'bear', biome: 'forest' },
  { ch: 'ذ', name: 'ذَال', word: 'ذئب', say: 'ذِئْب', animal: 'wolf', biome: 'forest' },
  { ch: 'ر', name: 'رَاء', word: 'رنة', say: 'رَنَّة', animal: 'reindeer', biome: 'snow' },
  { ch: 'ز', name: 'زَاي', word: 'زرافة', say: 'زَرَافَة', animal: 'giraffe', biome: 'savanna' },
  { ch: 'س', name: 'سِين', word: 'سلحفاة', say: 'سُلَحْفَاة', animal: 'turtle', biome: 'pond' },
  { ch: 'ش', name: 'شِين', word: 'شمبانزي', say: 'شِمْبَانْزِي', animal: 'chimp', biome: 'jungle' },
  { ch: 'ص', name: 'صَاد', word: 'صقر', say: 'صَقْر', animal: 'falcon', biome: 'desert' },
  { ch: 'ض', name: 'ضَاد', word: 'ضفدع', say: 'ضِفْدَع', animal: 'frog', biome: 'pond' },
  { ch: 'ط', name: 'طَاء', word: 'طاووس', say: 'طَاوُوس', animal: 'peacock', biome: 'garden' },
  { ch: 'ظ', name: 'ظَاء', word: 'ظبي', say: 'ظَبْي', animal: 'deer', biome: 'forest' },
  { ch: 'ع', name: 'عَيْن', word: 'عصفور', say: 'عُصْفُور', animal: 'sparrow', biome: 'garden' },
  { ch: 'غ', name: 'غَيْن', word: 'غزال', say: 'غَزَال', animal: 'gazelle', biome: 'savanna' },
  { ch: 'ف', name: 'فَاء', word: 'فيل', say: 'فِيل', animal: 'elephant', biome: 'savanna' },
  { ch: 'ق', name: 'قَاف', word: 'قرد', say: 'قِرْد', animal: 'monkey', biome: 'jungle' },
  { ch: 'ك', name: 'كَاف', word: 'كنغر', say: 'كَنْغَر', animal: 'kangaroo', biome: 'desert' },
  { ch: 'ل', name: 'لَام', word: 'لاما', say: 'لَامَا', animal: 'llama', biome: 'mountain' },
  { ch: 'م', name: 'مِيم', word: 'ماعز', say: 'مَاعِز', animal: 'goat', biome: 'mountain' },
  { ch: 'ن', name: 'نُون', word: 'نمر', say: 'نَمِر', animal: 'tiger', biome: 'jungle' },
  { ch: 'ه', name: 'هَاء', word: 'هدهد', say: 'هُدْهُد', animal: 'hoopoe', biome: 'garden' },
  { ch: 'و', name: 'وَاو', word: 'وحيد القرن', say: 'وَحِيدُ القَرْن', animal: 'rhino', biome: 'savanna' },
  { ch: 'ي', name: 'يَاء', word: 'يمامة', say: 'يَمَامَة', animal: 'dove', biome: 'garden' }
];

const AR = '٠١٢٣٤٥٦٧٨٩';
export const arDigits = n => String(n).split('').map(d => AR[+d]).join('');

export const NUMBERS = [
  { n: 0, word: 'صفر', say: 'صِفْر' },
  { n: 1, word: 'واحد', say: 'وَاحِد' },
  { n: 2, word: 'اثنان', say: 'اثْنَان' },
  { n: 3, word: 'ثلاثة', say: 'ثَلَاثَة' },
  { n: 4, word: 'أربعة', say: 'أَرْبَعَة' },
  { n: 5, word: 'خمسة', say: 'خَمْسَة' },
  { n: 6, word: 'ستة', say: 'سِتَّة' },
  { n: 7, word: 'سبعة', say: 'سَبْعَة' },
  { n: 8, word: 'ثمانية', say: 'ثَمَانِيَة' },
  { n: 9, word: 'تسعة', say: 'تِسْعَة' },
  { n: 10, word: 'عشرة', say: 'عَشَرَة' }
].map(o => Object.assign(o, { digit: arDigits(o.n), biome: 'orchard' }));

export const PRAISE = ['أَحْسَنْت!', 'رَائِع!', 'مُمْتَاز!', 'بَطَل!', 'شَاطِر!', 'عَظِيم!'];
export const PRAISE_SHOW = ['أحسنت!', 'رائع!', 'ممتاز!', 'بطل!', 'شاطر!', 'عظيم!'];

export const LINES = {
  letterIntro: L => `هَيَّا نَجْمَعُ حَرْفَ ${L.name}`,
  wrong: L => `هَذَا حَرْفُ ${L.name}`,
  numberIntro: N => N.n === 0 ? 'صِفْر يَعْنِي لَا شَيْء' : `هَيَّا نَعُدُّ إِلَى ${N.say}`,
  gate: 'رَائِع! اذْهَبْ إِلَى البَوَّابَة',
  newFriend: 'صَدِيقٌ جَدِيدٌ فِي حَدِيقَتِك!'
};

// Letters the child sees as wrong choices: mostly letters already learned (review), plus near look-alikes.
const LOOKALIKE = { 'ب': 'تث', 'ت': 'بث', 'ث': 'بت', 'ج': 'حخ', 'ح': 'جخ', 'خ': 'جح', 'د': 'ذ', 'ذ': 'د', 'ر': 'ز', 'ز': 'ر', 'س': 'ش', 'ش': 'س', 'ص': 'ض', 'ض': 'ص', 'ط': 'ظ', 'ظ': 'ط', 'ع': 'غ', 'غ': 'ع', 'ف': 'ق', 'ق': 'ف' };
export function distractorPool(index) {
  const L = LETTERS[index];
  const pool = new Set();
  for (const c of (LOOKALIKE[L.ch] || '')) pool.add(c);
  for (let i = Math.max(0, index - 5); i < index; i++) pool.add(LETTERS[i].ch);
  let k = index + 1;
  while (pool.size < 3) { pool.add(LETTERS[k % LETTERS.length].ch); k++; }
  pool.delete(L.ch);
  return [...pool].map(c => LETTERS.find(x => x.ch === c));
}

export const BIOMES = {
  savanna: { ground: 0xe9c46a, accent: 0xc9a227, props: ['acacia', 'rock', 'grass'] },
  pond: { ground: 0x8ed081, accent: 0x4dabf7, props: ['water', 'reed', 'rock'] },
  forest: { ground: 0x5c9e4f, accent: 0x3a7d44, props: ['pine', 'log', 'mushroom'] },
  desert: { ground: 0xf4d58d, accent: 0xe0b15a, props: ['palm', 'cactus', 'rock'] },
  farm: { ground: 0x9bd770, accent: 0xd4a373, props: ['hay', 'round', 'flower'] },
  snow: { ground: 0xf1f7ff, accent: 0xc9e4ff, props: ['pine', 'snowrock', 'snowman'] },
  jungle: { ground: 0x4caf50, accent: 0x2e7d32, props: ['palm', 'bush', 'flower'] },
  garden: { ground: 0xa5e08b, accent: 0xff8fab, props: ['flower', 'round', 'birdhouse'] },
  mountain: { ground: 0xb7c4a0, accent: 0x8d99ae, props: ['rock', 'pine', 'grass'] },
  orchard: { ground: 0x9bd770, accent: 0xff6b6b, props: ['appletree', 'flower', 'hay'] }
};

// Every sentence the game speaks, with a stable file name. Recorded/generated clips go in
// assets/voice/<id>.mp3 and are used automatically instead of the phone's text-to-speech.
export function voiceLines() {
  const out = [];
  const p2 = n => String(n).padStart(2, '0');
  LETTERS.forEach((L, i) => {
    const k = `letter-${p2(i + 1)}`;
    out.push({ id: `${k}-name`, text: L.name, note: `اسم الحرف ${L.ch}` });
    out.push({ id: `${k}-word`, text: L.say, note: `الكلمة ${L.word}` });
    out.push({ id: `${k}-intro`, text: LINES.letterIntro(L), note: 'بداية المرحلة' });
    out.push({ id: `${k}-wrong`, text: LINES.wrong(L), note: 'عند اختيار هذا الحرف خطأ' });
  });
  NUMBERS.forEach(N => {
    out.push({ id: `number-${p2(N.n)}`, text: N.say, note: `الرقم ${N.digit}` });
    out.push({ id: `number-${p2(N.n)}-intro`, text: LINES.numberIntro(N), note: 'بداية مرحلة الرقم' });
  });
  out.push({ id: 'gate', text: LINES.gate, note: 'بعد جمع كل الحروف' });
  out.push({ id: 'new-friend', text: LINES.newFriend, note: 'حيوان جديد في الحديقة' });
  PRAISE.forEach((t, i) => out.push({ id: `praise-${i + 1}`, text: t, note: 'تشجيع' }));
  return out;
}
