"""Turn a judged local-engine folder (bench_judge.py output) into a candidate clip set the owner can listen to and
choose.py can install: tools/voice-qa/cand/<engine>/<id>.mp3 (ffmpeg -q:a 4) + report.json with the verdict rows.
  python tools/voice-qa/cloud_cand.py <engine> [--src bench/cloud/<engine>-all]
The clip shipped is the audio that was judged: the part after the carrier gap (<id>.cut.wav) for lone syllables and single
words, the silence-trimmed generation for sentences. report.json rows: id,text,heard,score,bare,vow,verdict,why,kind
(+ dur, voiced, secs = generation time), in lines.json order."""
import os, sys, json, argparse, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from evalset_common import load, trim  # noqa

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('engine'); ap.add_argument('--src', default='')
    a = ap.parse_args()
    src = a.src or os.path.join('bench', 'cloud', a.engine + '-all'); src = src if os.path.isabs(src) else os.path.join(HERE, src)
    dst = os.path.join(HERE, 'cand', a.engine); os.makedirs(dst, exist_ok=True)
    rows = json.load(open(os.path.join(src, 'judge.json'), encoding='utf-8'))
    tp = os.path.join(src, 'times.json'); times = json.load(open(tp)) if os.path.exists(tp) else {}
    lines = json.load(open(os.path.join(HERE, '..', '..', 'assets', 'voice', 'lines.json'), encoding='utf-8'))
    lines = lines['lines'] if isinstance(lines, dict) else lines
    order = {l['id']: n for n, l in enumerate(lines)}
    out = []
    import parselmouth
    for r in sorted(rows, key=lambda r: order.get(r['id'], 10 ** 6)):
        i = r['id']; cut = os.path.join(src, i + '.cut.wav'); wav = os.path.join(src, i + '.wav')
        mp3 = os.path.join(dst, i + '.mp3')
        if not os.path.exists(mp3):
            if os.path.exists(cut): srcwav = cut
            else:   # same silence trim as the judge applied (16 kHz is what the judge heard; the mp3 keeps it)
                au = trim(load(wav)); fd, srcwav = tempfile.mkstemp(suffix='.wav'); os.close(fd)
                parselmouth.Sound(au, sampling_frequency=16000).save(srcwav, 'WAV')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', srcwav, '-ac', '1', '-q:a', '4', mp3], check=True)
            if srcwav != cut: os.remove(srcwav)
        out.append({k: r.get(k, '') for k in ('id', 'text', 'heard', 'score', 'bare', 'vow', 'verdict', 'why', 'kind', 'dur', 'voiced')} | {'secs': times.get(i, '')})
    json.dump(out, open(os.path.join(dst, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ok = sum(1 for r in out if r['verdict'] == 'pass')
    print(f'{a.engine}: {len(out)} clips -> {dst}; {ok} pass, {len(out) - ok} to check by ear')

if __name__ == '__main__': main()
