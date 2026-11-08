"""Shared pass/check rules for one clip (used by bench_judge.py).
Calibrated against the owner's ear labels (owner-review.txt): everything the owner marked wrong that the
measurements can see must come out as a reason string; '' means pass."""
import re, difflib
from evalset_common import norm, nomark

SYL = re.compile('^[ء-ي][َ-ِ]$')
VOW = {'َ': 'a', 'ِ': 'i', 'ُ': 'u'}
NAMES = {'ا': 'الف', 'أ': 'الف', 'ء': 'الف', 'ب': 'باء', 'ت': 'تاء', 'ث': 'ثاء', 'ج': 'جيم', 'ح': 'حاء', 'خ': 'خاء', 'د': 'دال', 'ذ': 'ذال', 'ر': 'راء', 'ز': 'زاي',
         'س': 'سين', 'ش': 'شين', 'ص': 'صاد', 'ض': 'ضاد', 'ط': 'طاء', 'ظ': 'ظاء', 'ع': 'عين', 'غ': 'غين', 'ف': 'فاء', 'ق': 'قاف', 'ك': 'كاف', 'ل': 'لام',
         'م': 'ميم', 'ن': 'نون', 'ه': 'هاء', 'و': 'واو', 'ي': 'ياء'}

def kind(text): return 'syl' if SYL.match(text) else 'one' if ' ' not in text.strip('،:؟!. ') else 'multi'
def words_of(h): return [w for w in re.split('[\\s.،؟!:]+', norm(h)) if w]
def has_marks(w): return bool(re.search('[ً-ْ]', w))
def shape(w):
    """what a child must hear: the long vowels (ا ي و as madd letters, hamza forms folded) and the shadda count"""
    w = re.sub('[إأآٱ]', 'ا', w).replace('ة', '')
    return ''.join(ch for ch in nomark(w) if ch in 'اوي'), w.count('ّ')
def best_heard_word(text, heard_list):
    cands = [w for h in heard_list if h for w in words_of(h)]
    if not cands: return None
    return max(cands, key=lambda w: difflib.SequenceMatcher(None, norm(text), w).ratio())
def long_lost(text, heard_list):
    """a word in the text whose long vowel / shadda / final ta-marbuta is missing from the best-matching
    heard word, or a word the reading does not contain at all (bare ratio < 0.75)"""
    for tw in words_of(text):
        hw = best_heard_word(tw, heard_list)
        if hw is None: return tw
        if difflib.SequenceMatcher(None, nomark(tw), nomark(hw)).ratio() < 0.75: return f'{tw}→{hw} (word)'
        tl, ts = shape(tw); hl, hs = shape(hw)
        if tw[0] in 'اأإآ': tl = tl[1:]            # a word-initial «ا» is a hamza seat, not a long vowel
        if tl and tl not in hl: return f'{tw}→{hw} (long vowel)'
        if ts and has_marks(hw) and hs < ts: return f'{tw}→{hw} (shadda)'   # Whisper writes sentences bare: shadda judged only where it wrote marks
        if tw.endswith('ة') and not nomark(hw).endswith(('ة', 'ه', 'ا')): return f'{tw}→{hw} (ة)'
    return ''

MADD = {'ا': 'a', 'ي': 'i', 'و': 'u'}
def reading_vowel(text, heard3):
    """the vowel the ×3 reading spells out after the consonant when every repetition agrees and is nothing
    but consonant + vowel (an explicit mark, or the matching madd letter ا ي و): 'a'/'i'/'u', else ''"""
    cons = 'ا' if text[0] in 'ءأإ' else text[0]
    ws = words_of(heard3)
    if len(ws) < 2: return ''
    seen = set()
    for w in ws:
        w = re.sub('[إأآٱ]', 'ا', w); bare = nomark(w)
        if bare[:1] != cons or len(bare) > 2 or (len(bare) == 2 and bare[1] not in MADD): return ''
        marks = {VOW[m] for m in re.findall('[َ-ِ]', w)}
        if len(marks) > 1: return ''
        v = next(iter(marks)) if marks else MADD.get(bare[1:2], '')
        if not v: return ''
        seen.add(v)
    return seen.pop() if len(seen) == 1 else ''

def syl_why(text, heard3, vow_class, voiced):
    """lone syllable: formant vowel matches (or undecidable, or the ×3 reading spells the wanted vowel out in
    every repetition: the long بَا/بِي/بُو references drift for a short damma), the reading names no other
    vowel and no letter name, the consonant is heard, and the clip is short (0.05–0.35 s voiced)"""
    want = VOW[text[1]]; cons = 'ا' if text[0] in 'ءأإ' else text[0]
    if vow_class not in (want, '?') and reading_vowel(text, heard3) != want: return f'formants say {vow_class}'
    marks = {VOW[m] for m in re.findall('[َ-ِ]', heard3)}
    if marks and marks != {want}: return 'reading says ' + ''.join(sorted(marks))
    bare = nomark(norm(heard3))
    if NAMES.get(text[0], '')[1:] and NAMES[text[0]][1:] in bare.replace(' ', ''): return 'reads the letter name'
    ws = [w for w in bare.split() if w]
    if ws and sum(1 for w in ws if re.sub('[إأآٱ]', 'ا', w)[:1] == cons) < len(ws) / 2: return f'consonant heard as {ws[0][:1]}'
    if voiced > 0.35: return 'stretched'
    return ''

def one_why(text, heard_list, score, bare):
    hw = best_heard_word(text, heard_list)
    if hw is not None and not has_marks(hw): score = max(score, bare)   # a bare reading says nothing about the vowels
    if score < 0.85: return 'word not recognised'
    lost = long_lost(text, heard_list)
    return f'swallowed: {lost}' if lost else ''

def multi_why(text, heard, bare):
    if bare < 0.9: return 'words not recognised'
    lost = long_lost(text, [heard])
    return f'swallowed: {lost}' if lost else ''
