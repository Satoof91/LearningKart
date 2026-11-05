// Bundles src/main.js (three.js + Capacitor plugins) and inlines it into www/index.html.
// Voice clips in assets/voice/<id>.mp3 are embedded too (fully offline, one file).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
fs.mkdirSync('www', { recursive: true });
execSync('npx esbuild src/main.js --bundle --minify --format=iife --target=es2020 --loader:.woff2=dataurl --outfile=www/game.js', { stdio: 'inherit' });
const js = fs.readFileSync('www/game.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const clips = {};
const vdir = path.join('assets', 'voice');
if (fs.existsSync(vdir)) for (const f of fs.readdirSync(vdir)) {
  const m = f.match(/^(.+)\.(mp3|m4a|ogg|wav)$/i); if (!m) continue;
  const mime = { mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav' }[m[2].toLowerCase()];
  clips[m[1]] = `data:${mime};base64,` + fs.readFileSync(path.join(vdir, f)).toString('base64');
}
const html = fs.readFileSync('template.html', 'utf8').replace('<script>/*GAME*/</script>', () => '<script>window.LK_CLIPS=' + JSON.stringify(clips) + ';</script>\n<script>' + js + '</script>');
fs.writeFileSync('www/index.html', html);
fs.unlinkSync('www/game.js');
console.log('www/index.html', (html.length / 1024).toFixed(0) + ' KB', '| voice clips:', Object.keys(clips).length);
