import { describe, expect, it } from 'vitest';
import { applyCommand, restart, undo } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import { canonicalJSON } from '../../../src/domain/serialize';
import type { Direction, GameState } from '../../../src/domain/types';
import { makeLevel } from './helpers';

function sameState(a: GameState, b: GameState): boolean {
  return canonicalJSON(a) === canonicalJSON(b);
}

describe('R-01 正交网格与输入域', () => {
  it('GWT-R01-1 每次输入每角色最多移动 1 格', () => {
    const level = makeLevel({ blueStart: { x: 2, y: 2 }, orangeStart: { x: 2, y: 4 } });
    const { state, result } = applyCommand(level, createInitialState(level), 'LEFT');
    expect(result.applied).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 2 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 4 });
  });

  it('GWT-R01-2 非法方向被拒绝（不吞掉非法状态）', () => {
    const level = makeLevel();
    const state = createInitialState(level);
    expect(() => applyCommand(level, state, 'DIAGONAL' as Direction)).toThrow(/非法方向输入/);
  });
});

describe('R-02 蓝原向、橙镜像', () => {
  it('GWT-R02-1 H_MIRROR：LEFT → 蓝左橙右', () => {
    const level = makeLevel({ blueStart: { x: 1, y: 2 }, orangeStart: { x: 3, y: 2 } });
    const { state } = applyCommand(level, createInitialState(level), 'LEFT');
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 2 });
    expect(state.actors.orange.pos).toEqual({ x: 4, y: 2 });
  });

  it('GWT-R02-2 H_MIRROR：UP 不被镜像', () => {
    const level = makeLevel({ blueStart: { x: 1, y: 2 }, orangeStart: { x: 3, y: 2 } });
    const { state } = applyCommand(level, createInitialState(level), 'UP');
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 1 });
  });

  it('GWT-R02-3 V_MIRROR：UP → 蓝上橙下（I9 仅橙受影响）', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 2 },
      initialMapping: 'V_MIRROR'
    });
    const { state } = applyCommand(level, createInitialState(level), 'UP');
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 3 });
  });

  it('GWT-R02-4 ROTATE_CW：UP → 蓝上橙右', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 2, y: 2 },
      initialMapping: 'ROTATE_CW'
    });
    const { state } = applyCommand(level, createInitialState(level), 'UP');
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 2 });
  });
});

describe('R-03 单方受阻', () => {
  it('GWT-R03-1 单方被墙阻挡：停留，另一方仍移动', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 2 },
      walls: [{ x: 0, y: 2 }]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'LEFT');
    expect(result.applied).toBe(true);
    expect(result.blue.blocked).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 2 });
    expect(state.actors.orange.pos).toEqual({ x: 4, y: 2 });
    expect(state.moveCount).toBe(1);
  });

  it('GWT-R03-2 边界阻挡', () => {
    const level = makeLevel({ blueStart: { x: 0, y: 2 }, orangeStart: { x: 3, y: 2 } });
    const { state, result } = applyCommand(level, createInitialState(level), 'LEFT');
    expect(result.blue.blocked).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 2 });
    expect(state.actors.orange.pos).toEqual({ x: 4, y: 2 });
  });

  it('GWT-R03-3 双方皆阻：空回合合法成立', () => {
    const level = makeLevel({ blueStart: { x: 0, y: 2 }, orangeStart: { x: 4, y: 2 } });
    const { state, result } = applyCommand(level, createInitialState(level), 'LEFT');
    expect(result.applied).toBe(true);
    expect(result.blue.blocked).toBe(true);
    expect(result.orange.blocked).toBe(true);
    expect(state.moveCount).toBe(1);
  });
});

describe('R-04 同格取消与对穿', () => {
  it('GWT-R04-1 对穿交换成立', () => {
    const level = makeLevel({ blueStart: { x: 1, y: 2 }, orangeStart: { x: 2, y: 2 } });
    const { state, result } = applyCommand(level, createInitialState(level), 'RIGHT');
    expect(result.applied).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 2 });
    expect(state.actors.orange.pos).toEqual({ x: 1, y: 2 });
  });

  it('GWT-R04-2 撞向同一格：整步取消，状态按位不变、不压栈不计数（I6）', () => {
    const level = makeLevel({ blueStart: { x: 0, y: 2 }, orangeStart: { x: 2, y: 2 } });
    const prev = createInitialState(level);
    const { state, result } = applyCommand(level, prev, 'RIGHT');
    expect(result.applied).toBe(false);
    expect(state).toBe(prev);
    expect(state.moveCount).toBe(0);
    expect(state.history).toHaveLength(0);
  });

  it('GWT-R04-3 取消回合恢复已消耗的暂停令牌', () => {
    const level = makeLevel({ blueStart: { x: 1, y: 2 }, orangeStart: { x: 2, y: 2 } });
    const prev = createInitialState(level);
    prev.actors.orange.hasPauseToken = true;
    const { state, result } = applyCommand(level, prev, 'RIGHT');
    expect(result.applied).toBe(false);
    expect(state.actors.orange.hasPauseToken).toBe(true);
    expect(state.moveCount).toBe(0);
  });
});

describe('R-05 出口不锁定与双出口胜利', () => {
  it('GWT-R05-1 同回合双达标 → WON', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 3, y: 0 },
      blueExit: { x: 0, y: 0 },
      orangeExit: { x: 4, y: 0 }
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'LEFT');
    expect(result.won).toBe(true);
    expect(state.status).toBe('WON');
  });

  it('GWT-R05-2 提前到达不锁定：可离开出口', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 3, y: 2 },
      blueExit: { x: 0, y: 0 },
      orangeExit: { x: 4, y: 0 }
    });
    const { state } = applyCommand(level, createInitialState(level), 'DOWN');
    expect(state.status).toBe('PLAYING');
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 1 });
  });

  it('GWT-R05-3 单方在出口不判胜', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 3, y: 2 },
      blueExit: { x: 0, y: 0 },
      orangeExit: { x: 4, y: 0 }
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'LEFT');
    expect(result.won).toBe(false);
    expect(state.status).toBe('PLAYING');
    expect(state.actors.blue.pos).toEqual(level.blueExit);
  });

  it('GWT-R05-4 站错出口不判胜', () => {
    const level = makeLevel({
      blueStart: { x: 3, y: 0 },
      orangeStart: { x: 1, y: 0 },
      blueExit: { x: 0, y: 0 },
      orangeExit: { x: 4, y: 0 }
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'RIGHT');
    expect(result.won).toBe(false);
    expect(state.status).toBe('PLAYING');
  });

  it('WON 后忽略 MOVE（转移表）', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 3, y: 0 },
      blueExit: { x: 0, y: 0 },
      orangeExit: { x: 4, y: 0 }
    });
    const won = applyCommand(level, createInitialState(level), 'LEFT').state;
    expect(won.status).toBe('WON');
    const { state, result } = applyCommand(level, won, 'DOWN');
    expect(result.applied).toBe(false);
    expect(state).toBe(won);
  });
});

describe('R-06 无限撤销', () => {
  const dynamicLevel = makeLevel({
    grid: { width: 6, height: 6 },
    blueStart: { x: 0, y: 1 },
    orangeStart: { x: 5, y: 1 },
    blueExit: { x: 0, y: 5 },
    orangeExit: { x: 5, y: 5 },
    walls: [{ x: 2, y: 2 }],
    entities: [
      { type: 'plate', id: 'p1', x: 1, y: 0, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 3, y: 1 },
      { type: 'fragile', x: 1, y: 1 },
      { type: 'fragile', x: 4, y: 1 },
      { type: 'switcher', x: 0, y: 0, target: 'V_MIRROR' },
      { type: 'pauseTile', x: 5, y: 0 },
      { type: 'pulseSwitch', pairId: 's1', x: 0, y: 3 },
      { type: 'pulseSwitch', pairId: 's1', x: 5, y: 3 },
      { type: 'pulseDoor', pairId: 's1', x: 2, y: 3 }
    ]
  });

  it('GWT-R06-1 撤销恢复全部动态状态（门/坍塌/令牌/映射/闩锁/计数）', () => {
    const initial = createInitialState(dynamicLevel);
    const seq: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT', 'RIGHT', 'UP', 'DOWN', 'LEFT'];
    let state = initial;
    for (const d of seq) {
      state = applyCommand(dynamicLevel, state, d).state;
    }
    expect(state.moveCount).toBeGreaterThan(0);
    const steps = state.moveCount;
    for (let i = 0; i < steps; i++) {
      const outcome = undo(state);
      expect(outcome.undone).toBe(true);
      state = outcome.state;
    }
    expect(sameState(state, initial)).toBe(true);
  });

  it('GWT-R06-2 空栈 UNDO 为 no-op（I15）', () => {
    const level = makeLevel();
    const initial = createInitialState(level);
    const { state, undone } = undo(initial);
    expect(undone).toBe(false);
    expect(state).toBe(initial);
  });

  it('GWT-R06-3 撤销后重放结果一致（I3、I19）', () => {
    const level = makeLevel({ blueStart: { x: 2, y: 2 }, orangeStart: { x: 2, y: 3 } });
    const s1 = applyCommand(level, createInitialState(level), 'LEFT').state;
    const undone = undo(s1).state;
    const s2 = applyCommand(level, undone, 'LEFT').state;
    expect(sameState(s1, s2)).toBe(true);
  });

  it('restart 与初始状态逐字段相等（I16）', () => {
    const initial = createInitialState(dynamicLevel);
    let state = applyCommand(dynamicLevel, initial, 'UP').state;
    state = applyCommand(dynamicLevel, state, 'RIGHT').state;
    expect(sameState(state, initial)).toBe(false);
    expect(sameState(restart(dynamicLevel), initial)).toBe(true);
  });
});

describe('R-07 目标步数仅评价', () => {
  it('超出 parMoves 仍可通关', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 3, y: 0 },
      blueExit: { x: 0, y: 0 },
      orangeExit: { x: 4, y: 0 },
      parMoves: 1
    });
    let state = createInitialState(level);
    const seq: Direction[] = ['UP', 'DOWN', 'UP', 'LEFT'];
    for (const d of seq) {
      state = applyCommand(level, state, d).state;
    }
    expect(state.status).toBe('WON');
    expect(state.moveCount).toBeGreaterThan(level.parMoves);
  });
});

describe('M0 墙与边界补充', () => {
  it('GWT-M0-2 墙角双阻', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 3, y: 2 },
      walls: [{ x: 1, y: 0 }]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'LEFT');
    expect(result.blue.blocked).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 0 });
  });

  it('墙不可从任何方向进入', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 1 },
      orangeStart: { x: 3, y: 3 },
      walls: [{ x: 2, y: 1 }]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'RIGHT');
    expect(result.blue.blocked).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 1 });
  });
});
