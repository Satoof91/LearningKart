"""A/B listening page over several bench folders (one column per engine), for the owner's ear.
python tools/voice-qa/bench_page.py bench/spaces/habibi bench/spaces/silma ... -> tools/voice-qa/listen-bench.html
Each row = one text; one play button per engine (red when the machine said 'check'), the machine's reading under
it; ✅/❌ per engine, saved in the browser (localStorage key lk-bench-review)."""
import os, sys, json, html

HERE = os.path.dirname(os.path.abspath(__file__))
folders = [os.path.join(HERE, d) if not os.path.isabs(d) else d for d in sys.argv[1:]]
names = [os.path.basename(d) for d in folders]
J = {}
for d, n in zip(folders, names):
    p = os.path.join(d, 'judge.json')
    J[n] = {r['id']: r for r in json.load(open(p, encoding='utf-8'))} if os.path.exists(p) else {}
    for f in os.listdir(d):
        if f.endswith('.txt') and not f.startswith('_ref'):
            i = f[:-4]; J[n].setdefault(i, {'id': i, 'text': open(os.path.join(d, f), encoding='utf-8').read().strip()})
ids = []
for n in names:
    for i in J[n]:
        if i not in ids: ids.append(i)
rows = []
for i in ids:
    text = next((J[n][i]['text'] for n in names if i in J[n]), i)
    cells = []
    for n, d in zip(names, folders):
        r = J[n].get(i); wav = i + ('.cut.wav' if os.path.exists(os.path.join(d, i + '.cut.wav')) else '.wav')
        rel = os.path.relpath(os.path.join(d, wav), HERE).replace('\\', '/')
        if not r or not os.path.exists(os.path.join(d, i + '.wav')): cells.append('<td class="none">—</td>'); continue
        bad = r.get('verdict') == 'check'
        cells.append(f'<td><button class="play{" low" if bad else ""}" data-src="{rel}">▶</button>'
                     f'<small>{html.escape(r.get("why") or "pass")}<br>«{html.escape(r.get("heard", "")[:40])}»</small>'
                     f'<div class="mark" data-k="{i}|{n}"><button class="ok">✅</button><button class="bad">❌</button></div></td>')
    rows.append(f'<tr><th>{html.escape(text)}<br><small>{i}</small></th>{"".join(cells)}</tr>')
head = ''.join(f'<th>{html.escape(n)}</th>' for n in names)
page = f'''<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><title>مقارنة محرّكات الصوت</title>
<style>body{{font-family:system-ui;margin:16px;background:#fafafa}}table{{border-collapse:collapse;width:100%}}
th,td{{border:1px solid #ddd;padding:6px;vertical-align:top;text-align:right}}th{{background:#f0f0f0}}
button.play{{font-size:18px;padding:4px 12px;background:#2e7d32;color:#fff;border:0;border-radius:6px;cursor:pointer}}
button.play.low{{background:#c62828}}small{{color:#555;display:block;margin-top:4px}}td.none{{color:#aaa;text-align:center}}
.mark button{{margin:2px;font-size:14px;cursor:pointer;opacity:.45}}.mark button.on{{opacity:1;outline:2px solid #333}}
.note{{color:#444;margin-bottom:12px}}</style>
<h1>مقارنة محرّكات الصوت (نماذج مفتوحة على Hugging Face)</h1>
<p class="note">كل عمود محرّك، وكل المحرّكات تقلّد صوت Amal من مقطع مرجعي واحد. الزر الأحمر = الآلة شكّت فيه، والأخضر = اجتاز الفحص. علّم ✅ أو ❌ لكل خلية؛ العلامات تُحفَظ في المتصفح.</p>
<table><tr><th>النص</th>{head}</tr>{"".join(rows)}</table>
<script>
const K='lk-bench-review';let st=JSON.parse(localStorage.getItem(K)||'{{}}');
document.querySelectorAll('button.play').forEach(b=>b.onclick=()=>{{const a=new Audio(b.dataset.src);a.play();}});
document.querySelectorAll('.mark').forEach(m=>{{const k=m.dataset.k;const [ok,bad]=m.querySelectorAll('button');
const draw=()=>{{ok.classList.toggle('on',st[k]==='ok');bad.classList.toggle('on',st[k]==='bad');}};draw();
ok.onclick=()=>{{st[k]='ok';localStorage.setItem(K,JSON.stringify(st));draw();}};
bad.onclick=()=>{{st[k]='bad';localStorage.setItem(K,JSON.stringify(st));draw();}};}});
</script></html>'''
out = os.path.join(HERE, 'listen-bench.html'); open(out, 'w', encoding='utf-8').write(page)
print('wrote', out, len(ids), 'rows x', len(names), 'engines')
