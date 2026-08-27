import { describe, expect, it } from 'vitest';
import type { Entity, LevelDef } from '../../../src/domain/types';
import { bfsSolve, replaySolution } from '../../../tools/solver/bfs-solver';
import { LEVELS } from '../../../src/content/levels';

function makeLevel(overrides: Partial<LevelDef> & { entities?: Entity[] } = {}): LevelDef {
  return {
    schemaVersion: 1,
    id: 'test-level',
    chapter: 1,
    order: 1,
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 0 },
    orangeStart: { x: 4, y: 0 },
    blueExit: { x: 0, y: 4 },
    orangeExit: { x: 4, y: 4 },
    initialMapping: 'H_MIRROR',
    walls: [],
    entities: [],
    parMoves: 1,
    hint: { focus: 'test' },
    tags: ['chapter-1', 'M0'],
    ...overrides
  };
}

describe('BFS 求解器', () => {
  describe('已知可解关卡', () => {
    it('level-001 最短步数为 1', () => {
      const entry = LEVELS.find((l) => l.id === 'level-001');
      expect(entry, 'level-001 未注册').toBeDefined();
      const level_001 = entry as LevelDef;
      const result = bfsSolve(level_001);
      expect(result.solvable).toBe(true);
      expect(result.optimalSteps).toBe(1);
      expect(result.solution).toEqual(['LEFT']);
    });

    it('level-002 最短步数为 3', () => {
      const entry = LEVELS.find((l) => l.id === 'level-002');
      expect(entry, 'level-002 未注册').toBeDefined();
      const level_002 = entry as LevelDef;
      const result = bfsSolve(level_002);
      expect(result.solvable).toBe(true);
      expect(result.optimalSteps).toBe(3);
    });

    it('level-003 最短步数为 4', () => {
      const entry = LEVELS.find((l) => l.id === 'level-003');
      expect(entry, 'level-003 未注册').toBeDefined();
      const level_003 = entry as LevelDef;
      const result = bfsSolve(level_003);
      expect(result.solvable).toBe(true);
      expect(result.optimalSteps).toBe(4);
    });

    it('level-047 已重制为长解关卡，par 与 BFS 一致', () => {
      const entry = LEVELS.find((l) => l.id === 'level-047');
      expect(entry, 'level-047 未注册').toBeDefined();
      const level_047 = entry as LevelDef;
      const result = bfsSolve(level_047);
      expect(result.solvable).toBe(true);
      expect(result.optimalSteps).toBe(level_047.parMoves);
      expect(result.optimalSteps).toBeGreaterThanOrEqual(20);
    });

    it('所有 50 关均可解且回放至胜利', () => {
      expect(LEVELS).toHaveLength(50);
      for (const level of LEVELS) {
        const result = bfsSolve(level);
        expect(result.solvable, `${level.id} 应可解`).toBe(true);
        const replayOk = replaySolution(level, result.solution);
        expect(replayOk, `${level.id} 回放应胜利`).toBe(true);
      }
    });
  });

  describe('已知不可解关卡', () => {
    it('3x3 中间行全墙不可解', () => {
      const level = makeLevel({
        grid: { width: 3, height: 3 },
        blueStart: { x: 0, y: 0 },
        orangeStart: { x: 2, y: 0 },
        blueExit: { x: 0, y: 2 },
        orangeExit: { x: 2, y: 2 },
        walls: [
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 }
        ]
      });
      const result = bfsSolve(level);
      expect(result.solvable).toBe(false);
      expect(result.budgetExhausted).toBe(false);
      expect(result.reason).toContain('状态空间');
    });
  });

  describe('2x2 最小网格可解关', () => {
    it('2x2 简单关卡可解', () => {
      const level = makeLevel({
        grid: { width: 2, height: 2 },
        blueStart: { x: 0, y: 0 },
        orangeStart: { x: 1, y: 0 },
        blueExit: { x: 0, y: 1 },
        orangeExit: { x: 1, y: 1 }
      });
      const result = bfsSolve(level);
      expect(result.solvable).toBe(true);
      expect(result.optimalSteps).toBeGreaterThanOrEqual(1);
    });
  });

  describe('预算超限', () => {
    it('小预算触发超预算分支', () => {
      const level = makeLevel({
        grid: { width: 5, height: 5 },
        walls: []
      });
      const result = bfsSolve(level, { maxNodes: 1, maxDepth: 100 });
      expect(result.solvable).toBe(false);
      expect(result.budgetExhausted).toBe(true);
      expect(result.statesVisited).toBeLessThanOrEqual(2);
      expect(result.reason).toContain('节点预算超限');
    });
  });

  describe('50 次重复求解一致性', () => {
    it('level-001 求解 50 次结果一致', () => {
      const entry = LEVELS.find((l) => l.id === 'level-001');
      expect(entry, 'level-001 未注册').toBeDefined();
      const level = entry as LevelDef;
      const results: string[] = [];
      for (let i = 0; i < 50; i++) {
        const result = bfsSolve(level);
        results.push(`${result.solvable}-${result.optimalSteps}-${result.solution.join(',')}`);
      }
      const first = results[0];
      for (const r of results) expect(r).toBe(first);
    });

    it('level-029 求解 50 次结果一致', () => {
      const entry = LEVELS.find((l) => l.id === 'level-029');
      expect(entry, 'level-029 未注册').toBeDefined();
      const level = entry as LevelDef;
      const results: string[] = [];
      for (let i = 0; i < 50; i++) {
        const result = bfsSolve(level);
        results.push(`${result.solvable}-${result.optimalSteps}-${result.solution.join(',')}`);
      }
      const first = results[0];
      for (const r of results) expect(r).toBe(first);
    });
  });
});
