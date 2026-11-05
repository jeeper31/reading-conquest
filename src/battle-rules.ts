// Battle win/star/loot rules. Pure, unit-tested in scripts/check-battle.ts.
export const STAR2_SECONDS = 45; // win with this much time left = 2 stars
export const STAR3_SECONDS = 90; // = 3 stars

/** 0 = not a win. A win needs the whole castle (100%) and the boss (if any) beaten. */
export function winStars(pct: number, bossAlive: boolean, timeLeft: number): number {
  if (pct < 100 || bossAlive) return 0;
  return 1 + (timeLeft >= STAR2_SECONDS ? 1 : 0) + (timeLeft >= STAR3_SECONDS ? 1 : 0);
}

/** Win: full castle loot + 20. Not a win: half the loot for the damage done, as a kind consolation. */
export function battleLoot(castleLoot: number, pct: number, win: boolean): number {
  if (win) return castleLoot + 20;
  return Math.round(castleLoot * (Math.min(pct, 99) / 100) * 0.5);
}
