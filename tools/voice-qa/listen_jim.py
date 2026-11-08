"""A one-question listening page: which voices say ج correctly (MSA /dʒ/, not Egyptian g, not Levantine ʒ)?
python tools/voice-qa/listen_jim.py --voices ar-IQ-BasselNeural,ar-QA-MoazNeural,...
Rows = voices (in the given order); buttons = جَ جَ جَ, جِيم, جَمَل, هَيَّا نَجْمَعُ حَرْفَ بَاء from bench/jim/<voice>/.
Writes tools/voice-qa/listen-jim.html; the owner marks ✅/❌ per voice and copies the result."""
import os, html, argparse
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('--voices', required=True); a = ap.parse_args()
PROBES = [('ja', 'جَ'), ('ji', 'جِ'), ('ju', 'جُ'), ('jim', 'جِيم'), ('jamal', 'جَمَل'), ('najma', 'هَيَّا نَجْمَعُ حَرْفَ بَاء')]
rows = []
for v in a.voices.split(','):
    d = os.path.join(HERE, 'bench', 'jim', v)
    btns = ''.join(f'<button class="play" data-src="bench/jim/{v}/{pid}.mp3">{html.escape(t)}</button>' for pid, t in PROBES if os.path.exists(os.path.join(d, pid + '.mp3')))
    heard = []
    for pid, t in PROBES:
        hp = os.path.join(d, pid + '.mp3.heard.txt')
        if os.path.exists(hp): heard.append(f'{t}→{open(hp, encoding="utf-8").read()[:25]}')
    rows.append(f'<div class="row" data-id="{v}"><div class="name">{v}<br><small>{html.escape(" · ".join(heard))}</small></div><div class="btns">{btns}</div>'
                f'<button class="ok">✅</button><button class="bad">❌</button><input class="note" placeholder="ملاحظة"></div>')
page = f"""<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LearningKart – أي صوت ينطق الجيم صحيحة؟</title>
<style>body{{font-family:system-ui,Tahoma,sans-serif;max-width:1100px;margin:0 auto;padding:16px;background:#f6f4ff;color:#2b1b6b}}
.row{{display:flex;gap:8px;align-items:center;background:#fff;border-radius:12px;padding:8px 10px;margin:6px 0;border:2px solid transparent}}
.row.okd{{background:#ebfbee}} .row.badd{{background:#fff0f0;border-color:#ff6b6b}} .name{{width:260px;font-size:15px}} .name small{{color:#6b5fa8;font-size:11px}}
.btns{{display:flex;gap:4px;flex:1;flex-wrap:wrap}} button{{font-size:17px;border:0;border-radius:10px;padding:6px 10px;cursor:pointer;background:#e9e4ff}}
.play{{background:#7048e8;color:#fff}} .note{{width:220px;font-size:14px;padding:6px;border-radius:8px;border:1px solid #ccc}} #out{{width:100%;height:100px;font-family:monospace;direction:ltr}}</style></head><body>
<h1>أي صوت ينطق الجيم صحيحة؟</h1>
<p>سؤال واحد فقط: اسمع «جَ» و«جِيم» و«جَمَل» و«نَجْمَعُ» من كل صوت. ✅ إذا الجيم فصحى واضحة (ليست «غ/ج شامية» ولا «گ مصرية»)، ❌ إذا لا. الصوت المختار سيُستخدم لكل العربية، فالجيم أهم من أي شيء آخر هنا. ثم «نسخ النتائج» وأرسلها لي.</p>
<div style="position:sticky;top:0;background:#f6f4ff;padding:8px 0"><button id="copy">نسخ النتائج</button> <span id="count"></span></div>
{''.join(rows)}
<h2>النتائج</h2><textarea id="out" readonly></textarea>
<script>
const KEY='lk-jim-review', st=JSON.parse(localStorage.getItem(KEY)||'{{}}'); let audio=new Audio(); const rows=[...document.querySelectorAll('.row')];
function paint(){{ let d=0; rows.forEach(r=>{{const s=st[r.dataset.id]; r.classList.toggle('okd',s&&s.v==='ok'); r.classList.toggle('badd',s&&s.v==='bad'); if(s&&s.n) r.querySelector('.note').value=s.n; if(s&&s.v) d++;}});
  document.getElementById('count').textContent=d+' / '+rows.length; document.getElementById('out').value=JSON.stringify(st); localStorage.setItem(KEY,JSON.stringify(st)); }}
rows.forEach(r=>{{const id=r.dataset.id; r.querySelectorAll('.play').forEach(b=>b.onclick=()=>{{audio.pause(); audio=new Audio(b.dataset.src); audio.play();}});
  r.querySelector('.ok').onclick=()=>{{st[id]={{v:'ok',n:r.querySelector('.note').value}}; paint();}}; r.querySelector('.bad').onclick=()=>{{st[id]={{v:'bad',n:r.querySelector('.note').value}}; paint();}};
  r.querySelector('.note').onchange=e=>{{st[id]=Object.assign(st[id]||{{}},{{n:e.target.value}}); paint();}};}});
document.getElementById('copy').onclick=()=>{{const t=document.getElementById('out'); t.select(); navigator.clipboard.writeText(t.value);}}; paint();
</script></body></html>"""
open(os.path.join(HERE, 'listen-jim.html'), 'w', encoding='utf-8').write(page); print('wrote listen-jim.html', len(rows), 'voices')
