/** 场景共享的 DOM UI 辅助：条形栏显隐与 HUD 文本。DOM 只做展示，不持有逻辑状态。 */

const BAR_IDS = ['bar-home', 'bar-hud', 'bar-controls', 'bar-result'] as const;

export type BarId = (typeof BAR_IDS)[number];

/** 布局条栏：用可见性切换保持占位稳定，避免 Phaser 父容器尺寸变化（FIT 收缩不可靠）。 */
const LAYOUT_BARS: ReadonlySet<BarId> = new Set(['bar-hud', 'bar-controls']);

export function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`缺少 DOM 元素: #${id}`);
  return el as T;
}

export function showBars(...visible: BarId[]): void {
  for (const id of BAR_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const shown = visible.includes(id);
    if (LAYOUT_BARS.has(id)) {
      el.classList.toggle('ui-off', !shown);
    } else {
      el.hidden = !shown;
    }
  }
}

export function setMoveCount(moves: number): void {
  getEl('move-count').textContent = String(moves);
}

export function setLevelLabel(text: string): void {
  getEl('level-label').textContent = text;
}

export function setStatusText(text: string): void {
  getEl('status').textContent = text;
}

export function setResultText(text: string): void {
  getEl('result-text').textContent = text;
}

export function setHomeContinue(text: string): void {
  getEl('home-continue').textContent = text;
}

/** 绑定按钮点击并在返回的清理函数中解绑（场景 shutdown 时调用）。 */
export function bindButton(id: string, handler: () => void): () => void {
  const btn = getEl<HTMLButtonElement>(id);
  btn.addEventListener('click', handler);
  return () => btn.removeEventListener('click', handler);
}
