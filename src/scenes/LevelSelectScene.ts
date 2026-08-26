/** 关卡选择场景 */
import Phaser from 'phaser';
import { LEVELS } from '../content/levels';
import { localStorageStore, loadSave } from '../persistence/save-store';
import { audioManager } from '../audio/audio-manager';
import { bindButton, getEl, showBars, updateProgress } from './dom-ui';

const CHAPTER_NAMES: Record<number, string> = {
  1: '镜像初识',
  2: '彼此开路',
  3: '打破同步',
  4: '空间折叠',
  5: '双线合流'
};

interface LevelSelectData {
  chapter: number;
}

export class LevelSelectScene extends Phaser.Scene {
  private cleanupFns: Array<() => void> = [];
  private chapter = 1;

  constructor() {
    super('LevelSelect');
  }

  init(data: LevelSelectData): void {
    this.chapter = data.chapter ?? 1;
  }

  create(): void {
    showBars('bar-level-select');
    const title = getEl('level-select-title');
    title.textContent = `第${this.chapter}章 ${CHAPTER_NAMES[this.chapter] ?? ''}`;
    this.renderLevels();
    this.cleanupFns.push(bindButton('btn-level-back', () => this.scene.start('ChapterSelect')));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const fn of this.cleanupFns) fn();
      this.cleanupFns = [];
    });
  }

  private renderLevels(): void {
    const grid = getEl('level-grid');
    grid.innerHTML = '';
    const save = loadSave(localStorageStore());
    const levels = LEVELS.filter((l) => l.chapter === this.chapter);

    let completed = 0;
    for (const level of levels) {
      const index = LEVELS.findIndex((l) => l.id === level.id) + 1;
      const isUnlocked = save.highestUnlocked >= index;
      const best = save.bestMoves[level.id];
      const isCurrent = save.highestUnlocked === index;
      const isCompleted = best !== undefined;
      if (isCompleted) completed++;

      const cell = document.createElement('div');
      cell.className = 'level-cell';
      cell.setAttribute('data-testid', `level-${level.id}`);
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', isUnlocked ? '0' : '-1');
      cell.setAttribute(
        'aria-label',
        `第${level.order}关：${level.title}${isUnlocked ? '' : '（未解锁）'}`
      );

      if (!isUnlocked) {
        cell.classList.add('locked');
        cell.innerHTML = `<span>${level.order}</span><span>🔒</span>`;
      } else {
        if (isCompleted) cell.classList.add('completed');
        if (isCurrent) cell.classList.add('current');

        const stars = isCompleted ? '★' : '';
        const bestText = best !== undefined ? `${best}步` : '';

        cell.innerHTML = `
          <span>${level.order}</span>
          <div class="star-row">${stars}</div>
          <div class="best-row">${bestText}</div>
        `;

        cell.addEventListener('click', () => {
          audioManager.play('uiTap');
          this.scene.start('Game', { levelId: level.id });
        });
        cell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            audioManager.play('uiTap');
            this.scene.start('Game', { levelId: level.id });
          }
        });
      }

      grid.appendChild(cell);
    }

    updateProgress(completed, levels.length);
  }
}
