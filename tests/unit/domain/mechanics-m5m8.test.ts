import { describe, expect, it } from 'vitest';
import { applyCommand, restart, undo } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import { canonicalJSON, deserialize, serialize, stableHash } from '../../../src/domain/serialize';
import type { Direction, GameState } from '../../../src/domain/types';
import { equalsPoint, inBounds } from '../../../src/domain/point';
import { makeLevel } from './helpers';

function play(level: ReturnType<typeof makeLevel>, ...inputs: Direction[]): GameState {
  let state = createInitialState(level);
  for (const dir of inputs) {
    state = applyCommand(level, state, dir).state;
  }
  return state;
}

function collapsedSet(state: GameState): string[] {
  return state.fragileCollapsed.map((p) => `${p.x},${p.y}`).sort();
}

describe('M5 单向格：离开约束与阻挡原因', () => {
  it('逆箭头离开被阻，阻挡原因为 oneWay（反馈与墙不同但逻辑确定）', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 2 },
      entities: [{ type: 'oneWay', x: 1, y: 2, arrow: 'UP' }]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'LEFT');
    expect(result.blue.blocked).toBe(true);
    expect(result.blue.reason).toBe('oneWay');
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 2 });
    expect(result.orange.blocked).toBe(false);
    expect(result.orange.reason).toBeNull();
  });

  it('P4 优先级：目标格是墙时原因为 wall（先于单向约束）', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 4 },
      walls: [{ x: 1, y: 1 }],
      entities: [{ type: 'oneWay', x: 1, y: 2, arrow: 'DOWN' }]
    });
    const { result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.blue.blocked).toBe(true);
    expect(result.blue.reason).toBe('wall');
  });

  it('边界与原因为 bounds；坍塌脆弱格阻挡原因为 wall', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 2 },
      orangeStart: { x: 4, y: 4 },
      entities: [{ type: 'fragile', x: 1, y: 2 }]
    });
    const edge = applyCommand(level, createInitialState(level), 'LEFT');
    expect(edge.result.blue.reason).toBe('bounds');
    let state = play(level, 'RIGHT', 'LEFT');
    expect(collapsedSet(state)).toEqual(['1,2']);
    state = applyCommand(level, state, 'RIGHT').state;
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 2 });
  });

  it('M5+M4：V_MIRROR 下橙色有效方向被映射，逆箭头离开被阻', () => {
    const level = makeLevel({
      initialMapping: 'V_MIRROR',
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 2 },
      entities: [{ type: 'oneWay', x: 3, y: 3, arrow: 'UP' }]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'UP');
    expect(t1.state.actors.orange.pos).toEqual({ x: 3, y: 3 });
    expect(t1.result.orange.blocked).toBe(false);
    state = t1.state;
    const t2 = applyCommand(level, state, 'UP');
    expect(t2.result.orange.blocked).toBe(true);
    expect(t2.result.orange.reason).toBe('oneWay');
    expect(t2.state.actors.orange.pos).toEqual({ x: 3, y: 3 });
    expect(t2.state.actors.blue.pos).toEqual({ x: 1, y: 0 });
  });

  it('顺箭头连续穿越两格单向格', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 2 },
      orangeStart: { x: 4, y: 4 },
      entities: [
        { type: 'oneWay', x: 1, y: 2, arrow: 'RIGHT' },
        { type: 'oneWay', x: 2, y: 2, arrow: 'RIGHT' }
      ]
    });
    const state = play(level, 'RIGHT', 'RIGHT');
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 2 });
  });

  it('传送落点为单向格：进入不限，离开受限', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 4 },
      orangeStart: { x: 4, y: 0 },
      walls: [
        { x: 0, y: 3 },
        { x: 1, y: 4 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 4, end: 'A' },
        { type: 'portal', portalId: 'p', x: 2, y: 2, end: 'B' },
        { type: 'oneWay', x: 2, y: 2, arrow: 'RIGHT' }
      ]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'LEFT');
    expect(t1.result.teleported.blue).toBe(true);
    expect(t1.state.actors.blue.pos).toEqual({ x: 2, y: 2 });
    state = t1.state;
    const t2 = applyCommand(level, state, 'LEFT');
    expect(t2.result.blue.blocked).toBe(true);
    expect(t2.result.blue.reason).toBe('oneWay');
    state = applyCommand(level, state, 'RIGHT').state;
    expect(state.actors.blue.pos).toEqual({ x: 3, y: 2 });
  });
});

describe('M6 传送：循环终止与每回合至多一次（I5）', () => {
  // 同格存在两个传送入口时，引擎按 entities 数组顺序取第一个（确定性，I3）；
  // 此处按链式顺序排列以固定 p→q→r 的跳转方向。阶段 09 校验器应禁止入口重叠。
  const chainLevel = makeLevel({
    blueStart: { x: 0, y: 0 },
    orangeStart: { x: 4, y: 0 },
    blueExit: { x: 0, y: 3 },
    orangeExit: { x: 3, y: 0 },
    walls: [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: 3 },
      { x: 3, y: 4 },
      { x: 4, y: 3 }
    ],
    entities: [
      { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
      { type: 'portal', portalId: 'q', x: 2, y: 2, end: 'A' },
      { type: 'portal', portalId: 'r', x: 4, y: 4, end: 'A' },
      { type: 'portal', portalId: 'p', x: 2, y: 2, end: 'B' },
      { type: 'portal', portalId: 'q', x: 4, y: 4, end: 'B' },
      { type: 'portal', portalId: 'r', x: 0, y: 0, end: 'B' }
    ]
  });

  it('传送链每回合只跳一步：A→B→C→A 需三回合（单回合无无限触发）', () => {
    let state = createInitialState(chainLevel);
    const t1 = applyCommand(chainLevel, state, 'LEFT');
    expect(t1.result.teleported.blue).toBe(true);
    expect(t1.state.actors.blue.pos).toEqual({ x: 2, y: 2 });
    state = t1.state;
    const t2 = applyCommand(chainLevel, state, 'LEFT');
    expect(t2.result.teleported.blue).toBe(true);
    expect(t2.state.actors.blue.pos).toEqual({ x: 4, y: 4 });
    state = t2.state;
    const t3 = applyCommand(chainLevel, state, 'LEFT');
    expect(t3.result.teleported.blue).toBe(true);
    expect(t3.state.actors.blue.pos).toEqual({ x: 0, y: 0 });
  });

  it('相邻互传对 A↔B：被阻挡停留时每回合往返一次，确定性终止', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 3, y: 3 },
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 1, y: 0, end: 'B' }
      ]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'UP');
    expect(t1.result.teleported.blue).toBe(true);
    expect(t1.state.actors.blue.pos).toEqual({ x: 1, y: 0 });
    state = t1.state;
    const t2 = applyCommand(level, state, 'UP');
    expect(t2.result.teleported.blue).toBe(true);
    expect(t2.state.actors.blue.pos).toEqual({ x: 0, y: 0 });
  });
});

describe('M6 传送：门口碰撞（目标格状态判定，结算规范 §3）', () => {
  it('目标为关闭普通门 → 失败停留；门由压板开启后下一回合成功', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 4 },
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 3, y: 0, end: 'B' },
        { type: 'door', id: 'd1', x: 3, y: 0 },
        { type: 'plate', id: 'p1', x: 4, y: 4, doorId: 'd1' }
      ]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'LEFT');
    expect(t1.result.teleported.blue).toBe(false);
    expect(t1.state.actors.blue.pos).toEqual({ x: 0, y: 0 });
    expect(t1.state.doors['d1']).toBe(true);
    state = t1.state;
    const t2 = applyCommand(level, state, 'LEFT');
    expect(t2.result.teleported.blue).toBe(true);
    expect(t2.state.actors.blue.pos).toEqual({ x: 3, y: 0 });
  });

  it('目标为未激活脉冲门 → 失败；配对闩锁后成功', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 0 },
      blueExit: { x: 0, y: 4 },
      orangeExit: { x: 4, y: 4 },
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 3, y: 0, end: 'B' },
        { type: 'pulseDoor', pairId: 's1', x: 3, y: 0 },
        { type: 'pulseSwitch', pairId: 's1', x: 0, y: 0 },
        { type: 'pulseSwitch', pairId: 's1', x: 4, y: 0 }
      ]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'UP');
    expect(t1.state.pulseDoors['s1']).toBe(true);
    expect(t1.result.teleported.blue).toBe(false);
    expect(t1.state.actors.blue.pos).toEqual({ x: 0, y: 0 });
    state = t1.state;
    const t2 = applyCommand(level, state, 'UP');
    expect(t2.result.teleported.blue).toBe(true);
    expect(t2.state.actors.blue.pos).toEqual({ x: 3, y: 0 });
  });

  it('目标为已坍塌脆弱格 → 失败停留（坍塌发生在先前回合）', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 0, y: 4 },
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 4, y: 0 },
        { x: 3, y: 1 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 3, y: 0, end: 'B' },
        { type: 'fragile', x: 3, y: 0 }
      ]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'UP');
    expect(t1.result.teleported.blue).toBe(true);
    expect(t1.state.actors.blue.pos).toEqual({ x: 3, y: 0 });
    expect(t1.state.fragileCollapsed).toHaveLength(0);
    state = t1.state;
    const t2 = applyCommand(level, state, 'UP');
    expect(t2.result.teleported.blue).toBe(true);
    expect(t2.state.actors.blue.pos).toEqual({ x: 0, y: 0 });
    expect(collapsedSet(t2.state)).toEqual(['3,0']);
    state = t2.state;
    const t3 = applyCommand(level, state, 'UP');
    expect(t3.result.teleported.blue).toBe(false);
    expect(t3.state.actors.blue.pos).toEqual({ x: 0, y: 0 });
  });

  it('目标为不匹配专属门 → 该角色失败', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 4 },
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 3, y: 0, end: 'B' },
        { type: 'colorDoor', x: 3, y: 0, color: 'ORANGE' }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(false);
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 0 });
  });

  it('目标为匹配专属门 → 对应角色成功', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 4 },
      orangeStart: { x: 4, y: 4 },
      walls: [
        { x: 3, y: 4 },
        { x: 4, y: 3 }
      ],
      entities: [
        { type: 'portal', portalId: 'q', x: 4, y: 4, end: 'A' },
        { type: 'portal', portalId: 'q', x: 3, y: 0, end: 'B' },
        { type: 'colorDoor', x: 3, y: 0, color: 'ORANGE' }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.orange).toBe(true);
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 0 });
  });

  it('目标格被另一角色占据但其同回合走开（基于传送阶段开始位置判定）→ 成功', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 2, y: 2 },
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 2, y: 2, end: 'B' }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 2 });
    expect(state.actors.orange.pos).toEqual({ x: 2, y: 1 });
  });
});

describe('M6 传送：落点触发动态结算（D3/D4/D5/D6 读传送后位置）', () => {
  const portalTo = (
    extra: ReturnType<typeof makeLevel>['entities']
  ): ReturnType<typeof makeLevel> =>
    makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 4 },
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 2, y: 2, end: 'B' },
        ...extra
      ]
    });

  it('落点压板：同回合开门（D4）', () => {
    const level = portalTo([
      { type: 'plate', id: 'p1', x: 2, y: 2, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 4, y: 2 }
    ]);
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(true);
    expect(state.doors['d1']).toBe(true);
  });

  it('落点切换器：同回合切换映射（D3）', () => {
    const level = portalTo([{ type: 'switcher', x: 2, y: 2, target: 'V_MIRROR' }]);
    const { state } = applyCommand(level, createInitialState(level), 'UP');
    expect(state.mapping).toBe('V_MIRROR');
  });

  it('落点暂停格：传送属于新抵达，授予令牌（D6、ADR-015）', () => {
    const level = portalTo([{ type: 'pauseTile', x: 2, y: 2 }]);
    const { state } = applyCommand(level, createInitialState(level), 'UP');
    expect(state.actors.blue.hasPauseToken).toBe(true);
  });

  it('落点脉冲开关完成配对：同回合闩锁（D5）', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 2, y: 1 },
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 1 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
        { type: 'pulseSwitch', pairId: 's1', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 's1', x: 2, y: 1 },
        { type: 'pulseDoor', pairId: 's1', x: 4, y: 1 }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(state.pulseDoors['s1']).toBe(true);
  });
});

describe('M7 脆弱格：坍塌时机（I12）', () => {
  it('进入不坍塌，离开即坍塌；坍塌后阻挡进入（原因 wall）', () => {
    const level = makeLevel({
      blueStart: { x: 2, y: 2 },
      orangeStart: { x: 1, y: 2 },
      entities: [{ type: 'fragile', x: 2, y: 1 }]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'UP');
    expect(t1.state.fragileCollapsed).toHaveLength(0);
    expect(t1.state.actors.blue.pos).toEqual({ x: 2, y: 1 });
    state = t1.state;
    const t2 = applyCommand(level, state, 'UP');
    expect(collapsedSet(t2.state)).toEqual(['2,1']);
    expect(t2.state.actors.blue.pos).toEqual({ x: 2, y: 0 });
    state = t2.state;
    const t3 = applyCommand(level, state, 'DOWN');
    expect(t3.result.blue.blocked).toBe(true);
    expect(t3.result.blue.reason).toBe('wall');
    expect(t3.state.actors.blue.pos).toEqual({ x: 2, y: 0 });
  });

  it('被阻挡停留不坍塌（GWT-M7-2）', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 1 },
      orangeStart: { x: 4, y: 4 },
      walls: [{ x: 1, y: 0 }],
      entities: [{ type: 'fragile', x: 1, y: 1 }]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.blue.blocked).toBe(true);
    expect(state.fragileCollapsed).toHaveLength(0);
  });

  it('暂停消耗停留不坍塌；令牌来自脆弱格+暂停格同格抵达', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 4, y: 4 },
      entities: [
        { type: 'fragile', x: 1, y: 1 },
        { type: 'pauseTile', x: 1, y: 1 }
      ]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'UP');
    expect(t1.state.actors.blue.hasPauseToken).toBe(true);
    expect(t1.state.fragileCollapsed).toHaveLength(0);
    state = t1.state;
    const t2 = applyCommand(level, state, 'UP');
    expect(t2.result.pauseConsumed.blue).toBe(true);
    expect(t2.result.blue.reason).toBe('pause');
    expect(t2.state.fragileCollapsed).toHaveLength(0);
    state = t2.state;
    const t3 = applyCommand(level, state, 'UP');
    expect(collapsedSet(t3.state)).toEqual(['1,1']);
  });

  it('双角色同回合各自离开各自脆弱格 → 双双坍塌', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 2 },
      entities: [
        { type: 'fragile', x: 1, y: 2 },
        { type: 'fragile', x: 3, y: 2 }
      ]
    });
    const { state } = applyCommand(level, createInitialState(level), 'UP');
    expect(collapsedSet(state)).toEqual(['1,2', '3,2']);
  });

  it('同格取消回合不坍塌（I6）', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 2 },
      entities: [{ type: 'fragile', x: 1, y: 2 }]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'RIGHT');
    expect(result.applied).toBe(false);
    expect(state.fragileCollapsed).toHaveLength(0);
    expect(state.moveCount).toBe(0);
  });

  it('传送离开脆弱格触发坍塌（D1 读 D2 后位置）', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 0, y: 4 },
      walls: [
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 4, y: 0 },
        { x: 3, y: 1 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 3, y: 0, end: 'B' },
        { type: 'fragile', x: 0, y: 0 }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(true);
    expect(collapsedSet(state)).toEqual(['0,0']);
  });
});

describe('M7 脆弱格：坍塌对穿反例（ADR-016）', () => {
  it('对穿交换：离开者的脆弱格被另一角色落上 → 不坍塌；落上者之后离开才坍塌', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 2, y: 2 },
      entities: [{ type: 'fragile', x: 1, y: 2 }]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'RIGHT');
    expect(t1.state.actors.blue.pos).toEqual({ x: 2, y: 2 });
    expect(t1.state.actors.orange.pos).toEqual({ x: 1, y: 2 });
    expect(t1.state.fragileCollapsed).toHaveLength(0);
    state = t1.state;
    const t2 = applyCommand(level, state, 'RIGHT');
    expect(t2.state.actors.orange.pos).toEqual({ x: 0, y: 2 });
    expect(collapsedSet(t2.state)).toEqual(['1,2']);
    for (const s of [t1.state, t2.state]) {
      expect(s.fragileCollapsed.some((c) => equalsPoint(c, s.actors.blue.pos))).toBe(false);
      expect(s.fragileCollapsed.some((c) => equalsPoint(c, s.actors.orange.pos))).toBe(false);
    }
  });

  it('传送落点占据离开者的脆弱格 → 不坍塌；占位者再传送离开后才坍塌', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 0 },
      walls: [
        { x: 3, y: 0 },
        { x: 4, y: 1 }
      ],
      entities: [
        { type: 'portal', portalId: 'q', x: 4, y: 0, end: 'A' },
        { type: 'portal', portalId: 'q', x: 0, y: 0, end: 'B' },
        { type: 'fragile', x: 0, y: 0 }
      ]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'DOWN');
    expect(t1.state.actors.blue.pos).toEqual({ x: 0, y: 1 });
    expect(t1.result.teleported.orange).toBe(true);
    expect(t1.state.actors.orange.pos).toEqual({ x: 0, y: 0 });
    expect(t1.state.fragileCollapsed).toHaveLength(0);
    state = t1.state;
    const t2 = applyCommand(level, state, 'RIGHT');
    expect(t2.state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(t2.result.teleported.orange).toBe(true);
    expect(t2.state.actors.orange.pos).toEqual({ x: 4, y: 0 });
    expect(collapsedSet(t2.state)).toEqual(['0,0']);
  });
});

describe('M7 脆弱格：撤销、重开与存档往返（强制验证）', () => {
  const level = makeLevel({
    blueStart: { x: 1, y: 2 },
    orangeStart: { x: 4, y: 4 },
    entities: [{ type: 'fragile', x: 1, y: 1 }]
  });

  it('撤销逐步恢复坍塌集合（GWT-M7-3、I4）', () => {
    const initial = createInitialState(level);
    let state = applyCommand(level, initial, 'UP').state;
    expect(collapsedSet(state)).toEqual([]);
    state = applyCommand(level, state, 'DOWN').state;
    expect(collapsedSet(state)).toEqual(['1,1']);
    const u1 = undo(state);
    expect(u1.undone).toBe(true);
    expect(u1.state.fragileCollapsed).toHaveLength(0);
    expect(u1.state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    const u2 = undo(u1.state);
    expect(canonicalJSON(u2.state)).toBe(canonicalJSON(initial));
    expect(undo(u2.state).undone).toBe(false);
  });

  it('重开清空坍塌集合（I16）', () => {
    let state = play(level, 'UP', 'DOWN');
    expect(collapsedSet(state)).toEqual(['1,1']);
    state = restart(level);
    expect(state.fragileCollapsed).toHaveLength(0);
    expect(state.moveCount).toBe(0);
  });

  it('序列化往返保留坍塌集合并可继续撤销（I8）', () => {
    const before = play(level, 'UP', 'DOWN');
    const restored = deserialize(serialize(before));
    expect(canonicalJSON(restored)).toBe(canonicalJSON(before));
    expect(collapsedSet(restored)).toEqual(['1,1']);
    const { state, undone } = undo(restored);
    expect(undone).toBe(true);
    expect(state.fragileCollapsed).toHaveLength(0);
  });
});

describe('M8 同步脉冲：同回合与错回合（D5 占用语义、I17 闩锁）', () => {
  it('错回合：先后占据配对开关但从未同时 → 不闩锁', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 4 },
      entities: [
        { type: 'pulseSwitch', pairId: 's1', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 's1', x: 3, y: 1 },
        { type: 'pulseDoor', pairId: 's1', x: 2, y: 1 }
      ]
    });
    let state = createInitialState(level);
    for (const dir of ['UP', 'UP', 'UP', 'DOWN'] as Direction[]) {
      state = applyCommand(level, state, dir).state;
      expect(state.pulseDoors['s1']).toBe(false);
    }
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 2 });
  });

  it('一方驻留（被阻挡）+ 另一方抵达 → 同回合规约成立而闩锁（占用语义）', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 3 },
      walls: [{ x: 1, y: 0 }],
      entities: [
        { type: 'pulseSwitch', pairId: 's1', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 's1', x: 3, y: 1 },
        { type: 'pulseDoor', pairId: 's1', x: 2, y: 2 }
      ]
    });
    let state = createInitialState(level);
    const t1 = applyCommand(level, state, 'UP');
    expect(t1.state.pulseDoors['s1']).toBe(false);
    state = t1.state;
    const t2 = applyCommand(level, state, 'UP');
    expect(t2.result.blue.blocked).toBe(true);
    expect(t2.state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(t2.state.actors.orange.pos).toEqual({ x: 3, y: 1 });
    expect(t2.state.pulseDoors['s1']).toBe(true);
  });

  it('闩锁激活后离开不回退（I17）；仅撤销可还原', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 3 },
      walls: [{ x: 1, y: 0 }],
      entities: [
        { type: 'pulseSwitch', pairId: 's1', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 's1', x: 3, y: 1 },
        { type: 'pulseDoor', pairId: 's1', x: 2, y: 2 }
      ]
    });
    let state = play(level, 'UP', 'UP');
    expect(state.pulseDoors['s1']).toBe(true);
    state = applyCommand(level, state, 'DOWN').state;
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 2 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 2 });
    expect(state.pulseDoors['s1']).toBe(true);
    const fully = undo(undo(undo(state).state).state).state;
    expect(fully.pulseDoors['s1']).toBe(false);
    expect(canonicalJSON(fully)).toBe(canonicalJSON(createInitialState(level)));
    const relatch = play(level, 'UP', 'UP');
    expect(relatch.pulseDoors['s1']).toBe(true);
  });

  it('多配对独立闩锁：触发 a 不影响 b', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 2 },
      entities: [
        { type: 'pulseSwitch', pairId: 'a', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 'a', x: 3, y: 1 },
        { type: 'pulseSwitch', pairId: 'b', x: 0, y: 4 },
        { type: 'pulseSwitch', pairId: 'b', x: 4, y: 4 },
        { type: 'pulseDoor', pairId: 'a', x: 2, y: 0 },
        { type: 'pulseDoor', pairId: 'b', x: 2, y: 4 }
      ]
    });
    const { state } = applyCommand(level, createInitialState(level), 'UP');
    expect(state.pulseDoors['a']).toBe(true);
    expect(state.pulseDoors['b']).toBe(false);
  });
});

describe('M5–M8 综合：快照、哈希与撤销一致性', () => {
  const stressLevel = makeLevel({
    id: 'm5m8-stress',
    grid: { width: 6, height: 6 },
    blueStart: { x: 0, y: 5 },
    orangeStart: { x: 5, y: 5 },
    blueExit: { x: 0, y: 0 },
    orangeExit: { x: 5, y: 0 },
    walls: [{ x: 2, y: 4 }],
    entities: [
      { type: 'portal', portalId: 'pp', x: 0, y: 4, end: 'A' },
      { type: 'portal', portalId: 'pp', x: 5, y: 1, end: 'B' },
      { type: 'fragile', x: 2, y: 3 },
      { type: 'fragile', x: 3, y: 2 },
      { type: 'oneWay', x: 0, y: 3, arrow: 'RIGHT' },
      { type: 'pulseSwitch', pairId: 's1', x: 1, y: 1 },
      { type: 'pulseSwitch', pairId: 's1', x: 4, y: 1 },
      { type: 'pulseDoor', pairId: 's1', x: 2, y: 1 },
      { type: 'plate', id: 'p1', x: 5, y: 4, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 3, y: 5 },
      { type: 'pauseTile', x: 1, y: 4 },
      { type: 'switcher', x: 4, y: 4, target: 'V_MIRROR' }
    ]
  });
  const SEQUENCE: Direction[] = [
    'UP',
    'RIGHT',
    'UP',
    'LEFT',
    'DOWN',
    'RIGHT',
    'UP',
    'LEFT',
    'DOWN',
    'UP'
  ];

  it('多机制随机序列：逐步保持 I1/I2（含不站在坍塌格上），完全撤销后与初始逐字段相等', () => {
    const initial = createInitialState(stressLevel);
    let state = initial;
    for (const dir of SEQUENCE) {
      state = applyCommand(stressLevel, state, dir).state;
      expect(inBounds(stressLevel.grid, state.actors.blue.pos)).toBe(true);
      expect(inBounds(stressLevel.grid, state.actors.orange.pos)).toBe(true);
      expect(state.actors.blue.pos).not.toEqual(state.actors.orange.pos);
      expect(state.fragileCollapsed.some((c) => equalsPoint(c, state.actors.blue.pos))).toBe(false);
      expect(state.fragileCollapsed.some((c) => equalsPoint(c, state.actors.orange.pos))).toBe(
        false
      );
    }
    expect(state.moveCount).toBeGreaterThan(0);
    while (state.history.length > 0) {
      state = undo(state).state;
    }
    expect(canonicalJSON(state)).toBe(canonicalJSON(initial));
  });

  it('stableHash 覆盖坍塌与闩锁字段：动态字段变化即哈希变化', () => {
    const fragileLevel = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 4, y: 4 },
      entities: [{ type: 'fragile', x: 1, y: 1 }]
    });
    const s1 = play(fragileLevel, 'UP');
    const s2 = play(fragileLevel, 'UP', 'DOWN');
    expect(collapsedSet(s2)).toEqual(['1,1']);
    expect(stableHash(s1)).not.toBe(stableHash(s2));

    const pulseLevel = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 2 },
      walls: [{ x: 1, y: 0 }],
      entities: [
        { type: 'pulseSwitch', pairId: 's1', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 's1', x: 3, y: 1 },
        { type: 'pulseDoor', pairId: 's1', x: 2, y: 0 }
      ]
    });
    const latched = play(pulseLevel, 'UP');
    const unlatched = createInitialState(pulseLevel);
    expect(latched.pulseDoors['s1']).toBe(true);
    expect(unlatched.pulseDoors['s1']).toBe(false);
    expect(stableHash(latched)).not.toBe(stableHash(unlatched));
    expect(stableHash(latched)).not.toBe(stableHash(undo(latched).state));
  });

  it('快照深拷贝隔离（I19）：篡改恢复状态不污染 history 中的快照', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 3 },
      walls: [{ x: 1, y: 0 }],
      entities: [
        { type: 'fragile', x: 3, y: 2 },
        { type: 'pulseSwitch', pairId: 's1', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 's1', x: 3, y: 1 }
      ]
    });
    const state = play(level, 'UP', 'UP');
    expect(state.fragileCollapsed.some((c) => equalsPoint(c, { x: 3, y: 2 }))).toBe(true);
    expect(state.pulseDoors['s1']).toBe(true);
    const historyBefore = state.history.map(canonicalJSON);
    const restored = undo(state).state;
    restored.fragileCollapsed.push({ x: 0, y: 0 });
    restored.pulseDoors['s1'] = false;
    expect(state.history.map(canonicalJSON)).toEqual(historyBefore);
    expect(undo(state).state.fragileCollapsed).not.toEqual(restored.fragileCollapsed);
  });

  it('含全部动态字段的序列化往返：可反序列化、可撤销、哈希一致', () => {
    const state = play(stressLevel, ...SEQUENCE);
    const restored = deserialize(serialize(state));
    expect(canonicalJSON(restored)).toBe(canonicalJSON(state));
    expect(stableHash(restored)).toBe(stableHash(state));
    const a = undo(state).state;
    const b = undo(restored).state;
    expect(canonicalJSON(a)).toBe(canonicalJSON(b));
  });
});
