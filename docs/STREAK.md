# Reading streak (2x coins)

Rules (code: `src/streak.ts`, tests: `scripts/check-streak.ts`, headless check: `scripts/streak-check.mjs`):

- Each word read correctly adds 1 to the streak (flame counter at the top of the reading screen).
- Help is fine: "Sound it out" (tiles and "Blend it", including the auto-blend after the 2nd wrong try), the grown-up button, and up to 2 wrong tries on a word do NOT break the streak.
- **"Hear it"** (button or H key) and Sound it out's **"Hear word"** button read the whole word, so it **ends the streak**: same gentle reset, with the message
  "Hearing it is great practice! New streak next word." That word pays normal coins (no 2x) and doesn't count toward
  the new streak. If the streak is already 0 there's no reset effect (the word still won't count toward a streak).
- Silence, "um", or background chatter is never a wrong try (unchanged).
- Otherwise the streak ends only when a word is **failed**: the 3rd wrong try on the same word, or pressing **Skip**.
  The reset is gentle: the flame puffs out, a soft 3-note tune, "New streak next word!". No coins are lost.
- A failed word still pays the normal 10 coins when he finally reads it, but doesn't count toward a new streak;
  the new streak starts with the next word.
- After 3 in a row a "STREAK! 2x COINS!" banner and an 8-bit fanfare play, and every next correct word pays **2x**
  (flat 2x, it doesn't keep growing). Payouts show a red "2x" medal next to "+20".

## Bonus time limit (2 minutes)

- When the 2x switches on (3rd word in a row) it lasts `BONUS_SECONDS` = **120 s** (`src/streak.ts`, one constant).
- The streak pill shows a shrinking ring around the flame plus a m:ss countdown; in the last 15 s it flickers red/white.
- When it runs out: grey flame puff, soft tune, "Bonus time is over! Build a new streak!". Coins are kept; the streak
  goes to 0, words pay 10 again, and the current word can start the new streak (3 in a row needed again).
- The clock only ticks while the Read screen is open and the tab is visible. It pauses in Camp/Map/battle, when the
  tab is hidden, while the Sound it out panel or settings are open, and during the reward animation. It keeps running
  while the mic listens.
- Remaining time is saved (`bonusLeft`, every ~2 s and on each word) and resumes on return, so closing the browser
  neither resets nor refills it. Old saves with a 2x already running get a fresh 2:00.
- The every-5th-word bonus stays, and only gets doubled while the 2x is on.

Coins per correct word:

| Streak position | Coins |
| --- | --- |
| 1st, 2nd, 3rd in a row | 10 |
| 4th and later | 20 |
| every 5th in a row (5, 10, 15...) | (10 + 20 bonus) x 2 = 60 |

The current streak is saved in localStorage (`streak` in the save), so it survives going to Camp/battle and closing the browser.
