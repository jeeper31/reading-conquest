import Phaser from 'phaser';
import { generateArt } from '../art';
import { save } from '../state';
import { clampKingdom } from '../kingdoms';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    generateArt(this);
    // Debug / screenshot deep links: ?scene=Battle&castle=1&autodeploy=1
    const p = new URLSearchParams(location.search);
    const target = p.get('scene');
    if (target) {
      if (p.get('kingdom') !== null) { save.kingdom = clampKingdom(Number(p.get('kingdom'))); }
      this.scene.start(target, { castle: Number(p.get('castle') || 0), kingdom: p.get('kingdom') !== null ? save.kingdom : undefined, autodeploy: p.get('autodeploy') === '1', realArmy: p.get('army') === 'save', speed: Number(p.get('speed') || 1), view: p.get('view') || undefined, tab: p.get('tab') || undefined });
    } else {
      this.scene.start('Title');
    }
  }
}
