import Phaser from 'phaser';
import { generateArt } from '../art';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    generateArt(this);
    // Debug / screenshot deep links: ?scene=Battle&castle=1&autodeploy=1
    const p = new URLSearchParams(location.search);
    const target = p.get('scene');
    if (target) {
      this.scene.start(target, { castle: Number(p.get('castle') || 0), autodeploy: p.get('autodeploy') === '1', view: p.get('view') || undefined, tab: p.get('tab') || undefined });
    } else {
      this.scene.start('Title');
    }
  }
}
