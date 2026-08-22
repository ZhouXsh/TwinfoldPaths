import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { HomeScene } from './scenes/HomeScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#101418',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 720
  },
  scene: [BootScene, HomeScene]
};

new Phaser.Game(config);
