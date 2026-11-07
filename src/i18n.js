// Interface language (menus, settings, on-screen instructions). This is separate from the
// learning track: an English-speaking family can learn Arabic letters with an English interface,
// and an Arabic-speaking family can learn English letters with an Arabic interface.
import { arDigits } from './data.js';

const AR_NUM = ['صفر', 'واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
export const UI = {
  ar: {
    dir: 'rtl', switchTo: 'EN', switchLabel: 'English',
    sub: 'حديقة الحروف والأرقام', play: 'العب', gearhint: 'اضغط مطولاً – للوالدين', banner: 'حديقة الحروف',
    tabLetter: 'الحروف', tabNumber: 'الأرقام', tabWord: 'كلمات', tabEnWord: 'Words',
    pause: 'استراحة', settingsTitle: 'إعدادات الوالدين',
    vtest: 'تجربة الصوت', vinstall: 'تثبيت الصوت العربي',
    unlock: 'فتح كل المراحل', lock: 'إغلاق المراحل', reset: 'مسح التقدم', resetConfirm: 'اضغط مرة أخرى للتأكيد', resetDone: 'تم المسح ✓',
    opts: {
      sfx: 'المؤثرات الصوتية', music: 'الموسيقى', voice: 'نطق الحروف', haptics: 'الاهتزاز', hint: 'توهج المساعدة بعد الخطأ',
      tilt: 'القيادة بإمالة الجهاز', flip: 'عكس اتجاه الإمالة', speed: 'سرعة السيارة', voiceRate: 'سرعة النطق', voiceName: 'صوت القارئ'
    },
    slow: 'بطيئة', normal: 'عادية',
    vClips: n => `يستخدم التطبيق تسجيلات صوتية جاهزة (${n}) ✓`,
    vOk: name => `الصوت العربي متوفر: ${name} ✓`,
    vNoneApp: 'لا يوجد صوت عربي على هذا الجهاز. ثبّت اللغة العربية من إعدادات "تحويل النص إلى كلام" في الهاتف.',
    vNoneWeb: 'هذا المتصفح لا يحتوي على صوت عربي. جرّب متصفح Edge أو Safari، أو ثبّت اللغة العربية في إعدادات الجهاز.',
    vUnknown: 'اضغط "تجربة الصوت" للتأكد من نطق الحروف.',
    // the numbers are written as words, so a child who knows the digit shapes cannot just match them
    gate: (a, b) => `للوالدين: اضغط ${AR_NUM[a]} ثم ${AR_NUM[b]}`, gateDigit: arDigits,
    pwTitle: 'افتح اللعبة كاملة', pwBody: n => `${n} كلمة جديدة في البيت والسوق والبحر والطبيعة، وكل الكلمات القادمة.`,
    pwFree: 'الحروف والأرقام مجانية دائماً.', pwBuy: p => `افتح الكل – ${p}`, pwRestore: 'استعادة الشراء', pwParents: 'للوالدين فقط',
    pwOk: 'شكراً! كل شيء مفتوح الآن 🎉', pwCancel: 'لم يتم الشراء.', pwFail: 'تعذّر الاتصال بالمتجر. حاول لاحقاً.', pwNone: 'لا يوجد شراء سابق لهذا الحساب.',
    pwWeb: 'الشراء متاح داخل التطبيق على الهاتف.', pwOwned: 'اللعبة كاملة ✓',
    collect: L => `اجمع حرف ${L.ch}`, apples: d => `اجمع ${d} تفاحات`, zero: 'صفر = لا شيء', friend: 'صديق جديد في حديقتك!',
    buildWord: W => `ابنِ كلمة ${W.word}`, wordDone: 'كلمة جديدة!', packs: { zoo: 'الحيوانات', home: 'البيت', market: 'السوق', sea: 'البحر', sky: 'الطبيعة' },
    garage: 'المرآب', gTabs: { body: 'السيارة', color: 'اللون', hat: 'القبعة', skin: 'السائق', pilot: 'الرفيق' },
    garageNew: 'هدية جديدة في المرآب!', pilotNone: 'بدون', pilotEmpty: 'أكمل حرفاً ليركب صديق معك!', learnStars: 'نجوم التعلّم'
  },
  en: {
    dir: 'ltr', switchTo: 'ع', switchLabel: 'العربية',
    sub: 'Letters & Numbers Zoo', play: 'Play', gearhint: 'Hold – for parents', banner: 'Letter Zoo',
    tabLetter: 'أ ب ت', tabNumber: '١٢٣', tabWord: 'كلمات', tabEnWord: 'Words',
    pause: 'Paused', settingsTitle: 'Parent settings',
    vtest: 'Test voice', vinstall: 'Install Arabic voice',
    unlock: 'Unlock all levels', lock: 'Lock levels', reset: 'Reset progress', resetConfirm: 'Tap again to confirm', resetDone: 'Progress reset ✓',
    opts: {
      sfx: 'Sound effects', music: 'Music', voice: 'Spoken letters', haptics: 'Vibration', hint: 'Help glow after a mistake',
      tilt: 'Tilt to steer', flip: 'Flip tilt direction', speed: 'Car speed', voiceRate: 'Speech speed', voiceName: 'Voice'
    },
    slow: 'Slow', normal: 'Normal',
    vClips: n => `Using the built-in recorded voice (${n} clips) ✓`,
    vOk: name => `Arabic voice available: ${name} ✓`,
    vNoneApp: 'No Arabic voice on this device. Install Arabic in the phone\'s text-to-speech settings.',
    vNoneWeb: 'This browser has no Arabic voice. Try Edge or Safari, or install Arabic in the device settings.',
    vUnknown: 'Tap "Test voice" to check the letter voice.',
    gate: (a, b) => `For parents: tap ${EN_NUM[a]}, then ${EN_NUM[b]}`, gateDigit: n => String(n),
    pwTitle: 'Unlock the full game', pwBody: n => `${n} more words for home, market, sea and nature, plus every future word pack.`,
    pwFree: 'Letters and numbers are always free.', pwBuy: p => `Unlock all – ${p}`, pwRestore: 'Restore purchase', pwParents: 'For parents only',
    pwOk: 'Thank you! Everything is unlocked 🎉', pwCancel: 'No purchase was made.', pwFail: 'Could not reach the store. Please try again later.', pwNone: 'No earlier purchase found for this account.',
    pwWeb: 'Purchases are available in the phone app.', pwOwned: 'Full game ✓',
    collect: L => `Find the letter ${L.ch}`, apples: d => `Collect ${d} apples`, zero: '0 = nothing', friend: 'A new friend in your zoo!',
    buildWord: W => `Build the word ${W.word}`, wordDone: 'You built a word!', packs: { zoo: 'Animals', home: 'Home', market: 'Market', sea: 'Sea', sky: 'Nature' },
    garage: 'Garage', gTabs: { body: 'Kart', color: 'Color', hat: 'Hat', skin: 'Driver', pilot: 'Friend' },
    garageNew: 'New in the garage!', pilotNone: 'None', pilotEmpty: 'Finish a letter and a friend can ride with you!', learnStars: 'Learning stars'
  }
};
