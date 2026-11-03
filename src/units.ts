import Phaser from 'phaser';
import type { Team } from './art';
import type { UnitType } from './state';

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
}

export function makeUnitVisual(scene: Phaser.Scene, kind: VisualKind, team: Team, scale = 1): UnitVisual {
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

  if (kind === 'ram') {
    shadow.setScale(1.8, 1.6);
    part = scene.add.image(4, -16, 'ram_log').setOrigin(0.15, 0.5);
    body = scene.add.image(0, 2, 'ram_body').setOrigin(0.5, 0.9);
    rig.add([part, body]);
  } else if (kind === 'catapult') {
    shadow.setScale(1.7, 1.5);
    body = scene.add.image(0, 2, 'cata_body').setOrigin(0.5, 0.9);
    part = scene.add.image(0, -30, 'cata_arm').setOrigin(0.5, 0.95);
    restAngle = -55;
    part.setAngle(restAngle);
    rig.add([part, body]);
  } else {
    shadow.setScale(0.75);
    const fl = scene.add.image(-5, -3, 'foot');
    const fr = scene.add.image(6, -3, 'foot');
    feet.push(fl, fr);
    const key = kind === 'defender' ? 'defender_red' : `${kind}_${team}`;
    body = scene.add.image(0, -2, key).setOrigin(0.46, 0.92);
    rig.add([fl, fr, body]);
    if (kind === 'knight' || kind === 'defender') {
      weapon = scene.add.image(10, -20, 'sword').setOrigin(0.5, 0.92);
      restAngle = 35;
    } else if (kind === 'spearman') {
      weapon = scene.add.image(8, -18, 'spear').setOrigin(0.5, 0.75);
      restAngle = 20;
    } else if (kind === 'archer') {
      weapon = scene.add.image(13, -22, 'bow').setOrigin(0.3, 0.5);
      restAngle = 0;
    }
    if (weapon) { weapon.setAngle(restAngle); rig.add(weapon); }
  }
  root.setScale(scale);
  return { root, rig, body, weapon, part, feet, shadow, restAngle, kind };
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
    if (v.weapon && !v.weapon.getData('busy')) v.weapon.y = (v.kind === 'archer' ? -22 : -20) - Math.abs(s) * 4;
  } else {
    const s = Math.sin(phase * 0.5);
    v.body.y = -2 - (s + 1) * 1.2;
    v.body.rotation = 0;
    v.feet[0].x = -5; v.feet[0].y = -3; v.feet[1].x = 6; v.feet[1].y = -3;
  }
}
