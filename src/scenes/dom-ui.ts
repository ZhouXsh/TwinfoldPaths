/** 场景共享的 DOM UI 辅助：条形栏显隐与 HUD 文本。DOM 只做展示，不持有逻辑状态。 */

const BAR_IDS = [
  'bar-home',
  'bar-hud',
  'bar-controls',
  'bar-result',
  'bar-chapter-select',
  'bar-level-select',
  'bar-settings'
] as const;

export type BarId = (typeof BAR_IDS)[number];

/** 布局条栏：用可见性切换保持占位稳定，避免 Phaser 父容器尺寸变化（FIT 收缩不可靠）。 */
const LAYOUT_BARS: ReadonlySet<BarId> = new Set([
  'bar-hud',
  'bar-controls',
  'bar-chapter-select',
  'bar-level-select',
  'bar-settings'
]);

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

/** 映射指示（M4：界面始终显示当前映射）。 */
export function setMappingLabel(text: string): void {
  getEl('mapping-label').textContent = text;
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

/** 显示方向预览（在棋盘中央显示方向指示器）。 */
export function showDirectionPreview(dir: string | null): void {
  const el = getEl('dir-preview');
  if (!dir) {
    el.classList.remove('visible');
    el.textContent = '';
    return;
  }
  const arrowMap: Record<string, string> = {
    UP: '↑',
    DOWN: '↓',
    LEFT: '←',
    RIGHT: '→'
  };
  el.textContent = arrowMap[dir] ?? dir;
  el.classList.add('visible');
}

/** 隐藏方向预览。 */
export function hideDirectionPreview(): void {
  const el = getEl('dir-preview');
  el.classList.remove('visible');
  el.textContent = '';
}

/** 绑定按钮点击并在返回的清理函数中解绑（场景 shutdown 时调用）。 */
export function bindButton(id: string, handler: () => void): () => void {
  const btn = getEl<HTMLButtonElement>(id);
  if (!btn) return () => {};
  btn.addEventListener('click', handler);
  return () => btn.removeEventListener('click', handler);
}

/** 显示确认对话框。返回一个 Promise，resolve true=确认，false=取消。 */
export function showConfirmDialog(title: string, text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = getEl('confirm-modal');
    const titleEl = getEl('modal-title');
    const textEl = getEl('modal-text');
    const confirmBtn = getEl<HTMLButtonElement>('modal-confirm');
    const cancelBtn = getEl<HTMLButtonElement>('modal-cancel');
    titleEl.textContent = title;
    textEl.textContent = text;
    modal.classList.add('visible');

    const cleanup = (): void => {
      modal.classList.remove('visible');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
    };
    const onConfirm = (): void => {
      cleanup();
      resolve(true);
    };
    const onCancel = (): void => {
      cleanup();
      resolve(false);
    };
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

/** 更新关卡选择网格中的进度条。 */
export function updateProgress(completed: number, total: number): void {
  const row = getEl('progress-row');
  const fill = getEl('progress-fill');
  const text = getEl('progress-text');
  if (total === 0) {
    row.hidden = true;
    return;
  }
  row.hidden = false;
  fill.style.width = `${Math.round((completed / total) * 100)}%`;
  text.textContent = `${completed}/${total}`;
}
