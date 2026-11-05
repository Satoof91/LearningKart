// Voice pack generator.
//   npm run voice            -> writes assets/voice/lines.csv + lines.json (the script for recording)
//   AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=uaenorth npm run voice
//                            -> also generates every missing clip with Azure neural Arabic voices (licensed for apps)
// Options (env): AZURE_VOICE (default ar-SA-ZariyahNeural; also ar-SA-HamedNeural, ar-EG-SalmaNeural ...),
//                VOICE_RATE (default -8%), VOICE_PITCH (default +4%), FORCE=1 to regenerate existing files.
// Recording a real voice instead: save each line as assets/voice/<id>.mp3 (names from lines.csv), then npm run build.
import fs from 'fs';
import path from 'path';
import { voiceLines } from '../src/data.js';

const dir = path.resolve('assets/voice');
fs.mkdirSync(dir, { recursive: true });
const lines = voiceLines();
fs.writeFileSync(path.join(dir, 'lines.json'), JSON.stringify(lines, null, 2));
const csv = '﻿id,text,note\n' + lines.map(l => [l.id, l.text, l.note].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
fs.writeFileSync(path.join(dir, 'lines.csv'), csv);
console.log(`${lines.length} lines -> assets/voice/lines.csv`);

const key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION;
if (!key || !region) {
  const have = lines.filter(l => fs.existsSync(path.join(dir, l.id + '.mp3'))).length;
  console.log(`${have}/${lines.length} clips present. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to generate the missing ones.`);
  process.exit(0);
}
const voice = process.env.AZURE_VOICE || 'ar-SA-ZariyahNeural';
const rate = process.env.VOICE_RATE || '-8%', pitch = process.env.VOICE_PITCH || '+4%';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
(async () => {
  let made = 0;
  for (const l of lines) {
    const file = path.join(dir, l.id + '.mp3');
    if (fs.existsSync(file) && !process.env.FORCE) continue;
    const ssml = `<speak version="1.0" xml:lang="ar-SA"><voice name="${voice}"><prosody rate="${rate}" pitch="${pitch}">${esc(l.text)}</prosody></voice></speak>`;
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'learningkart-voice' },
      body: ssml
    });
    if (!res.ok) { console.error(`${l.id}: HTTP ${res.status} ${await res.text()}`); process.exit(1); }
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    made++; process.stdout.write(`\r${made} generated (${l.id})        `);
    await new Promise(r => setTimeout(r, 120));
  }
  console.log(`\ndone: ${made} new clips with ${voice}. Run npm run build (or npm run sync) to bundle them.`);
})();
