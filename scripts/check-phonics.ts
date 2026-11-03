// Checks that every word in every list has a phonics breakdown whose chunks spell the word,
// that every sound id is known, magic-e links resolve, and every clip file exists.
// Run: npm test   (node --experimental-strip-types scripts/check-phonics.ts)
import { WORD_LEVELS } from '../src/data/words.ts';
import { BREAKDOWNS, PHONEMES, DEMO_WORDS, breakdown, allClips } from '../src/data/phonics.ts';
import fs from 'node:fs';

let fail = 0, n = 0;
const bad = (m: string) => { fail++; console.error('FAIL', m); };
for (const lvl of WORD_LEVELS) for (const w of lvl.words) {
  n++;
  const ch = breakdown(w);
  if (!ch) { bad(`${lvl.id}: "${w}" has no breakdown`); continue; }
  const joined = ch.map((c) => c.text).join('');
  if (joined !== w) bad(`"${w}": chunks spell "${joined}"`);
  for (const c of ch) for (const s of c.sounds) if (!PHONEMES[s]) bad(`"${w}": unknown sound id "${s}"`);
  for (const c of ch) if (c.kind === 'magicE' && c.sounds.length && c.linkTo < 0) bad(`"${w}": magic-e vowel without final e`);
  if (!ch.some((c) => c.sounds.length)) bad(`"${w}": no sounds`);
}
const all = new Set([...WORD_LEVELS.flatMap((l) => l.words), ...DEMO_WORDS]);
for (const w of DEMO_WORDS) { const ch = breakdown(w); if (!ch || ch.map((c) => c.text).join('') !== w) bad(`demo "${w}" breakdown`); }
for (const w of Object.keys(BREAKDOWNS)) if (!all.has(w)) bad(`breakdown for "${w}" is not in any word list`);
if (fs.existsSync('public/audio/manifest.json')) {
  const man = JSON.parse(fs.readFileSync('public/audio/manifest.json', 'utf8'));
  for (const c of allClips()) if (!man.sounds.includes(c)) bad(`missing sound clip "${c}"`);
  for (const w of all) if (!man.words.includes(w)) bad(`missing word clip "${w}"`);
  for (const f of [...man.sounds.map((s: string) => `sounds/${s.replace(/\+/g, "_")}`), ...man.words.map((s: string) => `words/${s}`)])
    if (!fs.existsSync(`public/audio/${f}.mp3`)) bad(`missing file public/audio/${f}.mp3`);
} else bad('public/audio/manifest.json missing (run scripts/gen-phonics-audio.py)');
console.log(`${n} words checked, ${allClips().length} distinct sound clips, ${fail ? fail + ' FAILURES' : 'all OK'}`);
process.exit(fail ? 1 : 0);
