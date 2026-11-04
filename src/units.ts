import Phaser from 'phaser';
import type { Team } from './art';
import { playerGear, type UnitType } from './state';
import { ARMOR_BULK, type Gear } from './gear';
import { bodyKey, weaponKey, siegeKey, BODY_ORIGIN, WEAPON_ORIGIN, handPos } from './art-gear';

export type VisualKind = UnitType | 'defender';

export interface UnitVisual {
  root: Phaser.GameObjects.Container;
  rig: Phaser.GameObjects.Container; // everything except the shadow; flipped for facing
  body: Phaser.GameObjects.Image;
  weapon?: Phaser.GameObjects.Image;
  part?: Phaser.GameObjects.Image; // ram log / catapult arm
  feet: Phaser.GameObjects.Image[];
  shadow: Phaser.GameObjects.Image;
  restAngle: number;
  kind: VisualKind;
  gear: Gear;
  weaponY: number; // weapon rest height (walk bob is added to this)
}

/** Texture key for a unit's icon (body only), in the given gear. */
export function iconKey(kind: VisualKind, team: Team, gear: Gear = kind === 'defender' ? { armor: 1, weapon: 1 } : playerGear(kind)) {
  if (kind === 'ram') return siegeKey('ram_body', gear.weapon);
  if (kind === 'catapult') return siegeKey('cata_body', gear.weapon);
  return bodyKey(kind, team, gear.armor);
}

/** gear defaults to what our troops currently wear (from upgrades); pass it for enemies or previews. */
export function makeUnitVisual(scene: Phaser.Scene, kind: VisualKind, team: Team, scale = 1, gearIn?: Gear): UnitVisual {
  const gear = gearIn ?? (kind === 'defender' ? { armor: 1, weapon: 1 } : playerGear(kind));
  const root = scene.add.container(0, 0);
  const rig = scene.add.container(0, 0);
  const shadow = scene.add.image(0, 0, 'shadow');
  root.add(shadow);
  root.add(rig);
  const feet: Phaser.GameObjects.Image[] = [];
  let body: Phaser.GameObjects.Image;
  let weapon: Phaser.GameObjects.Image | undefined;
  let part: Phaser.GameObjects.Image | undefined;
  let restAngle = 0;
  let weaponY = 0;

  if (kind === 'ram') {
    shadow.setScale(1.8, 1.6);
    part = scene.add.image(4, -16, siegeKey('ram_log', gear.weapon)).setOrigin(0.15, 0.5);
    body = scene.add.image(0, 2, siegeKey('ram_body', gear.weapon)).setOrigin(0.5, 0.9);
    rig.add([part, body]);
  } else if (kind === 'catapult') {
    shadow.setScale(1.7, 1.5);
    body = scene.add.image(0, 2, siegeKey('cata_body', gear.weapon)).setOrigin(0.5, 0.9);
    part = scene.add.image(0, -30, siegeKey('cata_arm', gear.weapon)).setOrigin(0.5, 0.95);
    restAngle = -55;
    part.setAngle(restAngle);
    rig.add([part, body]);
  } else {
    const bulk = ARMOR_BULK[gear.armor] ?? 1;
    shadow.setScale(0.75 * bulk);
    const fl = scene.add.image(-5, -3, 'foot').setScale(1 + (bulk - 1) * 1.6);
    const fr = scene.add.image(6, -3, 'foot').setScale(1 + (bulk - 1) * 1.6);
    feet.push(fl, fr);
    body = scene.add.image(0, -2, bodyKey(kind, team, gear.armor)).setOrigin(BODY_ORIGIN.x, BODY_ORIGIN.y);
    rig.add([fl, fr, body]);
    const wk = kind === 'defender' ? 'knight' : kind;
    const hand = handPos(kind, gear.armor);
    const o = WEAPON_ORIGIN[wk][gear.weapon];
    weapon = scene.add.image(hand.x, hand.y, weaponKey(wk, gear.weapon)).setOrigin(o.x, o.y);
    weaponY = hand.y;
    restAngle = wk === 'knight' ? 35 : wk === 'spearman' ? 20 : 0;
    weapon.setData('x0', hand.x);
    weapon.setAngle(restAngle);
    rig.add(weapon);
  }
  root.setScale(scale);
  return { root, rig, body, weapon, part, feet, shadow, restAngle, kind, gear, weaponY };
}

/** Advance a walk cycle. phase in radians. */
export function animateWalk(v: UnitVisual, phase: number, moving: boolean) {
  if (v.kind === 'ram' || v.kind === 'catapult') {
    v.body.y = 2 - (moving ? Math.abs(Math.sin(phase * 2)) * 2 : 0);
    v.body.rotation = moving ? Math.sin(phase * 2) * 0.03 : 0;
    return;
  }
  if (moving) {
    const s = Math.sin(phase);
    v.body.y = -2 - Math.abs(s) * 4;
    v.body.rotation = s * 0.08;
    v.feet[0].x = -5 + s * 4; v.feet[0].y = -3 - Math.max(0, s) * 3;
    v.feet[1].x = 6 - s * 4; v.feet[1].y = -3 - Math.max(0, -s) * 3;
    if (v.weapon && !v.weapon.getData('busy')) v.weapon.y = v.weaponY - Math.abs(s) * 4;
  } else {
    const s = Math.sin(phase * 0.5);
    v.body.y = -2 - (s + 1) * 1.2;
    v.body.rotation = 0;
    v.feet[0].x = -5; v.feet[0].y = -3; v.feet[1].x = 6; v.feet[1].y = -3;
    if (v.weapon && !v.weapon.getData('busy')) v.weapon.y = v.weaponY;
  }
}
