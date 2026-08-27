import Phaser from 'phaser';
import { audioManager } from '../audio/audio-manager';
import { bindButton, setResultText, setStatusText, showBars } from './dom-ui';

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

    // 结算页完全交给 DOM overlay 排版。不要再在 Phaser 画布中重复绘制
    // “通关/步数/达标”文本，否则两套坐标系会在短屏上叠在一起。
    showBars('bar-result');

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

    const resultSummary = !nextId
      ? `步数 ${moves} / 目标 ${par} · 全部关卡完成！`
      : moves <= par
        ? `步数 ${moves} / 目标 ${par} · 达到目标步数！`
        : `步数 ${moves} / 目标 ${par}`;
    setResultText(resultSummary);
    setStatusText(
      moves <= par
        ? '漂亮！你已经找到目标步数内的路线。'
        : '已通关；也可以重玩，用撤销逐步压缩路线。',
      'event'
    );

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
