"""Build tools/voice-qa/listen.html: a page to check every Arabic clip by ear.
python tools/voice-qa/listen.py   (after asr.py, so the "heard" column is filled)
Open the page in a browser (double-click), mark each clip OK / wrong, then "Copy results" and paste them back."""
import json, os, html

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.path.join(HERE, '..', '..', 'assets', 'voice')
lines = json.load(open(os.path.join(VOICE, 'lines.json'), encoding='utf-8'))
rep = {}
if os.path.exists(os.path.join(HERE, 'report.json')):
    rep = {r['id']: r for r in json.load(open(os.path.join(HERE, 'report.json'), encoding='utf-8'))}

def group(i):
    if i.startswith('haraka'): return 'الحركات (بَ بِ بُ)'
    if i.startswith('letter'): return 'الحروف'
    if i.startswith('number'): return 'الأرقام'
    if i.startswith('word'): return 'الكلمات'
    return 'عبارات عامة'

ar = [l for l in lines if l.get('lang') != 'en']
order = ['الحروف', 'الحركات (بَ بِ بُ)', 'الأرقام', 'الكلمات', 'عبارات عامة']
rows = []
for g in order:
    items = [l for l in ar if group(l['id']) == g]
    if not items: continue
    rows.append(f'<h2>{g} <small>({len(items)})</small></h2>')
    for l in items:
        r = rep.get(l['id'], {})
        sc = r.get('score')
        flag = ' low' if sc is not None and sc < 0.8 else ''
        rows.append(
            f'<div class="row{flag}" data-id="{l["id"]}">'
            f'<button class="play" data-src="../../assets/voice/{l["id"]}.mp3">▶</button>'
            f'<div class="txt"><b>{html.escape(l["text"])}</b><br><small>{l["id"]} · سُمِع: {html.escape(r.get("heard", "—"))}'
            f'{"" if sc is None else f" · {sc}"}</small></div>'
            f'<button class="ok">✅</button><button class="bad">❌</button>'
            f'<input class="note" placeholder="ملاحظة (مثلاً: يقول باب بدل باء)"></div>')

page = f"""<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>LearningKart – مراجعة الأصوات</title>
<style>
body{{font-family:system-ui,'Segoe UI',Tahoma,sans-serif;max-width:980px;margin:0 auto;padding:16px;background:#f6f4ff;color:#2b1b6b}}
h1{{margin:.2em 0}} h2{{margin-top:1.4em;border-bottom:2px solid #d9d2fb}}
.bar{{position:sticky;top:0;background:#f6f4ff;padding:8px 0;z-index:2;display:flex;gap:10px;align-items:center;flex-wrap:wrap}}
.row{{display:flex;gap:8px;align-items:center;background:#fff;border-radius:12px;padding:8px 10px;margin:6px 0;border:2px solid transparent}}
.row.low{{border-color:#ffc078}} .row.okd{{background:#ebfbee}} .row.badd{{background:#fff0f0;border-color:#ff6b6b}}
.txt{{flex:1;font-size:20px}} .txt small{{font-size:13px;color:#6b5fa8}}
button{{font-size:20px;border:0;border-radius:10px;padding:6px 12px;cursor:pointer;background:#e9e4ff}}
.play{{background:#7048e8;color:#fff}} .note{{width:220px;font-size:14px;padding:6px;border-radius:8px;border:1px solid #ccc}}
#out{{width:100%;height:120px;font-family:monospace;direction:ltr}}
</style></head><body>
<h1>مراجعة أصوات LearningKart</h1>
<p>اضغط ▶ واستمع. ✅ إذا النطق صحيح 100%، ❌ إذا فيه خطأ واكتب الملاحظة. الإطار البرتقالي = جهاز التعرّف على الكلام شكّ فيه (دليل وليس حكماً).
زر «التالي» يشغّل المقطع التالي غير المُراجَع. في النهاية اضغط «نسخ النتائج» وأرسلها.</p>
<div class="bar"><button id="next">▶ التالي غير المُراجَع</button><button id="onlylow">إظهار المشكوك فيها فقط</button>
<span id="count"></span><button id="copy">نسخ النتائج</button></div>
{''.join(rows)}
<h2>النتائج</h2><textarea id="out" readonly></textarea>
<script>
const KEY='lk-voice-review', st=JSON.parse(localStorage.getItem(KEY)||'{{}}'); let audio=new Audio();
const rows=[...document.querySelectorAll('.row')];
function paint(){{ let d=0; rows.forEach(r=>{{const s=st[r.dataset.id]; r.classList.toggle('okd',s&&s.v==='ok'); r.classList.toggle('badd',s&&s.v==='bad'); if(s&&s.n) r.querySelector('.note').value=s.n; if(s&&s.v) d++;}});
  document.getElementById('count').textContent=d+' / '+rows.length+' تمت مراجعتها';
  const bad=Object.entries(st).filter(([k,v])=>v.v==='bad').map(([k,v])=>k+': '+(v.n||''));
  document.getElementById('out').value=JSON.stringify({{reviewed:d,total:rows.length,wrong:bad}},null,1); localStorage.setItem(KEY,JSON.stringify(st)); }}
rows.forEach(r=>{{const id=r.dataset.id;
  r.querySelector('.play').onclick=()=>{{audio.pause(); audio=new Audio(r.querySelector('.play').dataset.src); audio.play(); r.scrollIntoView({{block:'center'}});}};
  r.querySelector('.ok').onclick=()=>{{st[id]={{v:'ok',n:''}}; paint();}};
  r.querySelector('.bad').onclick=()=>{{st[id]={{v:'bad',n:r.querySelector('.note').value}}; paint();}};
  r.querySelector('.note').onchange=e=>{{st[id]=Object.assign(st[id]||{{}},{{n:e.target.value}}); if(!st[id].v) st[id].v='bad'; paint();}};}});
document.getElementById('next').onclick=()=>{{const r=rows.find(r=>!st[r.dataset.id]&&r.style.display!=='none'); if(r) r.querySelector('.play').click();}};
let low=false; document.getElementById('onlylow').onclick=()=>{{low=!low; rows.forEach(r=>r.style.display=low&&!r.classList.contains('low')&&!r.classList.contains('badd')?'none':'');}};
document.getElementById('copy').onclick=()=>{{const t=document.getElementById('out'); t.select(); navigator.clipboard.writeText(t.value);}};
paint();
</script></body></html>"""
open(os.path.join(HERE, 'listen.html'), 'w', encoding='utf-8').write(page)
print('wrote', os.path.join(HERE, 'listen.html'), len(ar), 'Arabic clips')
