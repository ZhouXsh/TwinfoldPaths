import { describe, expect, it } from 'vitest';
import { applyCommand, undo } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import { canonicalJSON, deserialize, serialize, stableHash } from '../../../src/domain/serialize';
import type { Direction, GameState, LevelDef, MoveResult } from '../../../src/domain/types';
import { makeLevel } from './helpers';

function play(level: LevelDef, moves: Direction[]): { state: GameState; results: MoveResult[] } {
  let state = createInitialState(level);
  const results: MoveResult[] = [];
  for (const dir of moves) {
    const outcome = applyCommand(level, state, dir);
    results.push(outcome.result);
    state = outcome.state;
  }
  return { state, results };
}

/**
 * M1 时序基准关：蓝(1,1) 经 RIGHT 踩板(2,1)（墙(3,1)守板），橙(3,2) 向左尝试过门(2,2)。
 * 出口放在远处角落，避免"出口格永不阻挡"（R-05）干扰门阻挡判定。
 */
const M1_TIMING_LEVEL = makeLevel({
  id: 'm1-timing',
  blueStart: { x: 1, y: 1 },
  orangeStart: { x: 3, y: 2 },
  blueExit: { x: 0, y: 4 },
  orangeExit: { x: 4, y: 4 },
  walls: [{ x: 3, y: 1 }],
  entities: [
    { type: 'plate', id: 'p1', x: 2, y: 1, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 2, y: 2 }
  ]
});

describe('M1 压板与门：回合末刷新、离开即关闭', () => {
  it('门状态读取回合开始状态：踩板与穿门不可同回合（时序无歧义）', () => {
    const { state, results } = play(M1_TIMING_LEVEL, ['RIGHT']);
    expect(results[0]?.blue.blocked).toBe(false);
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 1 });
    expect(results[0]?.orange.blocked).toBe(true);
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 2 });
    expect(state.doors['d1']).toBe(true);
  });

  it('守板期间橙逐格穿门；穿门完成回合末离板关门（I1：关门时无人在门格）', () => {
    const { state, results } = play(M1_TIMING_LEVEL, ['RIGHT', 'RIGHT', 'LEFT']);
    expect(results[2]?.orange.blocked).toBe(false);
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 2 });
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(state.doors['d1']).toBe(false);
  });

  it('关门后原路返回被阻挡；重新踩板回合末再次开启（每回合末重推导，I11）', () => {
    const { state, results } = play(M1_TIMING_LEVEL, ['RIGHT', 'RIGHT', 'LEFT', 'RIGHT']);
    expect(results[3]?.orange.blocked).toBe(true);
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 2 });
    expect(state.doors['d1']).toBe(true);
  });

  it('无压板联动的门保持关闭且阻挡（D4）', () => {
    const level = makeLevel({
      id: 'm1-no-plate',
      blueStart: { x: 0, y: 4 },
      orangeStart: { x: 3, y: 1 },
      entities: [{ type: 'door', id: 'd2', x: 4, y: 1 }]
    });
    const { state, results } = play(level, ['LEFT']);
    expect(results[0]?.orange.blocked).toBe(true);
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 1 });
    expect(state.doors['d2']).toBe(false);
  });

  it('撤销恢复门开闭与全部位置（I4）', () => {
    let state = play(M1_TIMING_LEVEL, ['RIGHT', 'RIGHT']).state;
    expect(state.doors['d1']).toBe(true);
    expect(state.actors.orange.pos).toEqual({ x: 2, y: 2 });
    const undone1 = undo(state);
    expect(undone1.undone).toBe(true);
    expect(undone1.state.doors['d1']).toBe(true);
    expect(undone1.state.actors.orange.pos).toEqual({ x: 3, y: 2 });
    expect(undone1.state.moveCount).toBe(1);
    state = undone1.state;
    const undone2 = undo(state);
    expect(undone2.undone).toBe(true);
    expect(undone2.state.doors['d1']).toBe(false);
    expect(undone2.state.moveCount).toBe(0);
    expect(canonicalJSON(undone2.state)).toBe(canonicalJSON(createInitialState(M1_TIMING_LEVEL)));
  });
});

describe('M2 角色专属门：颜色+形状+纹理编码的通行对象', () => {
  it('蓝门只放行蓝：橙被阻挡', () => {
    const level = makeLevel({
      id: 'm2-blue-door',
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 3, y: 0 },
      blueExit: { x: 0, y: 4 },
      orangeExit: { x: 4, y: 4 },
      entities: [{ type: 'colorDoor', x: 2, y: 0, color: 'BLUE' }]
    });
    const { state, results } = play(level, ['RIGHT']);
    expect(results[0]?.blue.blocked).toBe(false);
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 0 });
    expect(results[0]?.orange.blocked).toBe(true);
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 0 });
  });

  it('橙门只放行橙：蓝被阻挡', () => {
    const level = makeLevel({
      id: 'm2-orange-door',
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 3, y: 0 },
      blueExit: { x: 0, y: 4 },
      orangeExit: { x: 4, y: 4 },
      entities: [{ type: 'colorDoor', x: 2, y: 0, color: 'ORANGE' }]
    });
    const { state, results } = play(level, ['RIGHT']);
    expect(results[0]?.blue.blocked).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 0 });
    expect(results[0]?.orange.blocked).toBe(false);
    expect(state.actors.orange.pos).toEqual({ x: 2, y: 0 });
  });

  it('镜像布局各走各门并同回合胜利（level-016 核心）', () => {
    const level = makeLevel({
      id: 'm2-both',
      grid: { width: 5, height: 3 },
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 3, y: 2 },
      blueExit: { x: 4, y: 0 },
      orangeExit: { x: 0, y: 2 },
      entities: [
        { type: 'colorDoor', x: 2, y: 0, color: 'BLUE' },
        { type: 'colorDoor', x: 2, y: 2, color: 'ORANGE' }
      ]
    });
    const { state } = play(level, ['RIGHT', 'RIGHT', 'RIGHT']);
    expect(state.status).toBe('WON');
    expect(state.moveCount).toBe(3);
  });
});

describe('M3 暂停格：令牌获取、消耗与恢复', () => {
  const tokenLevel = makeLevel({
    id: 'm3-token',
    blueStart: { x: 0, y: 0 },
    orangeStart: { x: 4, y: 4 },
    blueExit: { x: 4, y: 0 },
    orangeExit: { x: 0, y: 4 },
    entities: [{ type: 'pauseTile', x: 1, y: 0 }]
  });

  it('回合内新抵达暂停格且无令牌 → 回合末授予令牌（D6、ADR-015）', () => {
    const { state } = play(tokenLevel, ['RIGHT']);
    expect(state.actors.blue.hasPauseToken).toBe(true);
    expect(state.actors.orange.hasPauseToken).toBe(false);
  });

  it('下一输入消耗令牌：自身停留、对方照常结算、回合计数（ADR-002 消耗回合）', () => {
    const { state, results } = play(tokenLevel, ['RIGHT', 'RIGHT']);
    expect(results[1]?.pauseConsumed.blue).toBe(true);
    expect(results[1]?.blue.blocked).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 0 });
    expect(state.actors.blue.hasPauseToken).toBe(false);
    expect(state.actors.orange.pos).toEqual({ x: 2, y: 4 });
    expect(state.moveCount).toBe(2);
  });

  it('停留在暂停格不重授令牌；离开后再踩重新授予（ADR-015，令牌一次性、不囤积）', () => {
    const { state } = play(tokenLevel, ['RIGHT', 'RIGHT', 'LEFT', 'RIGHT']);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 0 });
    expect(state.actors.blue.hasPauseToken).toBe(true);
    expect(state.moveCount).toBe(4);
  });

  it('同格取消时令牌随全量回退恢复（I6）', () => {
    const level = makeLevel({
      id: 'm3-cancel-restore',
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 2, y: 1 },
      blueExit: { x: 4, y: 0 },
      orangeExit: { x: 0, y: 4 },
      entities: [{ type: 'pauseTile', x: 1, y: 0 }]
    });
    const first = applyCommand(level, createInitialState(level), 'RIGHT');
    expect(first.state.actors.blue.hasPauseToken).toBe(true);
    const second = applyCommand(level, first.state, 'UP');
    expect(second.result.applied).toBe(false);
    expect(second.state).toBe(first.state);
    expect(second.state.actors.blue.hasPauseToken).toBe(true);
    expect(second.state.moveCount).toBe(1);
  });

  it('双方同回合各消耗一枚令牌', () => {
    const level = makeLevel({
      id: 'm3-both',
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 0 },
      blueExit: { x: 0, y: 4 },
      orangeExit: { x: 4, y: 4 },
      entities: [
        { type: 'pauseTile', x: 1, y: 0 },
        { type: 'pauseTile', x: 3, y: 0 }
      ]
    });
    const { state, results } = play(level, ['RIGHT', 'RIGHT']);
    expect(results[1]?.pauseConsumed.blue).toBe(true);
    expect(results[1]?.pauseConsumed.orange).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 0 });
    expect(state.actors.blue.hasPauseToken).toBe(false);
    expect(state.actors.orange.hasPauseToken).toBe(false);
    expect(state.moveCount).toBe(2);
  });

  it('撤销恢复令牌（I4）', () => {
    const state = play(tokenLevel, ['RIGHT']).state;
    const { state: prev, undone } = undo(state);
    expect(undone).toBe(true);
    expect(prev.actors.blue.hasPauseToken).toBe(false);
    expect(prev.moveCount).toBe(0);
  });
});

describe('M4 映射切换器：H_MIRROR/V_MIRROR/ROTATE_CW', () => {
  const switchLevel = (target: 'V_MIRROR' | 'ROTATE_CW' | 'H_MIRROR'): LevelDef =>
    makeLevel({
      id: `m4-${target}`,
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 0 },
      entities: [{ type: 'switcher', x: 1, y: 0, target }]
    });

  it('站上切换器回合末切换；本回合方向仍用旧映射（I18）', () => {
    const level = switchLevel('V_MIRROR');
    const { state } = play(level, ['RIGHT']);
    expect(state.mapping).toBe('V_MIRROR');
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 0 });
  });

  it('V_MIRROR 生效后：UP 输入使橙向下', () => {
    const { state } = play(switchLevel('V_MIRROR'), ['RIGHT', 'UP']);
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 1 });
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 0 });
  });

  it('ROTATE_CW 生效后：UP 输入使橙向右', () => {
    const { state } = play(switchLevel('ROTATE_CW'), ['RIGHT', 'UP']);
    expect(state.actors.orange.pos).toEqual({ x: 4, y: 0 });
  });

  it('双切换器不同目标同回合被占 → 蓝色优先（ADR-006）', () => {
    const level = makeLevel({
      id: 'm4-conflict',
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 0 },
      entities: [
        { type: 'switcher', x: 1, y: 0, target: 'V_MIRROR' },
        { type: 'switcher', x: 3, y: 0, target: 'ROTATE_CW' }
      ]
    });
    const { state } = play(level, ['RIGHT']);
    expect(state.mapping).toBe('V_MIRROR');
  });

  it('离开切换器后映射保持，直到下一次切换', () => {
    const { state } = play(switchLevel('V_MIRROR'), ['RIGHT', 'UP', 'LEFT']);
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 0 });
    expect(state.mapping).toBe('V_MIRROR');
  });

  it('撤销恢复映射（I4）', () => {
    const state = play(switchLevel('V_MIRROR'), ['RIGHT', 'UP']).state;
    const { state: prev } = undo(undo(state).state);
    expect(prev.mapping).toBe('H_MIRROR');
    expect(prev.moveCount).toBe(0);
  });
});

/** level-023 同构副本：M1+M3 暂停压板协作。 */
const COMBO_M1_M3 = makeLevel({
  id: 'combo-m1m3',
  grid: { width: 5, height: 4 },
  blueStart: { x: 0, y: 0 },
  orangeStart: { x: 3, y: 0 },
  blueExit: { x: 0, y: 0 },
  orangeExit: { x: 3, y: 3 },
  walls: [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 4, y: 2 }
  ],
  entities: [
    { type: 'plate', id: 'p1', x: 0, y: 1, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 3, y: 2 },
    { type: 'pauseTile', x: 3, y: 3 }
  ]
});

/** level-029 同构副本：M1+M4 映射决定开门。 */
const COMBO_M1_M4 = makeLevel({
  id: 'combo-m1m4',
  grid: { width: 6, height: 3 },
  blueStart: { x: 0, y: 1 },
  orangeStart: { x: 2, y: 1 },
  blueExit: { x: 3, y: 1 },
  orangeExit: { x: 5, y: 1 },
  entities: [
    { type: 'switcher', x: 0, y: 1, target: 'V_MIRROR' },
    { type: 'plate', id: 'p1', x: 1, y: 1, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 4, y: 1 }
  ]
});

describe('组合与顺序（集成）', () => {
  it('M1+M3：压板守门 → 橙踩出口暂停格等蓝返回（level-023 核心）', () => {
    const { state, results } = play(COMBO_M1_M3, ['DOWN', 'DOWN', 'DOWN', 'UP']);
    const mid = play(COMBO_M1_M3, ['DOWN', 'DOWN']).state;
    expect(mid.doors['d1']).toBe(true);
    expect(mid.actors.orange.pos).toEqual({ x: 3, y: 2 });
    expect(results[3]?.pauseConsumed.orange).toBe(true);
    expect(state.status).toBe('WON');
    expect(state.moveCount).toBe(4);
    expect(state.doors['d1']).toBe(false);
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 3 });
  });

  it('M1+M4：切换映射后左右同向，压板开门（level-029 核心）', () => {
    const seq: Direction[] = ['LEFT', 'RIGHT', 'RIGHT', 'RIGHT'];
    const { state } = play(COMBO_M1_M4, seq);
    const after1 = play(COMBO_M1_M4, ['LEFT']).state;
    expect(after1.mapping).toBe('V_MIRROR');
    const after2 = play(COMBO_M1_M4, ['LEFT', 'RIGHT']).state;
    expect(after2.doors['d1']).toBe(true);
    expect(after2.actors.orange.pos).toEqual({ x: 3, y: 1 });
    expect(state.status).toBe('WON');
    expect(state.moveCount).toBe(4);
  });

  it('D3/D4 同回合均可生效：一站切换器、一踩压板', () => {
    const level = makeLevel({
      id: 'combo-d3d4',
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 0 },
      entities: [
        { type: 'switcher', x: 1, y: 0, target: 'V_MIRROR' },
        { type: 'plate', id: 'p1', x: 3, y: 0, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 4, y: 1 }
      ]
    });
    const { state } = play(level, ['RIGHT']);
    expect(state.mapping).toBe('V_MIRROR');
    expect(state.doors['d1']).toBe(true);
  });

  it('多机制序列完全撤销：逐字段回到初始状态（R-06/I4/I19）', () => {
    let state = play(COMBO_M1_M4, ['LEFT', 'RIGHT', 'RIGHT']).state;
    const initial = createInitialState(COMBO_M1_M4);
    while (state.history.length > 0) {
      state = undo(state).state;
    }
    expect(canonicalJSON(state)).toBe(canonicalJSON(initial));
    expect(stableHash(state)).toBe(stableHash(initial));
  });

  it('序列化/稳定哈希覆盖门、令牌与映射字段（I8）', () => {
    const mid = play(COMBO_M1_M3, ['DOWN', 'DOWN']).state;
    expect(mid.doors['d1']).toBe(true);
    const restored = deserialize(serialize(mid));
    expect(canonicalJSON(restored)).toBe(canonicalJSON(mid));
    expect(stableHash(restored)).toBe(stableHash(mid));
    expect(stableHash(mid)).not.toBe(stableHash(createInitialState(COMBO_M1_M3)));
    const withToken = play(COMBO_M1_M3, ['DOWN', 'DOWN', 'DOWN']).state;
    expect(withToken.actors.orange.hasPauseToken).toBe(true);
    expect(stableHash(withToken)).not.toBe(stableHash(mid));
  });
});
