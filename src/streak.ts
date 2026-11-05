// Reading streak ("win streak") rules. Pure logic, no Phaser, so it can be unit-tested (scripts/check-streak.ts).
//
// - Every word read correctly adds 1 to the streak. Using "Sound it out" (tiles, Blend it, Hear word) or a wrong try or two
//   along the way is fine: it does not break or block the streak.
// - The streak only breaks when a word is FAILED: the 3rd wrong try on the same word, or pressing Skip.
//   Pressing "Hear it" (reads the whole word, i.e. gives the answer) also ends it.
//   Silence / "um" never counts as a wrong try (handled in ReadScene/speech).
// - Once the streak reaches 3, every NEXT correct word pays double coins (flat 2x, it doesn't keep doubling).
// - A word that was already failed (3 misses) still pays normal coins when he finally reads it, but it
//   doesn't count toward a new streak; the new streak starts with the next word.

export const STREAK_TO_START = 3; // correct words in a row before the 2x kicks in
export const STREAK_MULT = 2; // coin multiplier while the streak is on
export const MISSES_TO_FAIL = 3; // wrong tries on one word that count as failing it
export const MILESTONE_EVERY = 5; // every 5th word in a row also gives a bonus (kept from before)
export const MILESTONE_BONUS = 20;

/** Is the 2x on for the next correct word, given the current streak? */
export function streakActive(streak: number): boolean {
  return streak >= STREAK_TO_START;
}

export interface CorrectResult {
  streak: number; // streak after this word
  mult: number; // coin multiplier applied to this word
  milestone: boolean; // got the every-5th bonus
  earned: number; // coins for this word
  started: boolean; // this word switched the 2x on (banner + jingle)
}

/** A word was read correctly. `failed` = this word had already been failed (3 misses) before he got it. */
export function onCorrect(streak: number, basePerWord: number, failed = false): CorrectResult {
  if (failed) return { streak: 0, mult: 1, milestone: false, earned: basePerWord, started: false };
  const mult = streakActive(streak) ? STREAK_MULT : 1;
  const next = streak + 1;
  const milestone = next % MILESTONE_EVERY === 0;
  const earned = (basePerWord + (milestone ? MILESTONE_BONUS : 0)) * mult;
  return { streak: next, mult, milestone, earned, started: next === STREAK_TO_START };
}

export interface MissResult { streak: number; failed: boolean; broke: boolean }

/** A wrong try. `missesOnWord` counts this try (1 = first wrong try on this word). */
export function onMiss(streak: number, missesOnWord: number): MissResult {
  if (missesOnWord >= MISSES_TO_FAIL) return { streak: 0, failed: true, broke: streak > 0 };
  return { streak, failed: false, broke: false };
}

/** Skip button: the word is given up on, so the streak ends. */
export function onSkip(streak: number): MissResult {
  return { streak: 0, failed: true, broke: streak > 0 };
}

/** "Hear it" button: the word was read to him, so the streak ends and this word won't count toward a new one.
 *  With no streak running there is nothing to reset (broke = false, no reset fanfare). */
export function onHearIt(streak: number): MissResult {
  return { streak: 0, failed: true, broke: streak > 0 };
}
