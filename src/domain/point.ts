import type { Direction, Grid, Point } from './types';

export const DELTA: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

export function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

export function equalsPoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function addDir(p: Point, d: Direction): Point {
  const delta = DELTA[d];
  return { x: p.x + delta.x, y: p.y + delta.y };
}

export function inBounds(grid: Grid, p: Point): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < grid.width && p.y < grid.height;
}
