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
  'level-029': ['LEFT', 'RIGHT', 'RIGHT', 'RIGHT']
};

const TUTORIAL_IDS = new Set([
  'level-001',
  'level-002',
  'level-003',
  'level-011',
  'level-016',
  'level-021',
  'level-026'
]);

function replay(level: LevelRecord, moves: Direction[]): GameState {
  let state = createInitialState(level);
  for (const dir of moves) {
    state = applyCommand(level, state, dir).state;
  }
  return state;
}

describe('关卡注册表（levels/chapter-01..03）', () => {
  it('注册表恰有 11 关，按章节/序号排序', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([
      'level-001',
      'level-002',
      'level-003',
      'level-011',
      'level-015',
      'level-016',
      'level-017',
      'level-021',
      'level-023',
      'level-026',
      'level-029'
    ]);
    expect(LEVELS.filter((l) => l.chapter === 1).map((l) => l.order)).toEqual([1, 2, 3]);
    expect(LEVELS.filter((l) => l.chapter === 2).map((l) => l.order)).toEqual([11, 15, 16, 17]);
    expect(LEVELS.filter((l) => l.chapter === 3).map((l) => l.order)).toEqual([21, 23, 26, 29]);
    expect(FIRST_LEVEL_ID).toBe('level-001');
  });

  it('每关按宣称教学解法可回放至胜利，且解法长度等于 parMoves', () => {
    for (const level of LEVELS) {
      const solution = SOLUTIONS[level.id];
      expect(solution, `${level.id} 缺少教学解法`).toBeDefined();
      if (!solution) continue;
      const final = replay(level, solution);
      expect(final.status, `${level.id} 回放未胜利`).toBe('WON');
      expect(final.moveCount, `${level.id} parMoves 与教学解法不一致`).toBe(level.parMoves);
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
    expect(nextLevelId('level-003')).toBe('level-011');
    expect(nextLevelId('level-017')).toBe('level-021');
    expect(nextLevelId('level-029')).toBeNull();
    expect(nextLevelId('不存在')).toBeNull();
    expect(getLevelById('level-002')?.title).toBe('左右相反');
  });

  it('levelLinearIndex 给出 1 基全局序号（稀疏编号不破坏线性解锁）', () => {
    expect(levelLinearIndex('level-001')).toBe(1);
    expect(levelLinearIndex('level-003')).toBe(3);
    expect(levelLinearIndex('level-011')).toBe(4);
    expect(levelLinearIndex('level-029')).toBe(11);
    expect(levelLinearIndex('不存在')).toBe(-1);
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
