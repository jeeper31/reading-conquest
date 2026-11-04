# Gear tiers (armor & weapons that look stronger)

New recruits start in a cloth tunic with a wooden club. Each upgrade bought at the Forge
(Camp > Upgrades) changes how **every** soldier looks — in Camp, in battle, on the battle cards,
on the Title screen and in the Read screen — and gives the same stat boost as before.

| Upgrade | Cost per level | Effect per level | Looks (level 0 → max) |
|---|---|---|---|
| Armor | 80 / 180 / 320 / 500 | +20% health, all troops | Cloth Tunic → Leather Armor → Chainmail → Steel Plate → Royal Gold Armor |
| Weapons | 80 / 180 / 320 / 500 | +25% knight & spear damage | Knights: Wooden Club → Dagger → Iron Sword → Steel Longsword → Legend Sword (glows). Spears: Pointy Stick → Bronze Spear → Iron Spear → Steel Halberd → Dragon Lance |
| Bows | 80 / 180 / 320 / 500 | +25% archer damage, +8% range | Twig Bow → Hunting Bow → Recurve Bow → Steel Longbow → Golden Star Bow (glowing arrows) |
| Siege Works | 150 / 300 / 500 | +30% ram & catapult damage | Rough Wood → Iron Bands → Steel Plates → Royal Gold Trim |

Armor also makes soldiers physically bigger (up to +24%), adds helmets, shields (knights),
pauldrons, a cape at Royal Gold, and fuller quivers for archers. Enemy guards get tougher-looking
gear at later castles (castles 1–6 → tiers 1,1,2,2,3,4).

At 10–20 gold per word, the first upgrade is about 5–8 words; maxing one track is about 1,080 gold.

* Buying: before → after preview in each row; tapping buy plays a forge scene (3 hammer clangs,
  flash, new gear pops in, chiptune fanfare). Tap or wait to close; the whole camp army hops in new gear.
* **Armory** (Camp > Upgrades > "See all the gear", or `?scene=Armory&view=armor|weapons|all`) shows every tier.
* Saves: upgrade levels are the same `save.upgrades` as before, so old saves keep what they bought and
  simply show the matching gear. Junk/missing values are cleaned by `sanitizeUpgrades`.

Code: `src/gear.ts` (tier data, pure), `src/art-gear.ts` (canvas-drawn textures per tier),
`src/units.ts` (`makeUnitVisual(..., gear)`), `src/scenes/CampScene.ts` (preview + ceremony),
`src/scenes/ArmoryScene.ts`. Checks: `scripts/check-gear.ts` (in `npm test`) and
`node scripts/gear-check.mjs` (headless; writes screenshots 20–28).
