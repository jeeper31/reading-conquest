# Battle win rule

Code: `src/battle-rules.ts` (unit tests `scripts/check-battle.ts`), `src/scenes/BattleScene.ts`. Headless: `scripts/battle-result-check.mjs`.

- **What counts as "the castle":** the keep, every tower, and every storehouse. At a boss castle the boss counts too
  (worth 3 buildings). Walls and enemy soldiers/wall archers don't count (troops still have to break through walls).
- The HUD shows "% of the castle" (rounded down, so 100% only appears when everything is down) and "Destroy 100% to win!".
- **Win = 100%** (boss beaten included). Only a win gives stars, marks the castle conquered, unlocks the next castle /
  crown, and pays the full castle loot + 20.
- **Not 100%** when the army is gone, time runs out, or he presses End Battle: no stars, no unlock. He gets kind
  consolation gold = half the castle loot x % destroyed, and a "SO CLOSE!" (50%+) or "RETREAT!" screen with
  "So close! 82% - read more words to grow your army!". Surviving troops march home as before.
- **Stars (only on a win), by time left on the 3:00 clock:** 1 star = win, 2 stars = 45+ s left, 3 stars = 90+ s left.
- Saves: best stars per castle are kept (`max`), so castles conquered under the old rule stay conquered.
- Balance (Nov 2026, 100% rule): castles 5 and 6 of Frost/Desert/Shadow got 25% less tower, keep, and defender HP.
  Sims: all Green castles win at mid gear; all non-boss castles win at gear 4; the three boss castles need top gear.
