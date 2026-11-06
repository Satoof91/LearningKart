#!/usr/bin/env python3
"""Generate the 142 Arabic voice clips with Microsoft's free neural voices (edge-tts).

Run this on a normal PC (it needs internet access to Microsoft's speech service):

    pip install edge-tts
    python tools/make-voice-edge.py            # Saudi male voice (Hamed) + US English (Jenny)
    python tools/make-voice-edge.py --voice ar-SA-ZariyahNeural   # Saudi female voice

Clips are written to assets/voice/<id>.mp3 next to lines.json. Existing clips are
kept unless you pass --force. Afterwards run `npm run build` (or `npm test`) and
the clips are bundled into the game automatically.

Good child-friendly Arabic voices: ar-SA-ZariyahNeural, ar-SA-HamedNeural,
ar-EG-SalmaNeural, ar-EG-ShakirNeural, ar-AE-FatimaNeural. List them all with
`edge-tts --list-voices | grep ar-`.
"""
import argparse, asyncio, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'voice')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', default='ar-SA-HamedNeural', help='Arabic voice')
    ap.add_argument('--voice-en', default='en-US-JennyNeural', help='English voice (English track lines)')
    ap.add_argument('--rate-en', default='-8%')
    ap.add_argument('--rate', default='-10%', help='speech speed, e.g. -10% (slower is better for small children)')
    ap.add_argument('--pitch', default='+5Hz')
    ap.add_argument('--force', action='store_true', help='regenerate clips that already exist')
    a = ap.parse_args()
    try:
        import edge_tts
    except ImportError:
        sys.exit('edge-tts is not installed. Run:  pip install edge-tts')

    with open(os.path.join(OUT, 'lines.json'), encoding='utf-8') as f:
        lines = json.load(f)

    async def run():
        done = skipped = failed = 0
        for L in lines:
            path = os.path.join(OUT, f"{L['id']}.mp3")
            if os.path.exists(path) and not a.force:
                skipped += 1; continue
            try:
                en = L.get('lang') == 'en'
                tts = edge_tts.Communicate(L['text'], a.voice_en if en else a.voice, rate=a.rate_en if en else a.rate, pitch='+0Hz' if en else a.pitch)
                await tts.save(path)
                done += 1
                print(f"ok   {L['id']}  {L['text']}")
            except Exception as e:  # keep going; missing clips fall back to the device voice
                failed += 1
                print(f"FAIL {L['id']}: {e}")
        print(f"\n{done} generated, {skipped} already existed, {failed} failed -> {os.path.abspath(OUT)}")
        if failed: print('Run the script again to retry the failed ones.')

    asyncio.run(run())

if __name__ == '__main__':
    main()
