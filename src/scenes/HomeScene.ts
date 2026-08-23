import Phaser from 'phaser';
import { LEVELS, getLevelByOrder } from '../content/levels';
import { localStorageStore, loadSave } from '../persistence/save-store';
import { bindButton, setHomeContinue, setStatusText, showBars } from './dom-ui';

const STATUS_OK = '健康检查 OK';

export class HomeScene extends Phaser.Scene {
  private cleanup: (() => void) | null = null;

  constructor() {
    super('Home');
  }

  create(): void {
    showBars('bar-home');
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.3, '双生折线', {
        fontSize: '40px',
        color: '#e8f1f8'
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.3 + 46, 'Twinfold Paths', {
        fontSize: '18px',
        color: '#9fb4c7'
      })
      .setOrigin(0.5);

    const save = loadSave(localStorageStore());
    const order = Math.min(save.highestUnlocked, LEVELS.length);
    const level = getLevelByOrder(1, order) ?? LEVELS[0];
    setHomeContinue(`继续：第 ${order} 关`);

    this.cleanup = bindButton('btn-start', () => {
      if (level) this.scene.start('Game', { levelId: level.id });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup?.();
      this.cleanup = null;
    });

    setStatusText(STATUS_OK);
  }
}
