// Forgiving word matching for a beginning reader. Pure functions (no DOM) so they can be unit-tested.
//
// A recognizer result is a list of alternative transcripts (up to 10, from interim and final results).
// We accept if the target word shows up ANYWHERE in ANY alternative ("the word is cat", "uh cat", "cat cat"),
// either exactly or as a near-miss, depending on the grown-up's strictness setting.

export type Strictness = 'forgiving' | 'normal' | 'strict';
export const STRICTNESS_LEVELS: Strictness[] = ['forgiving', 'normal', 'strict'];

// Words that sound the same (any member counts for any other).
const HOMOPHONE_GROUPS: string[][] = [
  ['to', 'two', 'too', '2'], ['for', 'four', 'fore', '4'], ['there', 'their', 'theyre'],
  ['one', 'won', '1'], ['ate', 'eight', '8'], ['know', 'no'], ['knew', 'new'], ['by', 'buy', 'bye'],
  ['right', 'write'], ['hi', 'high'], ['so', 'sew', 'sow'], ['our', 'hour', 'are'], ['red', 'read'],
  ['sun', 'son'], ['see', 'sea', 'c'], ['be', 'bee', 'b'], ['would', 'wood'], ['here', 'hear'],
  ['which', 'witch'], ['way', 'weigh'], ['some', 'sum'], ['been', 'bin'], ['you', 'u'], ['why', 'y'],
  ['oh', 'o', 'owe'], ['eye', 'i', 'aye'], ['tea', 'tee', 't'], ['pea', 'pee', 'p'], ['jay', 'j'],
  ['cue', 'queue', 'q'], ['ex', 'x'], ['gee', 'g'], ['dee', 'd'], ['kay', 'k'], ['are', 'r'],
  ['zero', '0'], ['three', '3'], ['five', '5'], ['six', '6'], ['seven', '7'], ['nine', '9'], ['ten', '10'],
];

// What Chrome commonly hears instead of a short word a child says (one direction: target -> heard).
// Used in Normal and Forgiving.
const MISHEARD: Record<string, string[]> = {
  a: ['uh', 'hey', 'eh', 'ah', 'ay', 'huh', 'ey'],
  i: ['eye', 'aye', 'hi', 'ai', 'ah', 'high'],
  in: ['and', 'an', 'inn', 'n', 'end'],
  it: ['eat', 'its', 'hit', 'eet'],
  is: ['his', 'as', 'iz', 'ease', 'its'],
  up: ['pup', 'yup', 'op', 'app', 'uhp'],
  go: ['no', 'goal', 'goes', 'goat', 'gore'],
  he: ['hey', 'hee', 'hi', 'heat'],
  me: ['mean', 'mi', 'mee', 'meet', 'knee'],
  run: ['ron', 'won', 'rum', 'runs', 'rhon'],
  big: ['pig', 'bag', 'bigg'],
  pig: ['big', 'pick'],
  at: ['add', 'hat', 'ad', 'aat'],
  am: ['um', 'im', 'em', 'ham'],
  an: ['and', 'ann', 'anne', 'end'],
  and: ['an', 'in', 'end', 'n'],
  on: ['own', 'awn', 'om', 'ahn'],
  as: ['has', 'az', 'jazz'],
  of: ['off', 'uh', 'uv'],
  the: ['duh', 'da', 'thee', 'thuh', 'de'],
  my: ['mi', 'mine', 'mai'],
  we: ['wee', 'whee', 'oui', 'weed'],
  be: ['bee', 'bea', 'b'],
  by: ['buy', 'bye', 'bi'],
  do: ['due', 'dew', 'doo'],
  no: ['know', 'nope', 'snow'],
  so: ['sew', 'soh', 'sow', 'soap'],
  she: ['shee', 'cheese', 'sheet'],
  cat: ['kat', 'cap', 'kit'], hat: ['hot', 'had'], bed: ['bad', 'bet', 'bid'], cup: ['cop', 'cub'],
  hen: ['hand', 'hin'], ten: ['tan', 'tin'], sit: ['set', 'seat'], net: ['neat', 'knit', 'nat'],
  pen: ['pin', 'pan', 'ben'], map: ['mop', 'nap'], bug: ['book', 'bud', 'buck'], mud: ['mug', 'mad'],
  bat: ['bad', 'pat'], fan: ['fann', 'fam'], van: ['ban', 'vann'], kid: ['kit', 'kidd'], lip: ['lap', 'lib'],
  wig: ['week', 'wigg'], web: ['webb', 'wed'], zip: ['sip', 'zipp'], fox: ['fax', 'fogs', 'fux', 'foxx'],
  him: ['hymn', 'hem'], ask: ['asc', 'asked'], let: ['lett', 'led'], walk: ['wok', 'woke'],
  ran: ['rann', 'rand'], saw: ['sa', 'saul'],
};

const NUM_WORDS: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven',
  '8': 'eight', '9': 'nine', '10': 'ten', '11': 'eleven', '12': 'twelve', '20': 'twenty', '100': 'hundred',
};

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tokens(phrase: string): string[] {
  const p = normalize(phrase);
  return p ? p.split(' ').map((t) => NUM_WORDS[t] ?? t) : [];
}

/** Exact spellings that count as the target (itself + homophones + numerals + letter names). */
export function exactForms(target: string): Set<string> {
  const t = normalize(target);
  const out = new Set<string>([t]);
  if (NUM_WORDS[t]) out.add(NUM_WORDS[t]);
  for (const g of HOMOPHONE_GROUPS) if (g.includes(t)) g.forEach((w) => out.add(w));
  return out;
}

export function misheardForms(target: string): Set<string> {
  return new Set((MISHEARD[normalize(target)] || []).map(normalize));
}

/** Levenshtein edit distance. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/**
 * Phonetic key in the spirit of (Double) Metaphone, tuned for short English words:
 * consonant sounds only (vowels after the first letter dropped), digraphs mapped to one sound,
 * silent letters removed, repeats collapsed. "cat"/"kat" -> KT, "phone"/"fone" -> FN, "knee"/"nee" -> N.
 * With `loose`, voiced/unvoiced pairs merge too (b/p, d/t, g/k, v/f, z/s, j/ch): "big"/"pig" -> PK.
 */
export function phoneticKey(word: string, loose = false): string {
  let w = normalize(word).replace(/[^a-z]/g, '');
  if (!w) return '';
  w = w.replace(/^kn|^gn|^pn/, 'n').replace(/^wr/, 'r').replace(/^wh/, 'w').replace(/^x/, 's').replace(/mb$/, 'm');
  if (w.length > 2) w = w.replace(/e$/, ''); // silent final e
  let out = '';
  const isV = (c?: string) => !!c && 'aeiou'.includes(c);
  for (let i = 0; i < w.length; i++) {
    const c = w[i], n = w[i + 1];
    let k = '';
    if (isV(c) || c === 'y' && i > 0) { if (i === 0) k = 'A'; }
    else if (c === 'c') {
      if (n === 'h') { k = 'X'; i++; } else if (n === 'k') { k = 'K'; i++; } else k = !!n && 'eiy'.includes(n) ? 'S' : 'K';
    } else if (c === 's') { if (n === 'h') { k = 'X'; i++; } else k = 'S'; }
    else if (c === 't') { if (n === 'h') { k = '0'; i++; } else if (w.slice(i, i + 3) === 'tch') { k = 'X'; i += 2; } else k = 'T'; }
    else if (c === 'p') { if (n === 'h') { k = 'F'; i++; } else k = 'P'; }
    else if (c === 'g') {
      if (n === 'h') { i++; k = i + 1 >= w.length ? 'F' : ''; } // "laugh" ~ F, "night" silent
      else k = !!n && 'eiy'.includes(n) && i > 0 ? 'J' : 'K';
    } else if (c === 'q') k = 'K';
    else if (c === 'x') k = 'KS';
    else if (c === 'z') k = 'S';
    else if (c === 'h') k = i === 0 && isV(n) ? 'H' : '';
    else if (c === 'w') k = isV(n) ? 'W' : '';
    else if (c === 'y') k = 'Y';
    else if (c === 'd' && n === 'g' && !!w[i + 2] && 'eiy'.includes(w[i + 2])) { k = 'J'; i++; }
    else k = c.toUpperCase();
    for (const ch of k) if (out[out.length - 1] !== ch) out += ch;
  }
  if (loose) out = out.replace(/B/g, 'P').replace(/D/g, 'T').replace(/G/g, 'K').replace(/V/g, 'F').replace(/J/g, 'X').replace(/(.)\1+/g, '$1');
  return out;
}

export interface MatchResult { matched: boolean; heard: string; how?: 'exact' | 'misheard' | 'sounds-like' | 'close' }

/** Does one heard token count as the target? */
export function tokenMatches(tok: string, target: string, mode: Strictness): MatchResult['how'] | undefined {
  const t = normalize(target);
  if (!tok) return;
  if (exactForms(t).has(tok)) return 'exact';
  if (mode === 'strict') return;
  if (misheardForms(t).has(tok)) return 'misheard';
  const len = t.length, d = editDistance(tok, t);
  const kt = phoneticKey(t), kh = phoneticKey(tok);
  if (mode === 'normal') {
    // same consonant sounds AND only a letter or two off (cat/kat, cat/cut, phone/fone)
    if (len >= 3 && kt === kh && d <= (len <= 3 ? 1 : 2)) return 'sounds-like';
    if (len >= 5 && d <= 1) return 'close';
    return;
  }
  // forgiving
  if (kt && kt === kh && (len >= 3 || d <= 1)) return 'sounds-like';
  if (len >= 3 && len <= 4 && d <= 1) return 'close';
  if (len >= 5 && d <= 1) return 'close';
  // two letters off on a longer word only if it starts and ends the same way ("pretty"/"preddy", not "every"/"over")
  if (len >= 5 && d === 2 && tok[0] === t[0] && tok[tok.length - 1] === t[len - 1] && tok.length >= len - 1) return 'close';
  if (len >= 3 && phoneticKey(t, true) === phoneticKey(tok, true) && d <= 2) return 'sounds-like';
}

/** True if any word of a recognized phrase counts as reading `target`. */
export function phraseMatch(phrase: string, target: string, mode: Strictness = 'forgiving'): MatchResult {
  const heard = phrase.trim();
  const toks = tokens(phrase);
  const t = normalize(target);
  if (!toks.length) return { matched: false, heard };
  // Strict: the target must be (nearly) the whole answer, at most 3 words ("um cat").
  if (mode === 'strict' && toks.length > 3) return { matched: false, heard };
  // Joined forms catch "in to" -> "into", "some thing" -> "something", and "c a t" spelled out.
  const cands = [...toks, toks.join('')];
  for (let i = 0; i + 1 < toks.length; i++) cands.push(toks[i] + toks[i + 1]);
  // Multi-word targets ("thank you"): accept the phrase containing it.
  if (t.includes(' ') && normalize(phrase).includes(t)) return { matched: true, heard, how: 'exact' };
  let best: MatchResult['how'];
  const rank = { exact: 0, misheard: 1, 'sounds-like': 2, close: 3 } as const;
  for (const c of cands) {
    const how = tokenMatches(c, t, mode);
    if (how && (!best || rank[how] < rank[best])) best = how;
  }
  return best ? { matched: true, heard, how: best } : { matched: false, heard };
}

/** Check every alternative transcript. */
export function anyMatch(alternatives: string[], target: string, mode: Strictness = 'forgiving'): MatchResult | null {
  for (const a of alternatives) { const r = phraseMatch(a, target, mode); if (r.matched) return r; }
  return null;
}
