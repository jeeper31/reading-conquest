// Word lists for Reading Conquest.
// To add a new level, append an entry to WORD_LEVELS. `id` must be unique and stable
// (it is stored in the save file). Words should be lowercase.

export interface WordLevel {
  id: string;
  name: string;
  description: string;
  words: string[];
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
];

/** Levels that are switched on for a brand-new player. */
export const DEFAULT_ENABLED_LEVELS = ['cvc', 'dolch-primer', 'dolch-first'];
