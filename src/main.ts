import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { ReadScene } from './scenes/ReadScene';
import { CampScene } from './scenes/CampScene';
import { MapScene } from './scenes/MapScene';
import { ArmoryScene } from './scenes/ArmoryScene';
import { BattleScene } from './scenes/BattleScene';
import { KingdomsScene } from './scenes/KingdomsScene';
import { CrownScene } from './scenes/CrownScene';
import { W, H } from './ui';
import { unlockAudio, audioCtx, settings } from './audio';
import { isDucked, musicOn } from './music/player';
import { renderTrackWav } from './music/render';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#1d3b1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, TitleScene, ReadScene, CampScene, MapScene, BattleScene, ArmoryScene, KingdomsScene, CrownScene],
});

(window as any).__game = game;

// Chrome autoplay policy: audio (and music) can only start after a user gesture.
const unlock = () => unlockAudio();
window.addEventListener('pointerdown', unlock, { capture: true });
window.addEventListener('keydown', unlock, { capture: true });
window.addEventListener('touchend', unlock, { capture: true });

// Offline render hook used by scripts/render-music.mjs to make shareable WAV samples.
(window as any).__renderTrackWav = renderTrackWav;
(window as any).__audioDebug = () => ({ state: audioCtx()?.state, settings: { ...settings }, ducked: isDucked(), musicOn: musicOn() });
