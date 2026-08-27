/** 章节选择场景 */
import Phaser from 'phaser';
import { LEVELS } from '../content/levels';
import { localStorageStore, loadSave } from '../persistence/save-store';
import { audioManager } from '../audio/audio-manager';
import { bindButton, getEl, setStatusText, showBars } from './dom-ui';

const CHAPTERS = [
  { num: 1, title: '镜像初识', subtitle: 'M0 基础镜像规则' },
  { num: 2, title: '彼此开路', subtitle: 'M1 压板 M2 专属门' },
  { num: 3, title: '扩域迷阵', subtitle: '大地图 · 映射变体 · 长线规划' },
  { num: 4, title: '暗域探索', subtitle: '全章迷雾 · 记忆 · 雷达 · 信标' },
  { num: 5, title: '时相终局', subtitle: 'M9 相位门 · 高级机制综合' }
];

export class ChapterSelectScene extends Phaser.Scene {
  private cleanupFns: Array<() => void> = [];

  constructor() {
    super('ChapterSelect');
  }

  create(): void {
    showBars('bar-chapter-select');
    this.renderChapters();
    setStatusText('后半程从空间扩展进入暗域探索，再进入需要计算回合奇偶的时相终局。');
    this.cleanupFns.push(bindButton('btn-chapter-back', () => this.scene.start('Home')));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const fn of this.cleanupFns) fn();
      this.cleanupFns = [];
    });
  }

  private renderChapters(): void {
    const grid = getEl('chapter-grid');
    grid.innerHTML = '';
    const save = loadSave(localStorageStore());

    for (const ch of CHAPTERS) {
      const card = document.createElement('div');
      card.className = 'chapter-card';
      card.setAttribute('data-testid', `chapter-${ch.num}`);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `第${ch.num}章：${ch.title}`);

      const chapterLevels = LEVELS.filter((l) => l.chapter === ch.num);
      const firstLevel = chapterLevels[0];
      const chapterFirstIndex = firstLevel
        ? LEVELS.findIndex((l) => l.id === firstLevel.id) + 1
        : 1;
      const isUnlocked = save.highestUnlocked >= chapterFirstIndex;
      const completed = chapterLevels.filter((l) => save.bestMoves[l.id] !== undefined).length;
      const total = chapterLevels.length;
      const allCompleted = completed === total && total > 0;

      if (!isUnlocked) {
        card.classList.add('locked');
        card.innerHTML = `
          <div class="chapter-index">CHAPTER ${ch.num}</div>
          <div class="chapter-name">第${ch.num}章</div>
          <div class="chapter-sub">🔒 未解锁</div>
        `;
      } else {
        card.classList.toggle('completed', allCompleted);
        const stars = allCompleted ? '⭐⭐⭐' : completed > 0 ? '⭐' : '';
        card.innerHTML = `
          <div class="chapter-index">CHAPTER ${ch.num}</div>
          <div class="chapter-name">第${ch.num}章</div>
          <div class="chapter-sub">${ch.title}</div>
          <div class="chapter-star">${stars}</div>
          <div class="chapter-sub">${completed}/${total}</div>
        `;
        card.addEventListener('click', () => {
          audioManager.play('uiTap');
          this.scene.start('LevelSelect', { chapter: ch.num });
        });
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            audioManager.play('uiTap');
            this.scene.start('LevelSelect', { chapter: ch.num });
          }
        });
      }

      grid.appendChild(card);
    }
  }
}
