import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import { makeLevel } from './helpers';

describe('M6 传送（结算规范 §3）', () => {
  it('GWT-M6-1 回合末传送到配对端', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 1, y: 4 },
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 4, y: 4, end: 'B' }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 4, y: 4 });
    expect(result.teleported.orange).toBe(false);
  });

  it('GWT-M6-2 目标格被传送失败的角色占据 → 失败停留（§3-b/精化）', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 4 },
      walls: [{ x: 4, y: 3 }],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'r', x: 4, y: 4, end: 'A' },
        { type: 'portal', portalId: 'p', x: 4, y: 4, end: 'B' }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(false);
    expect(result.teleported.orange).toBe(false);
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 4, y: 4 });
  });

  it('GWT-M6-3 双角色互传：同时交换（§3-c）', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 0 },
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 4, y: 0, end: 'B' }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(true);
    expect(result.teleported.orange).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 4, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 0, y: 0 });
  });

  it('GWT-M6-4 落点为另一传送入口：不二次传送（I5）', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 1, y: 4 },
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 2, y: 2, end: 'B' },
        { type: 'portal', portalId: 'q', x: 2, y: 2, end: 'A' },
        { type: 'portal', portalId: 'q', x: 4, y: 4, end: 'B' }
      ]
    });
    const { state } = applyCommand(level, createInitialState(level), 'UP');
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 2 });
  });

  it('§3-d 双角色传送目标为同一格 → 双方失败', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 2, y: 0 },
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 4, y: 4, end: 'B' },
        { type: 'portal', portalId: 'q', x: 2, y: 0, end: 'A' },
        { type: 'portal', portalId: 'q', x: 4, y: 4, end: 'B' }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(false);
    expect(result.teleported.orange).toBe(false);
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 2, y: 0 });
  });

  it('精化分支：橙传送失败时，蓝的目标（橙的占位格）也失败', () => {
    const level = makeLevel({
      grid: { width: 6, height: 6 },
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 5, y: 0 },
      walls: [{ x: 5, y: 5 }],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'q', x: 5, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 5, y: 0, end: 'B' },
        { type: 'portal', portalId: 'q', x: 5, y: 5, end: 'B' }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(false);
    expect(result.teleported.orange).toBe(false);
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 5, y: 0 });
  });

  it('精化分支（对称）：蓝传送失败时，橙的目标（蓝的占位格）也失败', () => {
    const level = makeLevel({
      grid: { width: 6, height: 6 },
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 5, y: 0 },
      walls: [{ x: 0, y: 5 }],
      entities: [
        { type: 'portal', portalId: 'p', x: 0, y: 0, end: 'A' },
        { type: 'portal', portalId: 'q', x: 5, y: 0, end: 'A' },
        { type: 'portal', portalId: 'p', x: 0, y: 5, end: 'B' },
        { type: 'portal', portalId: 'q', x: 0, y: 0, end: 'B' }
      ]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.teleported.blue).toBe(false);
    expect(result.teleported.orange).toBe(false);
    expect(state.actors.blue.pos).toEqual({ x: 0, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 5, y: 0 });
  });
});

describe('P4 阻挡谓词分支（M1/M2/M5/M8 的阻挡面）', () => {
  it('关闭的门阻挡，踩板开启后可通过（M1 阻挡面）', () => {
    const level = makeLevel({
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 4 },
      entities: [
        { type: 'plate', id: 'p1', x: 1, y: 0, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 2, y: 0 }
      ]
    });
    let state = createInitialState(level);
    const first = applyCommand(level, state, 'RIGHT');
    expect(first.result.blue.blocked).toBe(false);
    expect(first.state.actors.blue.pos).toEqual({ x: 1, y: 0 });
    expect(first.state.doors['d1']).toBe(true);
    state = applyCommand(level, first.state, 'RIGHT').state;
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 0 });
  });

  it('离板回合末关门（M1 时序）', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 4, y: 4 },
      entities: [
        { type: 'plate', id: 'p1', x: 1, y: 0, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 3, y: 2 }
      ]
    });
    let state = createInitialState(level);
    state = applyCommand(level, state, 'DOWN').state;
    expect(state.doors['d1']).toBe(false);
  });

  it('M2 专属门：颜色不匹配阻挡，匹配通过', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 3, y: 0 },
      entities: [{ type: 'colorDoor', x: 2, y: 0, color: 'ORANGE' }]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'RIGHT');
    expect(result.blue.blocked).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 2, y: 0 });
  });

  it('M5 单向格：逆箭头离开被阻，顺箭头离开与任意方向进入不受限', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 0 },
      orangeStart: { x: 4, y: 4 },
      entities: [{ type: 'oneWay', x: 1, y: 0, arrow: 'RIGHT' }]
    });
    let state = createInitialState(level);
    const blocked = applyCommand(level, state, 'LEFT');
    expect(blocked.result.blue.blocked).toBe(true);
    expect(blocked.state.actors.blue.pos).toEqual({ x: 1, y: 0 });
    state = applyCommand(level, blocked.state, 'RIGHT').state;
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 0 });
  });

  it('M5 进入单向格不受箭头限制', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 1 },
      orangeStart: { x: 4, y: 4 },
      entities: [{ type: 'oneWay', x: 1, y: 0, arrow: 'RIGHT' }]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'UP');
    expect(result.blue.blocked).toBe(false);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 0 });
  });

  it('M8 未激活脉冲门阻挡', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 1 },
      orangeStart: { x: 4, y: 4 },
      entities: [{ type: 'pulseDoor', pairId: 's1', x: 2, y: 1 }]
    });
    const { state, result } = applyCommand(level, createInitialState(level), 'RIGHT');
    expect(result.blue.blocked).toBe(true);
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(state.pulseDoors['s1']).toBe(false);
  });

  it('M8 同回合配对触发闩锁，之后脉冲门可通过', () => {
    const level = makeLevel({
      blueStart: { x: 1, y: 2 },
      orangeStart: { x: 3, y: 2 },
      walls: [{ x: 3, y: 0 }],
      entities: [
        { type: 'pulseSwitch', pairId: 's1', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 's1', x: 3, y: 1 },
        { type: 'pulseDoor', pairId: 's1', x: 2, y: 1 }
      ]
    });
    let state = createInitialState(level);
    state = applyCommand(level, state, 'UP').state;
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 1 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 1 });
    expect(state.pulseDoors['s1']).toBe(true);
    state = applyCommand(level, state, 'UP').state;
    expect(state.actors.blue.pos).toEqual({ x: 1, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 3, y: 1 });
    state = applyCommand(level, state, 'RIGHT').state;
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 0 });
    expect(state.actors.orange.pos).toEqual({ x: 2, y: 1 });
    state = applyCommand(level, state, 'DOWN').state;
    expect(state.actors.blue.pos).toEqual({ x: 2, y: 1 });
    expect(state.actors.orange.pos).toEqual({ x: 2, y: 2 });
  });
});
