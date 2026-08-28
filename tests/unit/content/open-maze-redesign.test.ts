import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../../src/content/levels';
import { analyzeSolutionTrace, bfsSolve, replaySolution } from '../../../tools/solver/bfs-solver';

function pointKey(p: { x: number; y: number }): string {
  return `${p.x},${p.y}`;
}

function graphMetrics(level: (typeof LEVELS)[number]) {
  const walls = new Set(level.walls.map(pointKey));
  const protectedCells = new Set([
    pointKey(level.blueStart),
    pointKey(level.orangeStart),
    pointKey(level.blueExit),
    pointKey(level.orangeExit)
  ]);
  let vertices = 0;
  let degreeSum = 0;
  let branches = 0;
  let deadEnds = 0;

  for (let y = 0; y < level.grid.height; y++) {
    for (let x = 0; x < level.grid.width; x++) {
      if (walls.has(`${x},${y}`)) continue;
      vertices++;
      const degree = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      ].filter(
        (p) =>
          p.x >= 0 &&
          p.y >= 0 &&
          p.x < level.grid.width &&
          p.y < level.grid.height &&
          !walls.has(pointKey(p))
      ).length;
      degreeSum += degree;
      if (degree >= 3) branches++;
      if (degree === 1 && !protectedCells.has(`${x},${y}`)) deadEnds++;
    }
  }

  const edges = degreeSum / 2;
  return {
    openRatio: vertices / (level.grid.width * level.grid.height),
    branches,
    deadEnds,
    cycleRank: edges - vertices + 1
  };
}

function staticReachable(level: (typeof LEVELS)[number], start: { x: number; y: number }) {
  const walls = new Set(level.walls.map(pointKey));
  const seen = new Set([pointKey(start)]);
  const queue = [{ ...start }];
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head]!;
    for (const q of [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 }
    ]) {
      if (
        q.x < 0 ||
        q.y < 0 ||
        q.x >= level.grid.width ||
        q.y >= level.grid.height ||
        walls.has(pointKey(q)) ||
        seen.has(pointKey(q))
      ) {
        continue;
      }
      seen.add(pointKey(q));
      queue.push(q);
    }
  }
  return seen;
}

describe('O7：后40关开放迷宫与双球对穿交互', () => {
  const redesigned = LEVELS.filter((level) => level.order >= 11);

  it('level-011..050 全量采用开放共享迷宫，而不是双单通道', () => {
    expect(redesigned).toHaveLength(40);
    for (const level of redesigned) {
      const metrics = graphMetrics(level);
      expect(level.tags, `${level.id} 缺 open-maze 标签`).toContain('open-maze');
      expect(level.tags, `${level.id} 缺 shared-maze 标签`).toContain('shared-maze');
      expect(level.tags, `${level.id} 缺 branching-map 标签`).toContain('branching-map');
      expect(metrics.openRatio, `${level.id} 开放率过低，仍像细管`).toBeGreaterThanOrEqual(0.52);
      expect(metrics.openRatio, `${level.id} 开放率过高，缺乏迷宫阻隔`).toBeLessThanOrEqual(0.82);
      expect(metrics.branches, `${level.id} 分岔不足`).toBeGreaterThanOrEqual(4);
      expect(metrics.deadEnds, `${level.id} 死胡同不足`).toBeGreaterThanOrEqual(2);
      expect(metrics.cycleRank, `${level.id} 缺少真实回环`).toBeGreaterThanOrEqual(2);

      const reachable = staticReachable(level, level.blueStart);
      for (const p of [level.orangeStart, level.blueExit, level.orangeExit]) {
        expect(reachable.has(pointKey(p)), `${level.id} 起终点不在同一共享迷宫`).toBe(true);
      }
    }
  });

  it('40/40 最优解真实发生对穿交换，并共享双方走过的空间', () => {
    for (const level of redesigned) {
      const result = bfsSolve(level, { maxNodes: 700_000, maxDepth: 120 });
      expect(result.solvable, `${level.id} 应可解: ${result.reason ?? ''}`).toBe(true);
      expect(result.budgetExhausted, `${level.id} 不应超预算`).toBe(false);
      expect(replaySolution(level, result.solution), `${level.id} 最短解应可回放`).toBe(true);
      expect(level.parMoves, `${level.id} parMoves 必须精确`).toBe(result.optimalSteps);

      const stats = analyzeSolutionTrace(level, result.solution);
      expect(stats.passThroughSwaps, `${level.id} 最优解没有利用 R-04 对穿交换`).toBeGreaterThanOrEqual(1);
      expect(stats.sharedVisitedCells, `${level.id} 双球轨迹没有共享空间`).toBeGreaterThanOrEqual(2);
      expect(
        stats.blueBlockedOrangeMoved + stats.orangeBlockedBlueMoved,
        `${level.id} 缺少单侧受阻解耦`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('至少24/40关在最优解中双向体现“一球停、另一球走”', () => {
    let count = 0;
    for (const level of redesigned) {
      const result = bfsSolve(level, { maxNodes: 700_000, maxDepth: 120 });
      const stats = analyzeSolutionTrace(level, result.solution);
      if (stats.blueBlockedOrangeMoved > 0 && stats.orangeBlockedBlueMoved > 0) count++;
    }
    expect(count).toBeGreaterThanOrEqual(24);
  });

  it('难度仍保持后程增长，后30关平均最优步数不低于18', () => {
    const rows = redesigned.map((level) => ({
      level,
      result: bfsSolve(level, { maxNodes: 700_000, maxDepth: 120 })
    }));
    const late30 = rows.filter(({ level }) => level.order >= 21);
    const lateAvg = late30.reduce((sum, row) => sum + row.result.optimalSteps, 0) / late30.length;
    expect(lateAvg).toBeGreaterThanOrEqual(18);

    const chapterAvg = (chapter: number) => {
      const items = rows.filter(({ level }) => level.chapter === chapter);
      return items.reduce((sum, row) => sum + row.result.optimalSteps, 0) / items.length;
    };
    expect(chapterAvg(3)).toBeGreaterThanOrEqual(chapterAvg(2));
    expect(chapterAvg(4)).toBeGreaterThanOrEqual(chapterAvg(3) - 1);
    expect(chapterAvg(5)).toBeGreaterThanOrEqual(chapterAvg(4) - 1);
  });
});
