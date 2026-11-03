// Unit tests for the forgiving word matcher (src/match.ts). Run: npm test
import { phraseMatch, anyMatch, phoneticKey, editDistance, type Strictness } from '../src/match.ts';
import { WORD_LEVELS } from '../src/data/words.ts';

type Row = [target: string, heard: string, forgiving: boolean, normal: boolean, strict: boolean];
const Y = true, N = false;
// target, what the recognizer heard, accept in Forgiving / Normal / Strict
const TABLE: Row[] = [
  // the word anywhere in the phrase
  ['cat', 'cat', Y, Y, Y],
  ['cat', 'Cat.', Y, Y, Y],
  ['cat', 'the word is cat', Y, Y, N],
  ['cat', 'cat cat', Y, Y, Y],
  ['cat', 'uh cat', Y, Y, Y],
  ['cat', 'um the word is cat i think', Y, Y, N],
  // homophones, numbers, letter names
  ['two', '2', Y, Y, Y], ['for', '4', Y, Y, Y], ['one', 'won', Y, Y, Y], ['ten', '10', Y, Y, Y],
  ['see', 'c', Y, Y, Y], ['see', 'sea', Y, Y, Y], ['be', 'b', Y, Y, Y], ['you', 'u', Y, Y, Y], ['are', 'r', Y, Y, Y],
  ['no', 'know', Y, Y, Y], ['their', 'there', Y, Y, Y], ['red', 'read', Y, Y, Y],
  // common short-word misrecognitions
  ['a', 'uh', Y, Y, N], ['a', 'hey', Y, Y, N], ['a', 'eh', Y, Y, N],
  ['i', 'eye', Y, Y, Y], ['i', 'aye', Y, Y, Y], ['i', 'hi', Y, Y, N],
  ['in', 'and', Y, Y, N], ['in', 'an', Y, Y, N],
  ['it', 'eat', Y, Y, N], ['is', 'his', Y, Y, N], ['is', 'as', Y, Y, N],
  ['up', 'pup', Y, Y, N], ['up', 'yup', Y, Y, N],
  ['go', 'no', Y, Y, N], ['go', 'goal', Y, Y, N],
  ['he', 'hey', Y, Y, N], ['me', 'mean', Y, Y, N],
  ['run', 'ron', Y, Y, N], ['run', 'won', Y, Y, N],
  ['big', 'pig', Y, Y, N], ['the', 'duh', Y, Y, N], ['of', 'off', Y, Y, N],
  // phonetic near-misses / small slips
  ['cat', 'kat', Y, Y, N], ['cat', 'cut', Y, Y, N], ['fox', 'fax', Y, Y, N], ['phone', 'fone', Y, Y, N],
  ['ride', 'rid', Y, Y, N], ['thank', 'think', Y, Y, N], ['please', 'pleas', Y, Y, N],
  ['white', 'wight', Y, N, N], ['into', 'in to', Y, Y, Y], ['pretty', 'preddy', Y, N, N],
  ['brown', 'brownie', Y, Y, N], ['again', 'a gain', Y, Y, Y],
  ['cat', 'hat', Y, N, N], ['bed', 'bad', Y, Y, N], ['dog', 'dug', Y, Y, N], ['pen', 'pin', Y, Y, N],
  // clearly different words: always rejected
  ['cat', 'dog', N, N, N], ['cat', 'the dog', N, N, N], ['sun', 'moon', N, N, N], ['big', 'small', N, N, N],
  ['red', 'blue', N, N, N], ['go', 'stop', N, N, N], ['yes', 'no', N, N, N], ['the', 'cat', N, N, N],
  ['dog', 'cat', N, N, N], ['jam', 'toast', N, N, N], ['under', 'over', N, N, N], ['white', 'black', N, N, N],
  ['come', 'go', N, N, N], ['look', 'see', N, N, N], ['went', 'want', Y, Y, N], ['bus', 'car', N, N, N],
  ['pig', 'dog', N, N, N], ['fox', 'wolf', N, N, N], ['ten', 'two', N, N, N], ['after', 'before', N, N, N],
  ['a', 'the', N, N, N], ['i', 'you', N, N, N], ['it', 'cat', N, N, N],
  ['cat', '', N, N, N],
];

let fail = 0;
const modes: Strictness[] = ['forgiving', 'normal', 'strict'];
for (const [target, heard, ...want] of TABLE) {
  modes.forEach((m, i) => {
    const got = phraseMatch(heard, target, m).matched;
    if (got !== want[i]) { fail++; console.error(`FAIL [${m}] target "${target}" heard "${heard}": expected ${want[i] ? 'ACCEPT' : 'REJECT'}, got ${got ? 'ACCEPT' : 'REJECT'} (key ${phoneticKey(target)}/${phoneticKey(heard)})`); }
  });
}
// any alternative counts
if (!anyMatch(['the dog', 'that cat', 'the cap'], 'cat')) { fail++; console.error('FAIL anyMatch: should find "cat" in the 2nd alternative'); }
if (anyMatch(['dog', 'the dog', 'a log'], 'cat')) { fail++; console.error('FAIL anyMatch: no alternative says cat'); }
if (editDistance('kitten', 'sitting') !== 3) { fail++; console.error('FAIL editDistance'); }
for (const [w, k] of [['cat', 'KT'], ['kat', 'KT'], ['phone', 'FN'], ['knee', 'N'], ['ship', 'XP'], ['this', '0S'], ['box', 'BKS']] as const)
  if (phoneticKey(w) !== k) { fail++; console.error(`FAIL phoneticKey(${w}) = ${phoneticKey(w)}, want ${k}`); }
// every list word matches itself in every mode, and no list word accepts a completely different word ("zebra")
for (const w of WORD_LEVELS.flatMap((l) => l.words)) for (const m of modes) {
  if (!phraseMatch(w, w, m).matched) { fail++; console.error(`FAIL "${w}" does not match itself [${m}]`); }
  if (phraseMatch('zebra', w, m).matched) { fail++; console.error(`FAIL "${w}" accepted "zebra" [${m}]`); }
}
console.log(`matcher: ${TABLE.length} target/heard pairs x 3 modes, ${fail ? fail + ' FAILURES' : 'all OK'}`);
process.exit(fail ? 1 : 0);
