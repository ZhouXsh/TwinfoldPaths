import type { Point } from '../domain/types';

export interface FogVisibilityInput {
  width: number;
  height: number;
  actors: readonly Point[];
  radius: number;
}

export function fogCellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * 计算当前可见格。使用 Chebyshev 距离，因此 radius=1 恰好是以角色为中心的 3x3 九宫格。
 * 该函数保持纯 TS，方便单测；GameScene 只负责把结果绘制成遮罩。
 */
export function computeVisibleCells(input: FogVisibilityInput): Set<string> {
  const visible = new Set<string>();
  const radius = Math.max(0, Math.floor(input.radius));
  for (const actor of input.actors) {
    const minX = Math.max(0, actor.x - radius);
    const maxX = Math.min(input.width - 1, actor.x + radius);
    const minY = Math.max(0, actor.y - radius);
    const maxY = Math.min(input.height - 1, actor.y + radius);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        visible.add(fogCellKey(x, y));
      }
    }
  }
  return visible;
}

export function mergeExploredCells(explored: Set<string>, visible: ReadonlySet<string>): void {
  for (const key of visible) explored.add(key);
}
