import Phaser from 'phaser';
import { LEVELS } from '../content/levels';
import { localStorageStore, loadSave, defaultSave } from '../persistence/save-store';
import { audioManager } from '../audio/audio-manager';
import {
  bindButton,
  getEl,
  setHomeContinue,
  setStatusText,
  showBars,
  showConfirmDialog
} from './dom-ui';

export class HomeScene extends Phaser.Scene {
  private cleanupFns: Array<() => void> = [];

  constructor() {
    super('Home');
  }

  create(): void {
    // 首页首次交互时解锁 AudioContext
    const unlockAudio = (): void => {
      try {
        audioManager.ensureUnlocked();
      } catch {
        /* ignore */
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    showBars('bar-home');
    const save = loadSave(localStorageStore());
    const index = Math.min(Math.max(save.highestUnlocked, 1), LEVELS.length);
    const level = LEVELS[index - 1] ?? LEVELS[0];
    setHomeContinue(
      `旅程进度 · 第 ${index} / ${LEVELS.length} 关${level ? ` · ${level.title}` : ''}`
    );
    getEl<HTMLButtonElement>('btn-start').textContent = index > 1 ? '继续旅程' : '开始第一关';

    this.cleanupFns.push(
      bindButton('btn-start', () => {
        if (level) {
          audioManager.play('uiTap');
          this.scene.start('Game', { levelId: level.id });
        }
      }),
      bindButton('btn-chapter-select', () => {
        audioManager.play('uiTap');
        this.scene.start('ChapterSelect');
      }),
      bindButton('btn-level-select', () => {
        audioManager.play('uiTap');
        this.scene.start('LevelSelect', { chapter: 1 });
      }),
      bindButton('btn-settings', () => {
        audioManager.play('uiTap');
        this.scene.start('Settings');
      }),
      bindButton('btn-clear-progress', async () => {
        const confirmed = await showConfirmDialog(
          '清除进度',
          '确定要清除所有游戏进度？此操作不可撤销。'
        );
        if (confirmed) {
          localStorageStore().setItem('twinfold-paths:save:a', '');
          localStorageStore().setItem('twinfold-paths:save:b', '');
          const newSave = defaultSave();
          localStorageStore().setItem('twinfold-paths:save:a', JSON.stringify(newSave));
          localStorageStore().setItem('twinfold-paths:save:b', JSON.stringify(newSave));
          setHomeContinue(`旅程进度 · 第 1 / ${LEVELS.length} 关 · 第一次分岔`);
          getEl<HTMLButtonElement>('btn-start').textContent = '开始第一关';
          setStatusText('进度已清除');
        }
      })
    );

    setStatusText('滑动棋盘或点击方向键，让蓝与橙同时到达各自出口。');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const fn of this.cleanupFns) fn();
      this.cleanupFns = [];
    });
  }
}
