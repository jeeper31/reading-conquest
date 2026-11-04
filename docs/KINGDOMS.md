# Kingdoms

Reading Conquest now has four kingdoms. Each has 6 castles, and the 6th castle is the boss. Beat the boss to get that kingdom's crown in a **Crown Ceremony**. That also unlocks the next kingdom. You can replay any kingdom you've opened from the **World** button (the Kingdoms screen).

| # | Kingdom | Reading skill | New words | Enemies | Boss (castle 6) | Crown |
|---|---------|---------------|-----------|---------|-----------------|-------|
| 1 | The Green Kingdom | Short vowels + sight words (the original lists) | n/a | castle guards | n/a (Royal Citadel) | Emerald Crown |
| 2 | The Frost Realm | Blends & digraphs | 20 | ice knights + archers on the walls | the Frost Giant (melee, splash) | Ice Crown |
| 3 | The Desert Sands | Magic e & vowel teams | 20 | desert raiders + enemy catapults | the Camel King (fast, splash) | Sun Crown |
| 4 | The Shadow Fortress | Two-syllable words + 2nd-grade sight words | 20 | shadow knights, fireball catapults, lava | the Dragon (ranged fire, splash) | Dragon Crown |

Each kingdom has its own ground, castle colour, map decorations (ice river / dunes / lava river), weather (snow, sand, embers), and map music. Boss castles have their own boss music, plus a **BOSS BATTLE!** banner and a boss health bar. A boss castle gives no stars until the boss is down.

## Words: mostly review

The word lists are in `src/data/words.ts` and the mix logic is in `src/state.ts`.

- **Frost Realm:** ship fish shop dish chin chop thin bath duck frog flag sled drum crab clap swim spin step chest frost
- **Desert Sands:** cake game cave lake bike kite hide bone home rope feet seed tree sheep rain tail sail boat goat road
- **Shadow Fortress:** sunset hotdog laptop zigzag wish made green sleep napkin picnic basket rabbit kitten cold both very dragon robot tiger many

How the mix works:

- **Review pool.** This is the grown-up's chosen lists from the Words screen, plus every earlier kingdom's new words. In the Frost Realm the review pool has 153 words.
- **Gradual unlock.** A kingdom starts with 8 of its new words. Each castle beaten there adds 3 more. Beating the boss unlocks all 20.
- **The split.** 30% of words read are new at first, rising 2% per castle up to 40%. So 60-70% of reading is review. Missed and rarely-seen words still come up more often.
- **"New word!" tag.** A new word shows a pulsing orange tag on the Read card until he has read it right twice.
- **Phonics support.** Every new word has a Sound-it-out breakdown (digraphs and blends stay as one chunk, magic-e is marked, two-syllable words split by syllable) and a recorded audio file in `public/audio/words/`.
- **Microphone.** The mic matcher accepts homophones and two-syllable words heard as two words (for example "hot dog" for *hotdog*).

## Gear

Every track gained a top tier.

| Track | Effect per level | Tiers (level 0 → max) | Upgrade costs (gold) |
|-------|------------------|-----------------------|----------------------|
| Armor | +20% troop health | Cloth → Leather → Chainmail → Steel Plate → Royal Gold → **Dragon Scale** | 80, 180, 320, 500, **850** |
| Weapons | +25% knight & spear damage | Club → Dagger → Iron → Longsword → Legend → **Dragonfire Blade** (spears: … → **Phoenix Spear**) | 80, 180, 320, 500, **850** |
| Bows | +25% archer damage, +8% range | Twig → Hunting → Recurve → Steel Longbow → Golden Star → **Phoenix Bow** (fire arrows) | 80, 180, 320, 500, **850** |
| Siege Works | +30% ram & catapult damage | Wood → Iron → Steel → Gold → **Dragon Iron** | 150, 300, 500, **800** |

Enemy guards wear tougher-looking gear as you go further into each kingdom.

## Difficulty

Castle stat tables are in `src/kingdoms.ts`. Kingdoms 2-4 are scaled by `TUNING`:

- Walls, towers and keeps get ×2.0-2.4 health.
- Guard damage goes up ×1.9-2.3.
- Bosses are tuned separately.

The Green Kingdom is unchanged. Camp space grows +3 per castle in the new kingdoms.

Tuning was checked with `scripts/balance-sim.mjs` (auto-deploys a whole army at 3× speed):

- **Mid gear (3/3/3/2):** beats Frost Realm castles 1-4 with 3 stars. Loses castle 5 and the Frost Giant. He needs to earn gold and upgrade first.
- **Strong gear (4/4/4/3):** beats the Frost Giant, barely (the Camel King was within a few HP before a final small tweak).
- **Max gear (5/5/5/4):** clears all non-boss castles with losses. The bosses are close fights: the Frost Giant is won with ~11 troops left, the Camel King with 2 stars after the army is wiped, and the Dragon with ~5 troops left.

A kid placing troops carefully does better than the auto-deploy.

## Existing saves

Version 1 saves (Green Kingdom only) migrate to v2 automatically:

- Gold, army, upgrades, streak, word stats and hero name are all kept.
- The Green Kingdom stars move to kingdom 1.
- If the Royal Citadel was already beaten, the next time the game opens (Play, Map or Camp) it shows the **Crown Ceremony**: the Emerald Crown, then a **"New kingdom unlocked!"** bar with Go! into the Frost Realm.

## Dev links

- `?scene=Kingdoms`
- `?scene=Map&kingdom=2`
- `?scene=Battle&kingdom=3&castle=5&autodeploy=1&army=save&speed=2`

Other scripts:

- `node scripts/kingdom-screens.mjs` writes screenshots 29-42.
- `PROFILE=max|strong|mid KINGDOMS=1,2,3 CASTLES=0,5 node scripts/balance-sim.mjs`
