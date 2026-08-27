import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { HomeScene } from './scenes/HomeScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { ChapterSelectScene } from './scenes/ChapterSelectScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { SettingsScene } from './scenes/SettingsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#F0EBE5',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 360,
    height: 360
  },
  scene: [
    BootScene,
    HomeScene,
    ChapterSelectScene,
    LevelSelectScene,
    SettingsScene,
    GameScene,
    ResultScene
  ],
  input: {
    activePointers: 1
  }
};

new Phaser.Game(config);
