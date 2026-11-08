"""Build tools/voice-qa/listen.html: a page to check Arabic clips by ear, with A/B candidates.
python tools/voice-qa/listen.py [--cand ar-EG-ShakirNeural,ar-BH-AliNeural] [--only haraka,letter]
Each line shows ▶ per candidate voice (from tools/voice-qa/cand/<voice>/) plus the installed clip, the
scorer's verdict, and ✅/❌ + a note. "Copy results" gives a JSON the owner can paste back."""
import json, os, html, argparse, re

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
VOICE = os.path.join(ROOT, 'assets', 'voice')
ap = argparse.ArgumentParser(); ap.add_argument('--cand', default=''); ap.add_argument('--only', default=''); a = ap.parse_args()
cands = [c for c in a.cand.split(',') if c]
pref = [p for p in a.only.split(',') if p]
lines = json.load(open(os.path.join(VOICE, 'lines.json'), encoding='utf-8'))
rep = {}
for c in cands:
    p = os.path.join(HERE, 'cand', c, 'report.json')
    if os.path.exists(p): rep[c] = {r['id']: r for r in json.load(open(p, encoding='utf-8'))}

def group(i):
    if i.startswith('haraka'): return 'الحركات (بَ بِ بُ)'
    if i.startswith('letter'): return 'الحروف'
    if i.startswith('number'): return 'الأرقام'
    if i.startswith('word'): return 'الكلمات'
    return 'عبارات عامة'
ar = [l for l in lines if l.get('lang') != 'en' and (not pref or any(l['id'].startswith(p) for p in pref))]
order = ['الحروف', 'الحركات (بَ بِ بُ)', 'الأرقام', 'الكلمات', 'عبارات عامة']
rows = []
for g in order:
    items = [l for l in ar if group(l['id']) == g]
    if not items: continue
    # lines any candidate flagged come first
    items.sort(key=lambda l: 0 if any(rep.get(c, {}).get(l['id'], {}).get('verdict') == 'check' for c in cands) else 1)
    rows.append(f'<h2>{g} <small>({len(items)})</small></h2>')
    for l in items:
        btns, info = [], []
        for k, c in enumerate(cands):
            r = rep.get(c, {}).get(l['id'], {})
            sc = r.get('score'); flag = r.get('why') or ''
            bad = r.get('verdict') == 'check'
            btns.append(f'<button class="play{" low" if bad else ""}" data-src="cand/{c}/{l["id"]}.mp3" title="{html.escape(c)}">{"ABCD"[k]}</button>')
            info.append(f'{"ABCD"[k]}={c.split("-")[2].replace("Neural", "")}: {sc if sc is not None else "—"} {html.escape(flag.strip())} «{html.escape((r.get("heard") or "")[:30])}»')
        inst = os.path.join(VOICE, l['id'] + '.mp3')
        btns.append(f'<button class="play inst" data-src="../../assets/voice/{l["id"]}.mp3" title="installed">▶</button>' if os.path.exists(inst) else '<span class="noinst">—</span>')
        rows.append(f'<div class="row" data-id="{l["id"]}"><div class="btns">{"".join(btns)}</div>'
                    f'<div class="txt"><b>{html.escape(l["text"])}</b><br><small>{l["id"]} · {" · ".join(info)}</small></div>'
                    f'<button class="ok">✅</button><button class="bad">❌</button><input class="note" placeholder="ملاحظة"></div>')

legend = ' · '.join(f'<b>{"ABCD"[k]}</b> = {c}' for k, c in enumerate(cands)) + (' · <b>▶</b> = المثبّت حالياً في اللعبة' if cands else '')
page = f"""<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LearningKart – مراجعة الأصوات</title>
<style>
body{{font-family:system-ui,'Segoe UI',Tahoma,sans-serif;max-width:1040px;margin:0 auto;padding:16px;background:#f6f4ff;color:#2b1b6b}}
h1{{margin:.2em 0}} h2{{margin-top:1.4em;border-bottom:2px solid #d9d2fb}}
.bar{{position:sticky;top:0;background:#f6f4ff;padding:8px 0;z-index:2;display:flex;gap:10px;align-items:center;flex-wrap:wrap}}
.row{{display:flex;gap:8px;align-items:center;background:#fff;border-radius:12px;padding:8px 10px;margin:6px 0;border:2px solid transparent}}
.row.okd{{background:#ebfbee}} .row.badd{{background:#fff0f0;border-color:#ff6b6b}}
.btns{{display:flex;gap:4px}} .txt{{flex:1;font-size:20px}} .txt small{{font-size:12px;color:#6b5fa8}}
button{{font-size:18px;border:0;border-radius:10px;padding:6px 10px;cursor:pointer;background:#e9e4ff}}
.play{{background:#7048e8;color:#fff;min-width:40px}} .play.low{{background:#f08c00}} .play.inst{{background:#2b8a3e}}
.note{{width:200px;font-size:14px;padding:6px;border-radius:8px;border:1px solid #ccc}} #out{{width:100%;height:120px;font-family:monospace;direction:ltr}}
.noinst{{opacity:.4;padding:0 10px}}
</style></head><body>
<h1>مراجعة أصوات LearningKart</h1>
<p>{legend}</p>
<p>اضغط الحرف لسماع المرشّح (البرتقالي = جهاز الفحص شكّ فيه، وهذه تأتي أولاً في كل قسم). ✅ إذا النطق صحيح 100%، ❌ إذا فيه خطأ، واكتب أي ملاحظة (مثلاً: A صحيح، B يقول «بي»). في النهاية اضغط «نسخ النتائج» وأرسلها.</p>
<div class="bar"><button id="next">▶ التالي غير المُراجَع</button><span id="count"></span><button id="copy">نسخ النتائج</button></div>
{''.join(rows)}
<h2>النتائج</h2><textarea id="out" readonly></textarea>
<script>
const KEY='lk-voice-review2', st=JSON.parse(localStorage.getItem(KEY)||'{{}}'); let audio=new Audio();
const rows=[...document.querySelectorAll('.row')];
function paint(){{ let d=0; rows.forEach(r=>{{const s=st[r.dataset.id]; r.classList.toggle('okd',s&&s.v==='ok'); r.classList.toggle('badd',s&&s.v==='bad'); if(s&&s.n) r.querySelector('.note').value=s.n; if(s&&s.v) d++;}});
  document.getElementById('count').textContent=d+' / '+rows.length+' تمت مراجعتها';
  const bad=Object.entries(st).filter(([k,v])=>v.v==='bad').map(([k,v])=>k+': '+(v.n||''));
  const ok=Object.entries(st).filter(([k,v])=>v.v==='ok').map(([k,v])=>k+(v.n?': '+v.n:''));
  document.getElementById('out').value=JSON.stringify({{reviewed:d,total:rows.length,wrong:bad,ok:ok}},null,1); localStorage.setItem(KEY,JSON.stringify(st)); }}
rows.forEach(r=>{{const id=r.dataset.id;
  r.querySelectorAll('.play').forEach(b=>b.onclick=()=>{{audio.pause(); audio=new Audio(b.dataset.src); audio.play(); r.scrollIntoView({{block:'center'}});}});
  r.querySelector('.ok').onclick=()=>{{st[id]={{v:'ok',n:r.querySelector('.note').value}}; paint();}};
  r.querySelector('.bad').onclick=()=>{{st[id]={{v:'bad',n:r.querySelector('.note').value}}; paint();}};
  r.querySelector('.note').onchange=e=>{{st[id]=Object.assign(st[id]||{{}},{{n:e.target.value}}); paint();}};}});
document.getElementById('next').onclick=()=>{{const r=rows.find(r=>!st[r.dataset.id]); if(r) r.querySelector('.play').click();}};
document.getElementById('copy').onclick=()=>{{const t=document.getElementById('out'); t.select(); navigator.clipboard.writeText(t.value);}};
paint();
</script></body></html>"""
open(os.path.join(HERE, 'listen.html'), 'w', encoding='utf-8').write(page)
print('wrote listen.html', len(ar), 'lines, candidates:', cands)
