import Phaser from 'phaser';
import { audioManager } from '../audio/audio-manager';
import { bindButton, setResultText, showBars } from './dom-ui';

interface ResultSceneData {
  levelId: string;
  moves: number;
  par: number;
  nextId: string | null;
}

export class ResultScene extends Phaser.Scene {
  private cleanupFns: Array<() => void> = [];

  constructor() {
    super('Result');
  }

  create(data: ResultSceneData): void {
    const levelId = data.levelId ?? '';
    const moves = data.moves ?? 0;
    const par = data.par ?? 0;
    const nextId = data.nextId ?? null;

    showBars('bar-result');
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.28, '通关！', {
        fontSize: '40px',
        color: '#7fe0a7'
      })
      .setOrigin(0.5);

    // 星级计算
    const starsEl = document.getElementById('result-stars');
    if (starsEl) {
      if (moves <= par) {
        starsEl.textContent = '★★★';
      } else if (moves <= par * 1.5) {
        starsEl.textContent = '★★';
      } else {
        starsEl.textContent = '★';
      }
    }

    this.add
      .text(width / 2, height * 0.28 + 54, `本关步数 ${moves} ／ 目标步数 ${par}`, {
        fontSize: '18px',
        color: '#e8f1f8'
      })
      .setOrigin(0.5);

    if (moves <= par) {
      this.add
        .text(width / 2, height * 0.28 + 84, '达到目标步数！', {
          fontSize: '14px',
          color: '#ffd479'
        })
        .setOrigin(0.5);
    }

    if (!nextId) {
      this.add
        .text(width / 2, height * 0.62, '所有关卡已通关！', {
          fontSize: '16px',
          color: '#9fb4c7'
        })
        .setOrigin(0.5);
    }

    setResultText(`步数 ${moves} / 目标 ${par}`);
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) nextBtn.hidden = !nextId;

    this.cleanupFns.push(
      bindButton('btn-replay', () => {
        audioManager.play('uiTap');
        this.scene.start('Game', { levelId });
      }),
      bindButton('btn-result-home', () => {
        audioManager.play('uiTap');
        this.scene.start('Home');
      })
    );
    if (nextId) {
      this.cleanupFns.push(
        bindButton('btn-next', () => {
          audioManager.play('uiTap');
          this.scene.start('Game', { levelId: nextId });
        })
      );
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const fn of this.cleanupFns) fn();
      this.cleanupFns = [];
    });
  }
}
