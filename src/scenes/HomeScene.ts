import Phaser from 'phaser';
import { LEVELS } from '../content/levels';
import { localStorageStore, loadSave, defaultSave } from '../persistence/save-store';
import {
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  GAME_DIFFICULTIES,
  loadDifficulty,
  persistDifficulty,
  setActiveDifficulty,
  type GameDifficulty
} from '../difficulty/game-difficulty';
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
    const store = localStorageStore();
    const difficulty = loadDifficulty(store);
    setActiveDifficulty(difficulty);
    this.mountDifficultyAndTutorial(difficulty);

    const save = loadSave(store);
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

  private mountDifficultyAndTutorial(initialDifficulty: GameDifficulty): void {
    const home = getEl<HTMLDivElement>('bar-home');
    const startButton = getEl<HTMLButtonElement>('btn-start');
    home.classList.add('overlay-scroll');

    const panel = document.createElement('section');
    panel.id = 'difficulty-panel';
    panel.setAttribute('data-testid', 'difficulty-panel');
    panel.setAttribute('aria-label', '游戏难度');
    panel.style.cssText = [
      'width:min(340px,92%)',
      'display:flex',
      'flex-direction:column',
      'gap:7px',
      'padding:10px 12px',
      'box-sizing:border-box',
      'background:rgba(255,255,255,.9)',
      'border:1px solid var(--line-light)',
      'border-radius:12px',
      'box-shadow:var(--shadow-sm)'
    ].join(';');

    const title = document.createElement('div');
    title.textContent = '探索难度';
    title.style.cssText = 'font-size:13px;font-weight:800;color:var(--text);text-align:center';

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px';

    const description = document.createElement('div');
    description.id = 'difficulty-description';
    description.setAttribute('data-testid', 'difficulty-description');
    description.style.cssText =
      'font-size:11px;line-height:1.45;color:var(--text-secondary);text-align:center;min-height:32px';

    const buttons = new Map<GameDifficulty, HTMLButtonElement>();
    const renderDifficulty = (difficulty: GameDifficulty): void => {
      for (const value of GAME_DIFFICULTIES) {
        const button = buttons.get(value);
        if (!button) continue;
        const selected = value === difficulty;
        button.setAttribute('aria-pressed', String(selected));
        button.style.background = selected ? 'var(--blue-light)' : 'var(--panel)';
        button.style.borderColor = selected ? 'var(--blue)' : 'var(--line)';
        button.style.color = selected ? 'var(--blue-strong)' : 'var(--text)';
        button.style.fontWeight = selected ? '800' : '600';
      }
      description.textContent = DIFFICULTY_DESCRIPTIONS[difficulty];
    };

    for (const difficulty of GAME_DIFFICULTIES) {
      const button = document.createElement('button');
      button.id = `btn-difficulty-${difficulty}`;
      button.setAttribute('data-testid', `btn-difficulty-${difficulty}`);
      button.type = 'button';
      button.className = 'btn-small';
      button.textContent = DIFFICULTY_LABELS[difficulty];
      button.style.cssText = 'min-width:0;min-height:40px;padding:5px 4px;font-size:13px';
      buttonRow.appendChild(button);
      buttons.set(difficulty, button);
      const onClick = (): void => {
        audioManager.play('uiTap');
        persistDifficulty(localStorageStore(), difficulty);
        renderDifficulty(difficulty);
        setStatusText(
          `已切换为${DIFFICULTY_LABELS[difficulty]}难度：${DIFFICULTY_DESCRIPTIONS[difficulty]}`
        );
      };
      button.addEventListener('click', onClick);
      this.cleanupFns.push(() => button.removeEventListener('click', onClick));
    }

    panel.append(title, buttonRow, description);
    home.insertBefore(panel, startButton);
    renderDifficulty(initialDifficulty);

    const actions = home.querySelector<HTMLElement>('.home-actions');
    if (!actions) throw new Error('首页缺少 .home-actions');
    const tutorialButton = document.createElement('button');
    tutorialButton.id = 'btn-tutorial';
    tutorialButton.setAttribute('data-testid', 'btn-tutorial');
    tutorialButton.type = 'button';
    tutorialButton.className = 'btn-small';
    tutorialButton.textContent = '教学';
    actions.appendChild(tutorialButton);

    const modal = document.createElement('div');
    modal.id = 'tutorial-modal';
    modal.setAttribute('data-testid', 'tutorial-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tutorial-title');
    modal.hidden = true;
    modal.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:500',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:18px',
      'box-sizing:border-box',
      'background:rgba(28,40,56,.36)'
    ].join(';');
    modal.innerHTML = `
      <div style="width:min(420px,100%);max-height:86vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow-md);padding:18px;box-sizing:border-box;color:var(--text)">
        <div id="tutorial-title" style="font-size:22px;font-weight:850;margin-bottom:12px">游戏教学</div>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;line-height:1.6;color:var(--text-secondary)">
          <section><b style="color:var(--text)">目标</b><br />每回合输入一个方向，让蓝球与橙球最终在同一回合分别站上对应颜色出口。</section>
          <section><b style="color:var(--text)">基本移动</b><br />蓝球按你输入的方向移动；橙球默认执行水平镜像方向（左↔右，上下不变）。一侧被墙、边界或机关挡住时会停留，另一侧仍可移动；结算后两球若落在同一格，本回合取消；相邻两球允许互相对穿交换。</section>
          <section><b style="color:var(--text)">操作</b><br />可直接在棋盘上滑动，也可点击方向键。顶部 ↩ 用于撤销，↻ 用于重开，? 会显示当前关卡提示。游戏不限时、撤销不限次数。</section>
          <section><b style="color:var(--text)">地图互动</b><br />墙体/边界会阻挡；压板控制门；暂停格可提供一次停留机会；映射切换器会改变橙球响应；彩色门只允许对应颜色通过；单向格限制离开方向；传送门成对传送；脆弱格经过后可能坍塌；脉冲机关需要同步触发；相位门按奇偶回合开放；视野信标会扩展探索区域。</section>
          <section><b style="color:var(--text)">探索难度</b><br />简单：全图常亮。标准：当前九宫格可见，探索过的路径永久保留。困难：只显示当前附近九宫格，离开后的区域重新被迷雾覆盖。</section>
        </div>
        <button id="btn-tutorial-close" data-testid="btn-tutorial-close" type="button" class="btn-primary" style="width:100%;margin-top:16px;min-height:44px;font-size:15px">明白了</button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeButton = modal.querySelector<HTMLButtonElement>('#btn-tutorial-close');
    if (!closeButton) throw new Error('教学弹窗缺少关闭按钮');
    const openTutorial = (): void => {
      audioManager.play('uiTap');
      modal.hidden = false;
      closeButton.focus();
    };
    const closeTutorial = (): void => {
      modal.hidden = true;
      tutorialButton.focus();
    };
    const onBackdrop = (event: MouseEvent): void => {
      if (event.target === modal) closeTutorial();
    };
    const onEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !modal.hidden) closeTutorial();
    };

    tutorialButton.addEventListener('click', openTutorial);
    closeButton.addEventListener('click', closeTutorial);
    modal.addEventListener('click', onBackdrop);
    window.addEventListener('keydown', onEscape);

    this.cleanupFns.push(
      () => tutorialButton.removeEventListener('click', openTutorial),
      () => closeButton.removeEventListener('click', closeTutorial),
      () => modal.removeEventListener('click', onBackdrop),
      () => window.removeEventListener('keydown', onEscape),
      () => {
        panel.remove();
        tutorialButton.remove();
        modal.remove();
        home.classList.remove('overlay-scroll');
      }
    );
  }
}
