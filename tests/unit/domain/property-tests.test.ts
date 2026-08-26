/**
 * 属性测试 / 受控随机测试（阶段 12）。
 *
 * 用种子化 PRNG（mulberry32，不引入 fast-check）生成随机输入序列，验证：
 * - 确定性（同种子同结果）
 * - 状态合法（不变量 I1~I19 中可自动检查的项）
 * - 撤销往返（任意序列撤销到底 = 初始状态）
 * - 序列化往返（serialize/deserialize 后等价）
 * - 求解回放（对全部 50 关用求解器最短解回放到胜利）
 */

import { describe, expect, it } from 'vitest';
import { applyCommand, restart, undo } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import { canonicalJSON, deserialize, serialize, stableHash } from '../../../src/domain/serialize';
import { equalsPoint, inBounds } from '../../../src/domain/point';
import type { Direction, GameState, LevelDef } from '../../../src/domain/types';
import { DIRECTIONS } from '../../../src/domain/types';
import { makeLevel, mulberry32 } from './helpers';
import { bfsSolve, replaySolution } from '../../../tools/solver/bfs-solver';
import { LEVELS } from '../../../src/content/levels';

// ── 受控随机序列生成 ──

function randomSequence(seed: number, length: number): Direction[] {
  const rng = mulberry32(seed);
  const seq: Direction[] = [];
  for (let i = 0; i < length; i++) {
    const dir = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)];
    if (dir) seq.push(dir);
  }
  return seq;
}

// ── 多样关卡配置 ──

const PROPERTY_LEVELS: LevelDef[] = [
  // 简单关
  makeLevel({
    id: 'prop-simple',
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 2 },
    orangeStart: { x: 4, y: 2 },
    blueExit: { x: 0, y: 0 },
    orangeExit: { x: 4, y: 0 }
  }),
  // 有墙关
  makeLevel({
    id: 'prop-walls',
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 0 },
    orangeStart: { x: 4, y: 0 },
    blueExit: { x: 0, y: 4 },
    orangeExit: { x: 4, y: 4 },
    walls: [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 }
    ]
  }),
  // 全机关关
  makeLevel({
    id: 'prop-all-mechs',
    grid: { width: 6, height: 6 },
    blueStart: { x: 0, y: 1 },
    orangeStart: { x: 5, y: 4 },
    blueExit: { x: 5, y: 1 },
    orangeExit: { x: 0, y: 4 },
    walls: [
      { x: 2, y: 2 },
      { x: 3, y: 3 }
    ],
    entities: [
      { type: 'plate', id: 'p1', x: 1, y: 4, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 4, y: 1 },
      { type: 'fragile', x: 1, y: 1 },
      { type: 'fragile', x: 4, y: 4 },
      { type: 'switcher', x: 5, y: 5, target: 'V_MIRROR' },
      { type: 'oneWay', x: 0, y: 3, arrow: 'RIGHT' },
      { type: 'portal', portalId: 'pp', x: 2, y: 5, end: 'A' },
      { type: 'portal', portalId: 'pp', x: 5, y: 2, end: 'B' },
      { type: 'pauseTile', x: 3, y: 0 },
      { type: 'pulseSwitch', pairId: 's1', x: 0, y: 0 },
      { type: 'pulseSwitch', pairId: 's1', x: 5, y: 0 },
      { type: 'pulseDoor', pairId: 's1', x: 2, y: 0 },
      { type: 'colorDoor', x: 3, y: 4, color: 'ORANGE' }
    ]
  })
];

// ── 不变量检查辅助 ──

function checkInvariants(state: GameState, level: LevelDef): void {
  // I1: 角色在界内、不站在坍塌格上
  expect(inBounds(level.grid, state.actors.blue.pos), 'I1: 蓝在界内').toBe(true);
  expect(inBounds(level.grid, state.actors.orange.pos), 'I1: 橙在界内').toBe(true);
  expect(
    state.fragileCollapsed.some((c) => equalsPoint(c, state.actors.blue.pos)),
    'I1: 蓝不在坍塌格上'
  ).toBe(false);
  expect(
    state.fragileCollapsed.some((c) => equalsPoint(c, state.actors.orange.pos)),
    'I1: 橙不在坍塌格上'
  ).toBe(false);

  // I2: 双角色不同格
  expect(equalsPoint(state.actors.blue.pos, state.actors.orange.pos), 'I2: 双角色不同格').toBe(
    false
  );

  // I3: 映射在有效范围内
  expect(['H_MIRROR', 'V_MIRROR', 'ROTATE_CW']).toContain(state.mapping);

  // I8: history 长度与 moveCount 一致
  expect(state.history.length, 'I8: history 长度 <= moveCount').toBeLessThanOrEqual(
    state.moveCount
  );

  // I15: 空 history 时 moveCount 为 0
  if (state.history.length === 0) {
    expect(state.moveCount, 'I15: 空 history 时 moveCount=0').toBe(0);
  }
}

// ── 测试 ──

describe('属性测试：确定性', () => {
  for (const level of PROPERTY_LEVELS) {
    it(`${level.id}: 随机序列用不同种子重放哈希一致`, () => {
      for (const seed of [42, 123, 20260826]) {
        const seq = randomSequence(seed, 50);
        const run = (): string => {
          let state = createInitialState(level);
          for (const d of seq) {
            state = applyCommand(level, state, d).state;
          }
          return stableHash(state);
        };
        const h1 = run();
        const h2 = run();
        expect(h1, `种子 ${seed} 确定性失败`).toBe(h2);
      }
    });
  }
});

describe('属性测试：状态合法（不变量检查）', () => {
  for (const level of PROPERTY_LEVELS) {
    it(`${level.id}: 随机序列每步后保持 I1/I2/I3/I8/I15`, () => {
      const seq = randomSequence(42, 100);
      let state = createInitialState(level);
      checkInvariants(state, level);
      for (const d of seq) {
        state = applyCommand(level, state, d).state;
        checkInvariants(state, level);
      }
    });
  }
});

describe('属性测试：撤销往返', () => {
  for (const level of PROPERTY_LEVELS) {
    it(`${level.id}: 完全撤销后 === 初始状态`, () => {
      const seq = randomSequence(7, 80);
      const initial = createInitialState(level);
      let state = initial;
      for (const d of seq) {
        state = applyCommand(level, state, d).state;
      }
      const appliedMoves = state.moveCount;
      expect(appliedMoves).toBeGreaterThan(0);

      // 逐步撤销到底
      let undoneCount = 0;
      while (state.history.length > 0) {
        const outcome = undo(state);
        expect(outcome.undone, `第 ${undoneCount + 1} 次撤销应成功`).toBe(true);
        state = outcome.state;
        undoneCount++;
      }
      expect(undoneCount).toBe(appliedMoves);
      expect(state.moveCount).toBe(0);
      expect(state.history).toHaveLength(0);
      expect(canonicalJSON(state), '撤销后状态应与初始状态一致').toBe(canonicalJSON(initial));
    });

    it(`${level.id}: 撤销再重放等价`, () => {
      const seq = randomSequence(13, 30);
      const initial = createInitialState(level);
      let state = initial;
      for (const d of seq) {
        state = applyCommand(level, state, d).state;
      }
      const forwardHash = stableHash(state);

      // 撤销到底再重放
      while (state.history.length > 0) {
        state = undo(state).state;
      }
      for (const d of seq) {
        state = applyCommand(level, state, d).state;
      }
      expect(stableHash(state), '撤销再重放应等价').toBe(forwardHash);
    });
  }
});

describe('属性测试：序列化往返', () => {
  for (const level of PROPERTY_LEVELS) {
    it(`${level.id}: 随机序列后 serialize/deserialize 往返等价`, () => {
      const seq = randomSequence(99, 40);
      let state = createInitialState(level);
      for (const d of seq) {
        state = applyCommand(level, state, d).state;
      }
      const serialized = serialize(state);
      const restored = deserialize(serialized);
      expect(canonicalJSON(restored), '序列化往返后状态一致').toBe(canonicalJSON(state));
      expect(stableHash(restored), '哈希一致').toBe(stableHash(state));

      // 反序列化后仍可撤销
      const undone = undo(restored);
      expect(undone.undone, '反序列化后撤销应成功').toBe(true);
    });

    it(`${level.id}: 初始状态序列化往返`, () => {
      const initial = createInitialState(level);
      const serialized = serialize(initial);
      const restored = deserialize(serialized);
      expect(canonicalJSON(restored)).toBe(canonicalJSON(initial));
    });
  }
});

describe('属性测试：求解回放（全部 50 关）', () => {
  it('每关用 BFS 求解，最短解回放至胜利', () => {
    for (const level of LEVELS) {
      const result = bfsSolve(level);
      expect(result.solvable, `${level.id} 应可解`).toBe(true);
      expect(result.budgetExhausted, `${level.id} 不应超预算`).toBe(false);
      const replayOk = replaySolution(level, result.solution);
      expect(replayOk, `${level.id} 回放应胜利`).toBe(true);
    }
  });

  it('每关求解器最优步数 <= parMoves', () => {
    for (const level of LEVELS) {
      const result = bfsSolve(level);
      expect(result.solvable, `${level.id} 应可解`).toBe(true);
      expect(
        result.optimalSteps,
        `${level.id} 最优步数 ${result.optimalSteps} <= parMoves ${level.parMoves}`
      ).toBeLessThanOrEqual(level.parMoves);
    }
  });

  it('每关求解器结果稳定（3 次重跑一致）', () => {
    for (const level of LEVELS) {
      const r1 = bfsSolve(level);
      const r2 = bfsSolve(level);
      const r3 = bfsSolve(level);
      const key = (r: { solvable: boolean; optimalSteps: number; solution: Direction[] }): string =>
        `${r.solvable}-${r.optimalSteps}-${r.solution.join(',')}`;
      expect(key(r1), `${level.id} 第 1 次`).toBe(key(r2));
      expect(key(r2), `${level.id} 第 2 次`).toBe(key(r3));
    }
  });
});

describe('属性测试：restart 结果不变性', () => {
  for (const level of PROPERTY_LEVELS) {
    it(`${level.id}: 多次 restart 结果一致`, () => {
      const s1 = restart(level);
      const s2 = restart(level);
      const s3 = restart(level);
      expect(canonicalJSON(s1)).toBe(canonicalJSON(s2));
      expect(canonicalJSON(s2)).toBe(canonicalJSON(s3));
    });
  }
});

describe('属性测试：胜利后状态不可变', () => {
  it('WON 后所有输入被忽略，状态不变', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 3, y: 0 },
      blueExit: { x: 0, y: 0 },
      orangeExit: { x: 4, y: 0 }
    });
    const won = applyCommand(level, createInitialState(level), 'LEFT').state;
    expect(won.status).toBe('WON');

    // 尝试各种输入
    for (const dir of DIRECTIONS) {
      const { state, result } = applyCommand(level, won, dir);
      expect(result.applied).toBe(false);
      expect(canonicalJSON(state)).toBe(canonicalJSON(won));
    }
  });
});

describe('属性测试：同种种子序列完全一致', () => {
  it('种子 20260826 在 3 个不同关卡上各跑 5 次结果一致', () => {
    for (const level of PROPERTY_LEVELS) {
      const seq = randomSequence(20260826, 30);
      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        let state = createInitialState(level);
        for (const d of seq) {
          state = applyCommand(level, state, d).state;
        }
        results.push(stableHash(state));
      }
      const first = results[0];
      if (!first) throw new Error('empty results');
      for (const r of results) {
        expect(r, `${level.id}: 种子化序列结果一致`).toBe(first);
      }
    }
  });
});
