import { describe, expect, it } from 'vitest';
import { InputGate } from '../../../src/input/gate';

describe('输入门：动画期间锁输入（阶段06 决策：锁而非排队）', () => {
  it('初始可接受输入', () => {
    const gate = new InputGate();
    expect(gate.canAccept(0)).toBe(true);
  });

  it('锁定期间拒绝、到期后接受', () => {
    const gate = new InputGate();
    gate.lock(0, 180);
    expect(gate.canAccept(0)).toBe(false);
    expect(gate.canAccept(179)).toBe(false);
    expect(gate.canAccept(180)).toBe(true);
  });

  it('重叠锁定取最晚解锁时间', () => {
    const gate = new InputGate();
    gate.lock(0, 180);
    gate.lock(100, 180);
    expect(gate.canAccept(200)).toBe(false);
    expect(gate.canAccept(280)).toBe(true);
  });

  it('reset 立即解锁（撤销/重开后即刻可操作）', () => {
    const gate = new InputGate();
    gate.lock(0, 180);
    gate.reset();
    expect(gate.canAccept(0)).toBe(true);
  });
});
