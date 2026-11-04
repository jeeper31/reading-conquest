// Word lists for Reading Conquest.
// To add a new level, append an entry to WORD_LEVELS. `id` must be unique and stable
// (it is stored in the save file). Words should be lowercase.

export interface WordLevel {
  id: string;
  name: string;
  description: string;
  words: string[];
  /** Set for a kingdom's new words (1 = Frost Realm, 2 = Desert Sands, 3 = Shadow Fortress).
   *  Kingdom lists are not toggled in the grown-up list picker; they join the mix when that kingdom is played.
   *  Words are ordered easiest first: each castle beaten in the kingdom unlocks a few more. */
  kingdom?: number;
}

export const WORD_LEVELS: WordLevel[] = [
  {
    id: 'cvc',
    name: 'Short Vowel Words',
    description: 'Simple consonant-vowel-consonant words you can sound out',
    words: [
      'cat', 'dog', 'sun', 'hat', 'pig', 'bed', 'cup', 'map', 'run', 'sit',
      'top', 'bug', 'fox', 'hen', 'jam', 'log', 'mud', 'net', 'pen', 'rug',
      'van', 'web', 'zip', 'bat', 'fan', 'kid', 'lip', 'mop', 'nut', 'pot',
      'red', 'ten', 'wig', 'box', 'bus', 'big', 'hot', 'sad', 'wet', 'fun',
    ],
  },
  {
    id: 'dolch-primer',
    name: 'Sight Words: Primer',
    description: 'Dolch primer sight words',
    words: [
      'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came',
      'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like',
      'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran',
      'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this',
      'too', 'under', 'want', 'was', 'well', 'went', 'what', 'white', 'who', 'will',
      'with', 'yes',
    ],
  },
  {
    id: 'dolch-first',
    name: 'Sight Words: 1st Grade',
    description: 'Dolch first-grade sight words',
    words: [
      'after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly',
      'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
      'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
      'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk', 'were',
      'when',
    ],
  },
  {
    id: 'fry-first',
    name: 'Fry Words: First 100 (extra)',
    description: 'Common Fry first-hundred words not in the lists above',
    words: [
      'the', 'and', 'you', 'it', 'is', 'for', 'one', 'can', 'up', 'down',
      'look', 'see', 'come', 'go', 'my', 'we', 'not', 'your', 'said', 'way',
      'each', 'which', 'their', 'make', 'time', 'word', 'long', 'day', 'part', 'find',
    ],
  },
  // ---- Kingdom words (a few new, decodable words per kingdom; the rest of the mix is review) ----
  {
    id: 'k2-frost',
    name: 'Frost Realm: Blends & Digraphs',
    description: 'sh / ch / th / ck digraphs, then 2-letter blends (fr, sl, dr, cr, cl, sw, sp, st)',
    kingdom: 1,
    words: [
      'ship', 'fish', 'shop', 'dish', 'chin', 'chop', 'thin', 'bath',
      'duck', 'frog', 'flag', 'sled', 'drum', 'crab', 'clap', 'swim',
      'spin', 'step', 'chest', 'frost',
    ],
  },
  {
    id: 'k3-desert',
    name: 'Desert Sands: Magic E & Vowel Teams',
    description: 'magic-e (a_e, i_e, o_e), then vowel teams ee, ai, oa',
    kingdom: 2,
    words: [
      'cake', 'game', 'cave', 'lake', 'bike', 'kite', 'hide', 'bone',
      'home', 'rope', 'feet', 'seed', 'tree', 'sheep', 'rain', 'tail',
      'sail', 'boat', 'goat', 'road',
    ],
  },
  {
    id: 'k4-shadow',
    name: 'Shadow Fortress: Two Syllables & 2nd-Grade Sight Words',
    description: 'two short syllables (sun-set, rab-bit) plus early Dolch 2nd-grade words',
    kingdom: 3,
    words: [
      'sunset', 'hotdog', 'laptop', 'zigzag', 'wish', 'made', 'green', 'sleep',
      'napkin', 'picnic', 'basket', 'rabbit', 'kitten', 'cold', 'both', 'very',
      'dragon', 'robot', 'tiger', 'many',
    ],
  },
];

/** The lists a grown-up can switch on/off (kingdom lists are added automatically by the kingdom being played). */
export const BASE_LEVELS = WORD_LEVELS.filter((l) => !l.kingdom);
/** New words for kingdom k (0 = Green Kingdom has none). */
export const kingdomWords = (k: number) => WORD_LEVELS.find((l) => l.kingdom === k)?.words ?? [];

/** Levels that are switched on for a brand-new player. */
export const DEFAULT_ENABLED_LEVELS = ['cvc', 'dolch-primer', 'dolch-first'];
