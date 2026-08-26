import { describe, expect, it } from 'vitest';
import {
  FIRST_LEVEL_ID,
  LEVELS,
  getLevelById,
  levelLinearIndex,
  nextLevelId
} from '../../../src/content/levels';
import type { LevelRecord } from '../../../src/content/validate';
import { parseLevel } from '../../../src/content/validate';
import { bfsSolve, replaySolution } from '../../../tools/solver/bfs-solver';
import { applyCommand } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import type { Direction, GameState } from '../../../src/domain/types';

const SOLUTIONS: Record<string, Direction[]> = {
  'level-001': ['LEFT'],
  'level-002': ['UP', 'UP', 'LEFT'],
  'level-003': ['DOWN', 'DOWN', 'DOWN', 'DOWN'],
  'level-011': ['LEFT', 'LEFT', 'LEFT', 'UP', 'RIGHT'],
  'level-015': ['LEFT', 'UP', 'LEFT', 'LEFT', 'LEFT', 'DOWN', 'DOWN'],
  'level-016': ['RIGHT', 'RIGHT', 'RIGHT'],
  'level-017': ['LEFT', 'LEFT', 'LEFT', 'LEFT', 'LEFT'],
  'level-021': ['DOWN', 'RIGHT', 'DOWN', 'DOWN'],
  'level-023': ['DOWN', 'DOWN', 'DOWN', 'UP'],
  'level-026': ['UP', 'UP', 'UP', 'UP'],
  'level-029': ['LEFT', 'RIGHT', 'RIGHT', 'RIGHT'],
  'level-031': ['UP', 'RIGHT', 'UP', 'RIGHT', 'UP', 'LEFT', 'LEFT'],
  'level-034': ['RIGHT', 'UP', 'UP', 'UP', 'UP'],
  'level-036': ['UP', 'RIGHT', 'LEFT'],
  'level-038': ['RIGHT', 'RIGHT', 'UP'],
  'level-041': ['UP', 'RIGHT', 'UP', 'UP', 'LEFT'],
  'level-044': ['UP', 'UP', 'RIGHT', 'UP', 'UP', 'LEFT'],
  'level-046': ['UP', 'RIGHT', 'UP', 'UP', 'UP', 'LEFT'],
  'level-047': ['UP', 'UP', 'UP', 'UP', 'UP', 'UP']
};

const TUTORIAL_IDS = new Set([
  'level-001',
  'level-002',
  'level-003',
  'level-004',
  'level-005',
  'level-006',
  'level-011',
  'level-012',
  'level-013',
  'level-014',
  'level-016',
  'level-021',
  'level-022',
  'level-026',
  'level-027',
  'level-031',
  'level-032',
  'level-036',
  'level-037',
  'level-041',
  'level-042',
  'level-046'
]);

function replay(level: LevelRecord, moves: Direction[]): GameState {
  let state = createInitialState(level);
  for (const dir of moves) {
    state = applyCommand(level, state, dir).state;
  }
  return state;
}

describe('关卡注册表（levels/chapter-01..05）', () => {
  it('注册表恰有 50 关，按章节/序号排序', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(ids.length).toBe(50);
    // 验证每章恰 10 关
    for (let ch = 1; ch <= 5; ch++) {
      const chLevels = LEVELS.filter((l) => l.chapter === ch);
      expect(chLevels.length, `第${ch}章应有 10 关`).toBe(10);
    }
    // 验证 order 连续
    for (let i = 1; i < ids.length; i++) {
      const curr = LEVELS[i];
      const prev = LEVELS[i - 1];
      expect(curr, `LEVELS[${i}] 应存在`).toBeDefined();
      expect(prev, `LEVELS[${i - 1}] 应存在`).toBeDefined();
      if (!curr || !prev) continue;
      expect(
        curr.order,
        `关卡顺序应递增: ${prev.id}(${prev.order}) -> ${curr.id}(${curr.order})`
      ).toBeGreaterThan(prev.order);
    }
    expect(FIRST_LEVEL_ID).toBe('level-001');
    expect(LEVELS[0]?.id).toBe('level-001');
    expect(LEVELS[LEVELS.length - 1]?.id).toBe('level-050');
  });

  it('每关按宣称教学解法可回放至胜利，且解法长度等于 parMoves', () => {
    for (const level of LEVELS) {
      const solution = SOLUTIONS[level.id];
      if (solution) {
        const final = replay(level, solution);
        expect(final.status, `${level.id} 回放未胜利`).toBe('WON');
        expect(final.moveCount, `${level.id} parMoves 与教学解法不一致`).toBe(level.parMoves);
      } else {
        // 新关卡：用 BFS 求解验证
        const result = bfsSolve(level);
        expect(result.solvable, `${level.id} 应可解`).toBe(true);
        const replayOk = replaySolution(level, result.solution);
        expect(replayOk, `${level.id} 回放应胜利`).toBe(true);
        expect(result.optimalSteps, `${level.id} 最短步数应 <= parMoves`).toBeLessThanOrEqual(
          level.parMoves
        );
      }
    }
  });

  it('所有关卡带章节与机制标签；教学关含 tutorial 标签', () => {
    for (const level of LEVELS) {
      expect(level.tags, `${level.id} 缺章节标签`).toContain(`chapter-${level.chapter}`);
      expect(
        level.tags.some((t) => /^M\d$/.test(t)),
        `${level.id} 缺机制标签`
      ).toBe(true);
      expect(level.tags.includes('tutorial'), `${level.id} tutorial 标记错误`).toBe(
        TUTORIAL_IDS.has(level.id)
      );
    }
  });

  it('nextLevelId 链与关卡顺序一致，末关返回 null', () => {
    expect(nextLevelId('level-001')).toBe('level-002');
    expect(nextLevelId('level-010')).toBe('level-011');
    expect(nextLevelId('level-020')).toBe('level-021');
    expect(nextLevelId('level-030')).toBe('level-031');
    expect(nextLevelId('level-040')).toBe('level-041');
    expect(nextLevelId('level-050')).toBeNull();
    expect(nextLevelId('不存在')).toBeNull();
    expect(getLevelById('level-002')?.title).toBe('左右相反');
  });

  it('levelLinearIndex 给出 1 基全局序号（50 关连续编号）', () => {
    expect(levelLinearIndex('level-001')).toBe(1);
    expect(levelLinearIndex('level-010')).toBe(10);
    expect(levelLinearIndex('level-011')).toBe(11);
    expect(levelLinearIndex('level-020')).toBe(20);
    expect(levelLinearIndex('level-021')).toBe(21);
    expect(levelLinearIndex('level-030')).toBe(30);
    expect(levelLinearIndex('level-031')).toBe(31);
    expect(levelLinearIndex('level-040')).toBe(40);
    expect(levelLinearIndex('level-041')).toBe(41);
    expect(levelLinearIndex('level-050')).toBe(50);
    expect(levelLinearIndex('不存在')).toBe(-1);
  });

  it('全部 50 关 BFS 可解且回放至胜利（自动回放验证）', () => {
    for (const level of LEVELS) {
      const result = bfsSolve(level);
      expect(result.solvable, `${level.id} 应可解`).toBe(true);
      expect(result.budgetExhausted, `${level.id} 不应超预算`).toBe(false);
      const replayOk = replaySolution(level, result.solution);
      expect(replayOk, `${level.id} 回放应胜利`).toBe(true);
    }
  });
});

function validRaw(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'level-001',
    chapter: 1,
    order: 1,
    title: '第一次分岔',
    grid: { width: 5, height: 3 },
    blueStart: { x: 1, y: 1 },
    orangeStart: { x: 3, y: 1 },
    blueExit: { x: 0, y: 1 },
    orangeExit: { x: 3, y: 1 },
    initialMapping: 'H_MIRROR',
    walls: [{ x: 4, y: 1 }],
    entities: [],
    parMoves: 1,
    hint: { focus: '测试', direction: 'LEFT' },
    tags: ['chapter-1', 'tutorial', 'M0']
  };
}

describe('parseLevel 严格校验（拒绝静默修复）', () => {
  it('合法数据通过解析', () => {
    const level = parseLevel(validRaw());
    expect(level.id).toBe('level-001');
    expect(level.hint.direction).toBe('LEFT');
  });

  it('拒绝未知字段', () => {
    const raw = validRaw();
    raw.extraField = 1;
    expect(() => parseLevel(raw)).toThrow(/未知字段/);
  });

  it('拒绝不受支持的 schemaVersion', () => {
    const raw = validRaw();
    raw.schemaVersion = 2;
    expect(() => parseLevel(raw)).toThrow(/schemaVersion/);
  });

  it('拒绝越界坐标', () => {
    const raw = validRaw();
    raw.walls = [{ x: 9, y: 1 }];
    expect(() => parseLevel(raw)).toThrow(/越界/);
  });

  it('拒绝双角色起点重合', () => {
    const raw = validRaw();
    raw.orangeStart = { x: 1, y: 1 };
    expect(() => parseLevel(raw)).toThrow(/起点重合/);
  });

  it('拒绝双出口重合', () => {
    const raw = validRaw();
    raw.orangeExit = { x: 0, y: 1 };
    expect(() => parseLevel(raw)).toThrow(/出口重合/);
  });

  it('拒绝墙压在出口上', () => {
    const raw = validRaw();
    raw.walls = [{ x: 0, y: 1 }];
    expect(() => parseLevel(raw)).toThrow(/重合/);
  });

  it('拒绝非法 parMoves 与空 tags', () => {
    const rawA = validRaw();
    rawA.parMoves = 0;
    expect(() => parseLevel(rawA)).toThrow(/parMoves/);
    const rawB = validRaw();
    rawB.tags = [];
    expect(() => parseLevel(rawB)).toThrow(/tags/);
  });

  it('拒绝未知实体类型', () => {
    const raw = validRaw();
    raw.entities = [{ type: 'mystery', x: 2, y: 1 }];
    expect(() => parseLevel(raw)).toThrow(/未知实体类型/);
  });
});
