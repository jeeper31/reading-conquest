// Unit tests for the reading streak (src/streak.ts). Run: npm test
import { onCorrect, onMiss, onSkip, onHearIt, tickBonus, loadBonusLeft, BONUS_SECONDS, streakActive, STREAK_TO_START, STREAK_MULT, MISSES_TO_FAIL } from '../src/streak.ts';

let fail = 0, n = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  n++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
};
const BASE = 10;

eq('constants', [STREAK_TO_START, STREAK_MULT, MISSES_TO_FAIL], [3, 2, 3]);

// Simulate a run of words. 'c' = correct first try, 'h' = correct after 1-2 misses / sound-it-out,
// 'f' = 3 misses (fail) then eventually read, 's' = skip.
function run(seq: string) {
  let streak = 0; const coins: number[] = []; const starts: number[] = []; const breaks: number[] = [];
  [...seq].forEach((k, i) => {
    let failed = false;
    if (k === 's') { const r = onSkip(streak); if (r.broke) breaks.push(i); streak = r.streak; coins.push(0); return; }
    if (k === 'e') { const r = onHearIt(streak); if (r.broke) breaks.push(i); streak = r.streak; const c = onCorrect(streak, BASE, r.failed); streak = c.streak; coins.push(c.earned); return; }
    const misses = k === 'h' ? 2 : k === 'f' ? 4 : 0;
    for (let m = 1; m <= misses; m++) {
      const r = onMiss(streak, m);
      if (r.broke) breaks.push(i);
      if (r.failed) failed = true;
      streak = r.streak;
    }
    const r = onCorrect(streak, BASE, failed);
    if (r.started) starts.push(i);
    streak = r.streak; coins.push(r.earned);
  });
  return { streak, coins, starts, breaks };
}

// First 3 correct pay normal; 4th on pays 2x; every 5th in a row also gets the +20 bonus (doubled while on)
eq('six in a row', run('cccccc'), { streak: 6, coins: [10, 10, 10, 20, 60, 20], starts: [2], breaks: [] });
// Sound it out / a couple of wrong tries don't break it
eq('helpers keep the streak', run('chchc'), { streak: 5, coins: [10, 10, 10, 20, 60], starts: [2], breaks: [] });
// The 3rd miss on one word breaks it; that word pays normal and doesn't count; new streak starts next word
eq('3 misses break it', run('ccccfccc'), { streak: 3, coins: [10, 10, 10, 20, 10, 10, 10, 10], starts: [2, 7], breaks: [4] });
// Skip breaks it
eq('skip breaks it', run('cccscc'), { streak: 2, coins: [10, 10, 10, 0, 10, 10], starts: [2], breaks: [3] });
// Hear it ends the streak; that word pays normal 10 and doesn't count; new streak next word
eq('hear it breaks it', run('cccceccc'), { streak: 3, coins: [10, 10, 10, 20, 10, 10, 10, 10], starts: [2, 7], breaks: [4] });
eq('hear it with no streak', onHearIt(0), { streak: 0, failed: true, broke: false });
eq('hear it mid-streak', onHearIt(4), { streak: 0, failed: true, broke: true });
// 2x bonus timer
eq('bonus is 2 minutes', BONUS_SECONDS, 120);
eq('tick runs down', tickBonus(4, 120, 30), { left: 90, expired: false });
eq('tick expires', tickBonus(4, 5, 6), { left: 0, expired: true });
eq('no tick without 2x', tickBonus(2, 50, 10), { left: 0, expired: false });
eq('negative dt ignored', tickBonus(3, 50, -5), { left: 50, expired: false });
eq('load resumes saved time', loadBonusLeft(5, 42), 42);
eq('old save with 2x gets full timer', loadBonusLeft(5, undefined), 120);
eq('load caps at max', loadBonusLeft(5, 999), 120);
eq('load with no 2x', loadBonusLeft(2, 42), 0);
// after expiry the streak is 0, so the next 3 words pay 10 and must be rebuilt
eq('after expiry back to normal', [onCorrect(0, BASE).earned, onCorrect(1, BASE).earned, onCorrect(2, BASE).started], [10, 10, true]);
// Failing with no streak isn't a "break" (nothing to reset)
eq('fail with no streak', onMiss(0, 3), { streak: 0, failed: true, broke: false });
eq('2nd miss keeps streak', onMiss(7, 2), { streak: 7, failed: false, broke: false });
eq('active at 3', [streakActive(2), streakActive(3), streakActive(10)], [false, true, true]);
// Flat 2x, never escalates
eq('flat 2x at 20', onCorrect(20, BASE).earned, 20);
eq('streak resumes across sessions', onCorrect(4, BASE), { streak: 5, mult: 2, milestone: true, earned: 60, started: false });

console.log(fail ? `streak: ${fail}/${n} FAILED` : `streak: all ${n} checks passed`);
if (fail) process.exit(1);
