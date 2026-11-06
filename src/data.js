// Learning content: 28 Arabic letters (each with a zoo animal) and numbers 0-10.
// `name` / `say` carry harakat so the device text-to-speech pronounces them correctly;
// `word` is what is shown on screen (no harakat, easier to read for small children).

export const LETTERS = [
  { ch: 'أ', snd: 'أَ', name: 'أَلِف', word: 'أسد', say: 'أَسَد', animal: 'lion', biome: 'savanna' },
  { ch: 'ب', snd: 'بَ', name: 'بَاء', word: 'بطة', say: 'بَطَّة', animal: 'duck', biome: 'pond' },
  { ch: 'ت', snd: 'تِ', name: 'تَاء', word: 'تمساح', say: 'تِمْسَاح', animal: 'crocodile', biome: 'pond' },
  { ch: 'ث', snd: 'ثَ', name: 'ثَاء', word: 'ثعلب', say: 'ثَعْلَب', animal: 'fox', biome: 'forest' },
  { ch: 'ج', snd: 'جَ', name: 'جِيم', word: 'جمل', say: 'جَمَل', animal: 'camel', biome: 'desert' },
  { ch: 'ح', snd: 'حِ', name: 'حَاء', word: 'حصان', say: 'حِصَان', animal: 'horse', biome: 'farm' },
  { ch: 'خ', snd: 'خَ', name: 'خَاء', word: 'خروف', say: 'خَرُوف', animal: 'sheep', biome: 'farm' },
  { ch: 'د', snd: 'دُ', name: 'دَال', word: 'دب', say: 'دُبّ', animal: 'bear', biome: 'forest' },
  { ch: 'ذ', snd: 'ذِ', name: 'ذَال', word: 'ذئب', say: 'ذِئْب', animal: 'wolf', biome: 'forest' },
  { ch: 'ر', snd: 'رَ', name: 'رَاء', word: 'رنة', say: 'رَنَّة', animal: 'reindeer', biome: 'snow' },
  { ch: 'ز', snd: 'زَ', name: 'زَاي', word: 'زرافة', say: 'زَرَافَة', animal: 'giraffe', biome: 'savanna' },
  { ch: 'س', snd: 'سُ', name: 'سِين', word: 'سلحفاة', say: 'سُلَحْفَاة', animal: 'turtle', biome: 'pond' },
  { ch: 'ش', snd: 'شِ', name: 'شِين', word: 'شمبانزي', say: 'شِمْبَانْزِي', animal: 'chimp', biome: 'jungle' },
  { ch: 'ص', snd: 'صَ', name: 'صَاد', word: 'صقر', say: 'صَقْر', animal: 'falcon', biome: 'desert' },
  { ch: 'ض', snd: 'ضِ', name: 'ضَاد', word: 'ضفدع', say: 'ضِفْدَع', animal: 'frog', biome: 'pond' },
  { ch: 'ط', snd: 'طَ', name: 'طَاء', word: 'طاووس', say: 'طَاوُوس', animal: 'peacock', biome: 'garden' },
  { ch: 'ظ', snd: 'ظَ', name: 'ظَاء', word: 'ظبي', say: 'ظَبْي', animal: 'deer', biome: 'forest' },
  { ch: 'ع', snd: 'عُ', name: 'عَيْن', word: 'عصفور', say: 'عُصْفُور', animal: 'sparrow', biome: 'garden' },
  { ch: 'غ', snd: 'غَ', name: 'غَيْن', word: 'غزال', say: 'غَزَال', animal: 'gazelle', biome: 'savanna' },
  { ch: 'ف', snd: 'فِ', name: 'فَاء', word: 'فيل', say: 'فِيل', animal: 'elephant', biome: 'savanna' },
  { ch: 'ق', snd: 'قِ', name: 'قَاف', word: 'قرد', say: 'قِرْد', animal: 'monkey', biome: 'jungle' },
  { ch: 'ك', snd: 'كَ', name: 'كَاف', word: 'كنغر', say: 'كَنْغَر', animal: 'kangaroo', biome: 'desert' },
  { ch: 'ل', snd: 'لَ', name: 'لَام', word: 'لاما', say: 'لَامَا', animal: 'llama', biome: 'mountain' },
  { ch: 'م', snd: 'مَ', name: 'مِيم', word: 'ماعز', say: 'مَاعِز', animal: 'goat', biome: 'mountain' },
  { ch: 'ن', snd: 'نَ', name: 'نُون', word: 'نمر', say: 'نَمِر', animal: 'tiger', biome: 'jungle' },
  { ch: 'ه', snd: 'هُ', name: 'هَاء', word: 'هدهد', say: 'هُدْهُد', animal: 'hoopoe', biome: 'garden' },
  { ch: 'و', snd: 'وَ', name: 'وَاو', word: 'وحيد القرن', say: 'وَحِيدُ القَرْن', animal: 'rhino', biome: 'savanna' },
  { ch: 'ي', snd: 'يَ', name: 'يَاء', word: 'يمامة', say: 'يَمَامَة', animal: 'dove', biome: 'garden' }
];

const AR = '٠١٢٣٤٥٦٧٨٩';
export const arDigits = n => String(n).split('').map(d => AR[+d]).join('');

export const NUMBERS = [
  { n: 0, word: 'صفر', say: 'صِفْر' },
  { n: 1, word: 'واحد', say: 'وَاحِد' },
  { n: 2, word: 'اثنان', say: 'اثْنَان', to: 'اثْنَيْن' },
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
  // letter SOUND (phonics) tied to the animal word: «بَ، بَ، بَطَّة»
  sound: L => `${L.snd}، ${L.snd}، ${L.say}`,
  find: L => `أَيْنَ حَرْفُ ${L.name}؟`,
  wrong: L => `هَذَا حَرْفُ ${L.name}`,
  numberIntro: N => N.n === 0 ? 'صِفْر يَعْنِي لَا شَيْء' : `هَيَّا نَعُدُّ إِلَى ${N.to || N.say}`,
  gate: 'هَيَّا إِلَى البَوَّابَة!',
  newFriend: 'صَدِيقٌ جَدِيدٌ فِي حَدِيقَتِك!'
};

// Wrong choices follow a ladder: first an easy, clearly different letter (preferably one already
// learned, so it doubles as review), and only later in the level a look-alike that differs by dots.
export const LOOKALIKE = { 'ب': 'تث', 'ت': 'بث', 'ث': 'بت', 'ج': 'حخ', 'ح': 'جخ', 'خ': 'جح', 'د': 'ذ', 'ذ': 'د', 'ر': 'ز', 'ز': 'ر', 'س': 'ش', 'ش': 'س', 'ص': 'ض', 'ض': 'ص', 'ط': 'ظ', 'ظ': 'ط', 'ع': 'غ', 'غ': 'ع', 'ف': 'ق', 'ق': 'ف' };
function makeDistractors(list, LOOK, EASY) {
  const byCh = c => list.find(x => x.ch === c);
  return function (index, hard = false) {
    const L = list[index];
    const look = LOOK[L.ch] || '';
    if (hard && look) return [...look].map(byCh).filter(Boolean);
    // shapes that do not resemble the target: learned letters first, then a fixed set of distinct shapes
    const similar = c => c === L.ch || look.includes(c) || (LOOK[c] || '').includes(L.ch);
    const learned = [];
    for (let i = Math.max(0, index - 6); i < index; i++) if (!similar(list[i].ch)) learned.push(list[i].ch);
    const pool = learned.length >= 2 ? learned : learned.concat([...EASY].filter(c => !similar(c) && !learned.includes(c)));
    return pool.map(byCh).filter(Boolean);
  };
}
export const distractorPool = makeDistractors(LETTERS, LOOKALIKE, 'أمسلرهوكنعد');

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

// ---------------------------------------------------------------------------------------------
// English track: A-Z (capital letter in the bubbles, "Aa" on the card) and numbers 0-10.
// `word` is shown, `say` is spoken. `hi` marks which letter of the word is highlighted (Ox: the x).
export const EN_LETTERS = [
  ['A', 'Alligator', 'crocodile', 'pond'], ['B', 'Bear', 'bear', 'forest'], ['C', 'Camel', 'camel', 'desert'],
  ['D', 'Duck', 'duck', 'pond'], ['E', 'Elephant', 'elephant', 'savanna'], ['F', 'Fox', 'fox', 'forest'],
  ['G', 'Giraffe', 'giraffe', 'savanna'], ['H', 'Horse', 'horse', 'farm'], ['I', 'Iguana', 'iguana', 'desert'],
  ['J', 'Jaguar', 'jaguar', 'jungle'], ['K', 'Kangaroo', 'kangaroo', 'desert'], ['L', 'Lion', 'lion', 'savanna'],
  ['M', 'Monkey', 'monkey', 'jungle'], ['N', 'Newt', 'newt', 'pond'], ['O', 'Owl', 'owl', 'forest'],
  ['P', 'Peacock', 'peacock', 'garden'], ['Q', 'Quail', 'quail', 'farm'], ['R', 'Rhino', 'rhino', 'savanna'],
  ['S', 'Sheep', 'sheep', 'farm'], ['T', 'Tiger', 'tiger', 'jungle'], ['U', 'Unicorn', 'unicorn', 'garden'],
  ['V', 'Vulture', 'vulture', 'desert'], ['W', 'Wolf', 'wolf', 'forest'], ['X', 'Ox', 'ox', 'farm', 1],
  ['Y', 'Yak', 'yak', 'mountain'], ['Z', 'Zebra', 'zebra', 'savanna']
].map(([ch, word, animal, biome, hi]) => ({ ch, card: ch + ch.toLowerCase(), word, say: word.toLowerCase(), name: `Letter ${ch}`, animal, biome, hi: hi || 0 }));

const EN_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const EN_NUMBERS = EN_WORDS.map((w, n) => ({ n, word: w[0].toUpperCase() + w.slice(1), say: w, digit: String(n), alt: arDigits(n), biome: 'orchard' }));
export const EN_PRAISE = ['Great job!', 'Awesome!', 'Well done!', 'Super!', 'You did it!', 'Fantastic!'];
export const EN_LINES = {
  letterIntro: L => `Let's find the letter ${L.ch}!`,
  // the classic association line: «A is for alligator» (isolated letter sounds are unreliable in text-to-speech)
  sound: L => `${L.ch} is for ${L.say}.`,
  find: L => `Where is the letter ${L.ch}?`,
  wrong: L => `That is the letter ${L.ch}.`,
  numberIntro: N => N.n === 0 ? 'Zero means nothing.' : `Let's count to ${N.say}!`,
  gate: 'Go to the gate!',
  newFriend: 'A new friend in your zoo!'
};
// look-alike capitals, introduced only once the child is doing well
const EN_LOOK = { B: 'PR', P: 'BR', R: 'PB', E: 'F', F: 'E', O: 'QC', Q: 'OG', C: 'GO', G: 'CO', M: 'NW', N: 'MH', H: 'N', W: 'MV', V: 'UW', U: 'V', I: 'LT', L: 'I', T: 'I', K: 'X', X: 'K' };
export const enDistractorPool = makeDistractors(EN_LETTERS, EN_LOOK, 'AOSXHMTZ');

// everything the game needs to teach one language
export const TRACKS = {
  ar: {
    lang: 'ar', letters: LETTERS, numbers: NUMBERS, lines: LINES, praise: PRAISE, praiseShow: PRAISE_SHOW,
    distractors: distractorPool, digits: arDigits,
    ui: { collect: L => `اجمع حرف ${L.ch}`, apples: d => `اجمع ${d} تفاحات`, zero: 'صفر = لا شيء', friend: 'صديق جديد في حديقتك!' }
  },
  en: {
    lang: 'en', letters: EN_LETTERS, numbers: EN_NUMBERS, lines: EN_LINES, praise: EN_PRAISE, praiseShow: EN_PRAISE,
    distractors: enDistractorPool, digits: n => String(n),
    ui: { collect: L => `Find the letter ${L.ch}`, apples: d => `Collect ${d} apples`, zero: '0 = nothing', friend: 'A new friend in your zoo!' }
  }
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
    out.push({ id: `${k}-sound`, text: LINES.sound(L), note: `صوت الحرف ${L.ch} مع الكلمة` });
    out.push({ id: `${k}-find`, text: LINES.find(L), note: `البحث عن الحرف ${L.ch}` });
  });
  NUMBERS.forEach(N => {
    out.push({ id: `number-${p2(N.n)}`, text: N.say, note: `الرقم ${N.digit}` });
    out.push({ id: `number-${p2(N.n)}-intro`, text: LINES.numberIntro(N), note: 'بداية مرحلة الرقم' });
  });
  out.push({ id: 'gate', text: LINES.gate, note: 'بعد جمع كل الحروف' });
  out.push({ id: 'new-friend', text: LINES.newFriend, note: 'حيوان جديد في الحديقة' });
  PRAISE.forEach((t, i) => out.push({ id: `praise-${i + 1}`, text: t, note: 'تشجيع' }));
  EN_LETTERS.forEach((L, i) => {
    const k = `en-letter-${p2(i + 1)}`;
    out.push({ id: `${k}-name`, text: L.name, note: `letter ${L.ch}`, lang: 'en' });
    out.push({ id: `${k}-word`, text: L.say, note: L.word, lang: 'en' });
    out.push({ id: `${k}-intro`, text: EN_LINES.letterIntro(L), note: 'level start', lang: 'en' });
    out.push({ id: `${k}-wrong`, text: EN_LINES.wrong(L), note: 'picked by mistake', lang: 'en' });
    out.push({ id: `${k}-sound`, text: EN_LINES.sound(L), note: 'letter + word', lang: 'en' });
    out.push({ id: `${k}-find`, text: EN_LINES.find(L), note: 'question', lang: 'en' });
  });
  EN_NUMBERS.forEach(N => {
    out.push({ id: `en-number-${p2(N.n)}`, text: N.say, note: `number ${N.n}`, lang: 'en' });
    out.push({ id: `en-number-${p2(N.n)}-intro`, text: EN_LINES.numberIntro(N), note: 'number level start', lang: 'en' });
  });
  out.push({ id: 'en-gate', text: EN_LINES.gate, note: 'after collecting', lang: 'en' });
  out.push({ id: 'en-new-friend', text: EN_LINES.newFriend, note: 'new animal', lang: 'en' });
  EN_PRAISE.forEach((t, i) => out.push({ id: `en-praise-${i + 1}`, text: t, note: 'praise', lang: 'en' }));
  return out;
}
