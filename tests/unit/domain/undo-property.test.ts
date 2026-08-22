import { describe, expect, it } from 'vitest';
import { applyCommand, undo } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import { canonicalJSON, stableHash } from '../../../src/domain/serialize';
import { inBounds } from '../../../src/domain/point';
import type { Direction } from '../../../src/domain/types';
import { DIRECTIONS } from '../../../src/domain/types';
import { makeLevel, mulberry32 } from './helpers';

const stressLevel = makeLevel({
  id: 'stress-level',
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
    { type: 'pulseDoor', pairId: 's1', x: 2, y: 0 }
  ]
});

function randomSequence(seed: number, length: number): Direction[] {
  const rng = mulberry32(seed);
  const seq: Direction[] = [];
  for (let i = 0; i < length; i++) {
    const dir = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)];
    if (dir) seq.push(dir);
  }
  return seq;
}

describe('随机序列属性测试', () => {
  it('随机执行后完全撤销，最终状态与初始深度相等（强制验证）', () => {
    const seq = randomSequence(20260822, 300);
    const initial = createInitialState(stressLevel);
    let state = initial;
    for (const d of seq) {
      state = applyCommand(stressLevel, state, d).state;
    }
    const appliedMoves = state.moveCount;
    expect(appliedMoves).toBeGreaterThan(0);
    let undoneCount = 0;
    while (state.history.length > 0) {
      const outcome = undo(state);
      expect(outcome.undone).toBe(true);
      state = outcome.state;
      undoneCount++;
    }
    expect(undoneCount).toBe(appliedMoves);
    expect(state.moveCount).toBe(0);
    expect(state.history).toHaveLength(0);
    expect(canonicalJSON(state)).toBe(canonicalJSON(initial));
  });

  it('每步结算后保持 I1（在界内）与 I2（不同格）', () => {
    const seq = randomSequence(7, 200);
    let state = createInitialState(stressLevel);
    for (const d of seq) {
      state = applyCommand(stressLevel, state, d).state;
      expect(inBounds(stressLevel.grid, state.actors.blue.pos)).toBe(true);
      expect(inBounds(stressLevel.grid, state.actors.orange.pos)).toBe(true);
      expect(state.actors.blue.pos).not.toEqual(state.actors.orange.pos);
    }
  });

  it('同一种子重放两次，逐步哈希完全一致（确定性）', () => {
    const run = (): string[] => {
      const seq = randomSequence(99, 120);
      const hashes: string[] = [];
      let state = createInitialState(stressLevel);
      for (const d of seq) {
        state = applyCommand(stressLevel, state, d).state;
        hashes.push(stableHash(state));
      }
      return hashes;
    };
    expect(run()).toEqual(run());
  });
});
