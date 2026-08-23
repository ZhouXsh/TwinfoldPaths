import type { Direction } from '../domain/types';

/** 触发滑动识别的最小位移（游戏逻辑像素）。 */
export const SWIPE_MIN_DISTANCE = 20;

/** 把滑动位移归一化为四方向之一；位移不足返回 null（不产生回合）。 */
export function swipeToDirection(
  dx: number,
  dy: number,
  minDistance: number = SWIPE_MIN_DISTANCE
): Direction | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < minDistance) return null;
  if (ax >= ay) return dx > 0 ? 'RIGHT' : 'LEFT';
  return dy > 0 ? 'DOWN' : 'UP';
}
