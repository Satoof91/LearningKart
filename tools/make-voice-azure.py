"""Generate the voice clips with Azure Speech (REST, no SDK) using SSML, so short syllables can be given
exact IPA phonemes: «بِ» is /bi/ and can never be stretched into «بي».

Needs a free Azure Speech key (F0 tier: 500k characters/month):
  set AZURE_SPEECH_KEY=...   set AZURE_SPEECH_REGION=...   (e.g. uaenorth, westeurope, eastus)
  python tools/make-voice-azure.py [--voice ar-SA-HamedNeural] [--only haraka,letter] [--force] [--out assets/voice]

Lines come from assets/voice/lines.json (npm run voice). Any line whose text is a lone syllable
(«بَ»), a syllable chain («بَ بِ بُ») or a letter name gets IPA from ipa_for(); other lines are plain text.
Clips are written as mp3 next to a clips-texts.json manifest like make-voice-edge.py."""
import argparse, json, os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--voice', default='ar-SA-HamedNeural')
ap.add_argument('--rate', default='-10%'); ap.add_argument('--pitch', default='+5Hz')
ap.add_argument('--only', default=''); ap.add_argument('--force', action='store_true')
ap.add_argument('--out', default=os.path.join(ROOT, 'assets', 'voice'))
a = ap.parse_args()
KEY, REGION = os.environ.get('AZURE_SPEECH_KEY'), os.environ.get('AZURE_SPEECH_REGION')
if not KEY or not REGION: sys.exit('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first.')

# consonants (IPA) and the three short vowels
C = {'أ': 'ʔ', 'إ': 'ʔ', 'ب': 'b', 'ت': 't', 'ث': 'θ', 'ج': 'd͡ʒ', 'ح': 'ħ', 'خ': 'x', 'د': 'd', 'ذ': 'ð', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'ʃ',
     'ص': 'sˤ', 'ض': 'dˤ', 'ط': 'tˤ', 'ظ': 'ðˤ', 'ع': 'ʕ', 'غ': 'ɣ', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'j'}
V = {'َ': 'a', 'ِ': 'i', 'ُ': 'u'}
SYL = re.compile('^([ء-ي])([َ-ِ])$')
NAMES = {'أَلِف': 'ʔalif', 'بَاء': 'baːʔ', 'تَاء': 'taːʔ', 'ثَاء': 'θaːʔ', 'جِيم': 'd͡ʒiːm', 'حَاء': 'ħaːʔ', 'خَاء': 'xaːʔ', 'دَال': 'daːl', 'ذَال': 'ðaːl', 'رَاء': 'raːʔ',
         'زَاي': 'zaːj', 'سِين': 'siːn', 'شِين': 'ʃiːn', 'صَاد': 'sˤaːd', 'ضَاد': 'dˤaːd', 'طَاء': 'tˤaːʔ', 'ظَاء': 'ðˤaːʔ', 'عَيْن': 'ʕajn', 'غَيْن': 'ɣajn', 'فَاء': 'faːʔ',
         'قَاف': 'qaːf', 'كَاف': 'kaːf', 'لَام': 'laːm', 'مِيم': 'miːm', 'نُون': 'nuːn', 'هَاء': 'haːʔ', 'وَاو': 'waːw', 'يَاء': 'jaːʔ'}

def ipa_for(word):
    """IPA for a lone syllable or a letter name; None for ordinary words (the engine reads those fine)"""
    w = word.strip('،:؟!. ')
    m = SYL.match(w)
    if m: return C[m.group(1)] + V[m.group(2)]
    return NAMES.get(w)

def esc(t): return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
def ssml(text):
    parts = []
    for tok in text.split(' '):
        ipa = ipa_for(tok)
        if ipa:
            trail = tok[len(tok.rstrip('،:؟!.')):]
            parts.append(f'<phoneme alphabet="ipa" ph="{ipa}">{esc(tok.rstrip("،:؟!."))}</phoneme>{esc(trail)}')
        else: parts.append(esc(tok))
    body = ' '.join(parts)
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="ar-SA">'
            f'<voice name="{a.voice}"><prosody rate="{a.rate}" pitch="{a.pitch}">{body}</prosody></voice></speak>')

def synth(text):
    req = urllib.request.Request(f'https://{REGION}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml(text).encode('utf-8'), method='POST',
                                 headers={'Ocp-Apim-Subscription-Key': KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3', 'User-Agent': 'LearningKart'})
    with urllib.request.urlopen(req, timeout=60) as r: return r.read()

lines = json.load(open(os.path.join(ROOT, 'assets', 'voice', 'lines.json'), encoding='utf-8'))
pref = [p for p in a.only.split(',') if p]
os.makedirs(a.out, exist_ok=True)
man_path = os.path.join(a.out, 'clips-texts.json')
made = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {}
done = skipped = failed = 0
for L in lines:
    if L.get('lang') == 'en' or (pref and not any(L['id'].startswith(p) for p in pref)): continue
    path = os.path.join(a.out, L['id'] + '.mp3')
    if os.path.exists(path) and not a.force and made.get(L['id']) == L['text']: skipped += 1; continue
    try:
        open(path, 'wb').write(synth(L['text'])); made[L['id']] = L['text']; done += 1
        print('ok  ', L['id'], L['text'], flush=True); time.sleep(0.2)
    except Exception as e:
        failed += 1; print('FAIL', L['id'], e, flush=True)
json.dump(made, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True)
print(f'{done} generated, {skipped} already existed, {failed} failed -> {a.out}')
