// Hand-authored phonics breakdowns for every word in words.ts.
//
// Notation (one string per word, chunks separated by spaces):
//   letters            chunk whose sound id equals its letters (m, sh, ch, ck->see below)
//   letters=snd        chunk "letters" makes sound id "snd" (ids are listed in PHONEMES)
//   letters=a+b        chunk makes two or more sounds glued together (endings like ing, all)
//   letters=_          silent letters
//   a^=ay ... e=_      magic-e: the vowel marked ^ is linked by an arc to the final silent e
//   !letters=snd       tricky "heart part" of a sight word (does not follow the usual rule)
//   b-l                blend: separate sounds, drawn as adjacent tiles joined by a bar
//
// Every word's chunks must concatenate back to the word (checked by scripts/check-phonics.ts).

/** Phoneme ids → how a grown-up would write the sound for a kid, and the IPA used to make the clip. */
export const PHONEMES: Record<string, { say: string; ipa: string; kind: 'stop' | 'cont' | 'vowel' | 'combo' }> = {
  // consonants
  b: { say: '/b/', ipa: 'b', kind: 'stop' },
  d: { say: '/d/', ipa: 'd', kind: 'stop' },
  g: { say: '/g/', ipa: 'ɡ', kind: 'stop' },
  p: { say: '/p/', ipa: 'p', kind: 'stop' },
  t: { say: '/t/', ipa: 't', kind: 'stop' },
  k: { say: '/k/', ipa: 'k', kind: 'stop' },
  ch: { say: '/ch/', ipa: 'tʃ', kind: 'stop' },
  j: { say: '/j/', ipa: 'dʒ', kind: 'stop' },
  f: { say: '/fff/', ipa: 'f', kind: 'cont' },
  v: { say: '/vvv/', ipa: 'v', kind: 'cont' },
  s: { say: '/sss/', ipa: 's', kind: 'cont' },
  z: { say: '/zzz/', ipa: 'z', kind: 'cont' },
  sh: { say: '/shhh/', ipa: 'ʃ', kind: 'cont' },
  zh: { say: '/zh/', ipa: 'ʒ', kind: 'cont' },
  th: { say: '/th/ (thin)', ipa: 'θ', kind: 'cont' },
  dh: { say: '/th/ (this)', ipa: 'ð', kind: 'cont' },
  h: { say: '/h/', ipa: 'h', kind: 'stop' },
  m: { say: '/mmm/', ipa: 'm', kind: 'cont' },
  n: { say: '/nnn/', ipa: 'n', kind: 'cont' },
  ng: { say: '/ng/', ipa: 'ŋ', kind: 'cont' },
  l: { say: '/lll/', ipa: 'l', kind: 'cont' },
  r: { say: '/rrr/', ipa: 'ɹ', kind: 'cont' },
  w: { say: '/w/', ipa: 'w', kind: 'stop' },
  y: { say: '/y/', ipa: 'j', kind: 'stop' },
  ks: { say: '/ks/', ipa: 'ks', kind: 'combo' },
  // short vowels
  a: { say: 'short a (apple)', ipa: 'æ', kind: 'vowel' },
  e: { say: 'short e (egg)', ipa: 'ɛ', kind: 'vowel' },
  i: { say: 'short i (itch)', ipa: 'ɪ', kind: 'vowel' },
  o: { say: 'short o (octopus)', ipa: 'ɑ', kind: 'vowel' },
  u: { say: 'short u (up)', ipa: 'ʌ', kind: 'vowel' },
  uh: { say: '/uh/ (lazy vowel)', ipa: 'ə', kind: 'vowel' },
  uu: { say: '/oo/ (book)', ipa: 'ʊ', kind: 'vowel' },
  // long vowels & vowel teams
  ay: { say: 'long a (say)', ipa: 'eɪ', kind: 'vowel' },
  ee: { say: 'long e (see)', ipa: 'iː', kind: 'vowel' },
  igh: { say: 'long i (high)', ipa: 'aɪ', kind: 'vowel' },
  oa: { say: 'long o (boat)', ipa: 'oʊ', kind: 'vowel' },
  oo: { say: '/oo/ (moon)', ipa: 'uː', kind: 'vowel' },
  ow: { say: '/ow/ (cow)', ipa: 'aʊ', kind: 'vowel' },
  oy: { say: '/oy/ (boy)', ipa: 'ɔɪ', kind: 'vowel' },
  aw: { say: '/aw/ (saw)', ipa: 'ɔː', kind: 'vowel' },
  // r-controlled
  ar: { say: '/ar/ (car)', ipa: 'ɑːɹ', kind: 'vowel' },
  er: { say: '/er/ (her)', ipa: 'ɜː', kind: 'vowel' },
  or: { say: '/or/ (for)', ipa: 'ɔːɹ', kind: 'vowel' },
  air: { say: '/air/ (hair)', ipa: 'ɛɹ', kind: 'vowel' },
};

export const BREAKDOWNS: Record<string, string> = {
  // ---- Short vowel CVC ----
  cat: 'c=k a t', dog: 'd o g', sun: 's u n', hat: 'h a t', pig: 'p i g', bed: 'b e d',
  cup: 'c=k u p', map: 'm a p', run: 'r u n', sit: 's i t', top: 't o p', bug: 'b u g',
  fox: 'f o x=ks', hen: 'h e n', jam: 'j a m', log: 'l o g', mud: 'm u d', net: 'n e t',
  pen: 'p e n', rug: 'r u g', van: 'v a n', web: 'w e b', zip: 'z i p', bat: 'b a t',
  fan: 'f a n', kid: 'k i d', lip: 'l i p', mop: 'm o p', nut: 'n u t', pot: 'p o t',
  red: 'r e d', ten: 't e n', wig: 'w i g', box: 'b o x=ks', bus: 'b u s', big: 'b i g',
  hot: 'h o t', sad: 's a d', wet: 'w e t', fun: 'f u n',

  // ---- Dolch primer ----
  all: 'all=aw+l', am: 'a m', are: 'ar !e=_', at: 'a t', ate: 'a^=ay t e=_', be: 'b e=ee',
  black: 'b-l a ck=k', brown: 'b-r ow n', but: 'b u t', came: 'c=k a^=ay m e=_',
  did: 'd i d', do: 'd !o=oo', eat: 'ea=ee t', four: 'f !our=or', get: 'g e t',
  good: 'g oo=uu d', have: 'h a !ve=v', he: 'h e=ee', into: 'i n t !o=oo',
  like: 'l i^=igh k e=_', must: 'm u s-t', new: 'n ew=oo', no: 'n o=oa', now: 'n ow',
  on: 'o n', our: 'ou=ow r', out: 'ou=ow t', please: 'p-l ea=ee se=z', pretty: 'p-r !e=i tt=t y=ee',
  ran: 'r a n', ride: 'r i^=igh d e=_', saw: 's aw', say: 's ay', she: 'sh e=ee',
  so: 's o=oa', soon: 's oo n', that: 'th=dh a t', there: 'th=dh !ere=air', they: 'th=dh !ey=ay',
  this: 'th=dh i s', too: 't oo', under: 'u n d er', want: 'w !a=o n-t', was: 'w !a=u s=z',
  well: 'w e ll=l', went: 'w e n-t', what: 'wh=w !a=u t', white: 'wh=w i^=igh t e=_',
  who: '!wh=h !o=oo', will: 'w i ll=l', with: 'w i th', yes: 'y e s',

  // ---- Dolch first grade ----
  after: 'a f t er', again: 'a=uh g !ai=e n', an: 'a n', any: '!a=e n y=ee', as: 'a s=z',
  ask: 'a s-k', by: 'b y=igh', could: 'c=k !oul=uu d', every: 'e v er y=ee', fly: 'f-l y=igh',
  from: 'f-r !o=u m', give: 'g i !ve=v', going: 'g o=oa ing=i+ng', had: 'h a d', has: 'h a s=z',
  her: 'h er', him: 'h i m', his: 'h i s=z', how: 'h ow', just: 'j u s-t', know: 'kn=n ow=oa',
  let: 'l e t', live: 'l i !ve=v', may: 'm ay', of: '!o=u !f=v', old: 'o=oa l-d',
  once: '!o=w+u n ce=s', open: 'o=oa p e=uh n', over: 'o=oa v er', put: 'p !u=uu t',
  round: 'r ou=ow n-d', some: 's !o=u m e=_', stop: 's-t o p', take: 't a^=ay k e=_',
  thank: 'th ank=a+ng+k', them: 'th=dh e m', then: 'th=dh e n', think: 'th ink=i+ng+k',
  walk: 'w !al=aw k', were: 'w !ere=er', when: 'wh=w e n',

  // ---- Fry first 100 (extra) ----
  the: 'th=dh !e=uh', and: 'a n-d', you: 'y !ou=oo', it: 'i t', is: 'i s=z', for: 'f or',
  one: '!one=w+u+n', can: 'c=k a n', up: 'u p', down: 'd ow n', look: 'l oo=uu k', see: 's ee',
  come: 'c=k !o=u m e=_', go: 'g o=oa', my: 'm y=igh', we: 'w e=ee', not: 'n o t',
  your: 'y !our=or', said: 's !ai=e d', way: 'w ay', each: 'ea=ee ch', which: 'wh=w i ch',
  their: 'th=dh !eir=air', make: 'm a^=ay k e=_', time: 't i^=igh m e=_', word: 'w !or=er d',
  long: 'l o ng', day: 'd ay', part: 'p ar t', find: 'f ind=igh+n+d',
  // ---- Kingdom 2: Frost Realm (digraphs, then blends) ----
  ship: 'sh i p', fish: 'f i sh', shop: 'sh o p', dish: 'd i sh', chin: 'ch i n', chop: 'ch o p',
  thin: 'th i n', bath: 'b a th', duck: 'd u ck=k', frog: 'f-r o g', flag: 'f-l a g', sled: 's-l e d',
  drum: 'd-r u m', crab: 'c=k-r a b', clap: 'c=k-l a p', swim: 's-w i m', spin: 's-p i n', step: 's-t e p',
  chest: 'ch e s-t', frost: 'f-r o s-t',

  // ---- Kingdom 3: Desert Sands (magic e, then vowel teams) ----
  cake: 'c=k a^=ay k e=_', game: 'g a^=ay m e=_', cave: 'c=k a^=ay v e=_', lake: 'l a^=ay k e=_',
  bike: 'b i^=igh k e=_', kite: 'k i^=igh t e=_', hide: 'h i^=igh d e=_', bone: 'b o^=oa n e=_',
  home: 'h o^=oa m e=_', rope: 'r o^=oa p e=_', feet: 'f ee t', seed: 's ee d', tree: 't-r ee',
  sheep: 'sh ee p', rain: 'r ai=ay n', tail: 't ai=ay l', sail: 's ai=ay l', boat: 'b oa t',
  goat: 'g oa t', road: 'r oa d',

  // ---- Kingdom 4: Shadow Fortress (two syllables split with |, and 2nd-grade sight words) ----
  sunset: 's u n | s e t', hotdog: 'h o t | d o g', laptop: 'l a p | t o p', zigzag: 'z i g | z a g',
  napkin: 'n a p | k i n', picnic: 'p i c=k | n i c=k', basket: 'b a s | k e t', rabbit: 'r a b | b i t',
  kitten: 'k i t | t e n', dragon: 'd-r a g | o n', robot: 'r o=oa | b o t', tiger: 't i=igh | g er',
  wish: 'w i sh', made: 'm a^=ay d e=_', green: 'g-r ee n', sleep: 's-l ee p', cold: 'c=k o=oa l-d',
  both: 'b !o=oa th', very: 'v e r y=ee', many: 'm !a=e n y=ee',
};
/** Breakdowns that exist only for demos/screenshots (window.__soundOut). */
export const DEMO_WORDS: string[] = [];

export type ChunkKind = 'single' | 'digraph' | 'blend' | 'vowelTeam' | 'rVowel' | 'magicE' | 'ending' | 'double' | 'silent';

export interface Chunk {
  /** The letters on the tile. */
  text: string;
  /** Phoneme ids, in order (empty = silent). */
  sounds: string[];
  kind: ChunkKind;
  /** Tricky "heart part" of a sight word. */
  heart: boolean;
  /** Index of the blend group this chunk belongs to (adjacent tiles), or -1. */
  blend: number;
  /** For a magic-e vowel: index of the silent e it is linked to. */
  linkTo: number;
  /** Syllable number (0, 1, ...) for two-syllable words split with '|' in the spec. */
  syl: number;
}

const DIGRAPHS = new Set(['sh', 'ch', 'th', 'wh', 'ck', 'ng', 'ph', 'kn', 'wr', 'gh', 'tch']);
const VOWEL_TEAMS = new Set(['ee', 'ea', 'ai', 'ay', 'oa', 'ow', 'ou', 'oo', 'ew', 'aw', 'ey', 'oi', 'oy', 'ie', 'ue', 'oul', 'al']);
const ENDINGS = new Set(['ing', 'all', 'ight', 'ank', 'ink', 'ind', 'old', 'ong', 'one']);
const R_SOUNDS = new Set(['ar', 'er', 'or', 'air']);

export function parseBreakdown(word: string, spec: string): Chunk[] {
  const chunks: Chunk[] = [];
  let blendId = 0;
  let magicVowel = -1;
  let syl = 0;
  for (const group of spec.trim().split(/\s+/)) {
    if (group === '|') { syl++; continue; }
    const parts = group.split('-');
    const blend = parts.length > 1 ? blendId++ : -1;
    for (const raw of parts) {
      let tok = raw;
      const heart = tok.startsWith('!');
      if (heart) tok = tok.slice(1);
      const [lettersRaw, snd] = tok.split('=');
      const magic = lettersRaw.endsWith('^');
      const letters = magic ? lettersRaw.slice(0, -1) : lettersRaw;
      const sounds = snd === undefined ? [letters] : snd === '_' ? [] : snd.split('+');
      let kind: ChunkKind;
      if (!sounds.length) kind = 'silent';
      else if (magic) kind = 'magicE';
      else if (blend >= 0) kind = 'blend';
      else if (ENDINGS.has(letters) && sounds.length > 1) kind = 'ending';
      else if (letters.length === 2 && letters[0] === letters[1] && !'aeiou'.includes(letters[0])) kind = 'double';
      else if (R_SOUNDS.has(sounds[0]) && /r/.test(letters)) kind = 'rVowel';
      else if (VOWEL_TEAMS.has(letters) || (letters.length > 1 && /^[aeiouy]+[wyl]?$/.test(letters))) kind = 'vowelTeam';
      else if (DIGRAPHS.has(letters)) kind = 'digraph';
      else kind = 'single';
      if (magic) magicVowel = chunks.length;
      chunks.push({ text: letters, sounds, kind, heart, blend, linkTo: -1, syl });
    }
  }
  if (magicVowel >= 0) {
    const last = chunks.length - 1;
    if (chunks[last].text === 'e' && !chunks[last].sounds.length) {
      chunks[magicVowel].linkTo = last;
      chunks[last].kind = 'magicE';
    }
  }
  return chunks;
}

const cache = new Map<string, Chunk[] | null>();
/** Chunks for a word, or null if no breakdown was authored. */
export function breakdown(word: string): Chunk[] | null {
  const w = word.toLowerCase();
  if (!cache.has(w)) cache.set(w, BREAKDOWNS[w] ? parseBreakdown(w, BREAKDOWNS[w]) : null);
  return cache.get(w)!;
}

/** Clip id for a chunk's sound (single phoneme id, or ids joined with '+' for glued chunks). */
export const chunkClip = (c: Chunk) => c.sounds.join('+');

/** Every distinct clip the breakdowns need (used by the audio generator and the checker). */
export function allClips(): string[] {
  const s = new Set<string>();
  for (const w of Object.keys(BREAKDOWNS)) for (const c of breakdown(w)!) if (c.sounds.length) s.add(chunkClip(c));
  return [...s].sort();
}
