import { describe, expect, it } from 'vitest';
import type { Entity, LevelDef } from '../../../src/domain/types';
import { parseLevel, validateLevelSemantics } from '../../../src/content/validate';

function makeMinimalLevel(
  overrides: Partial<LevelDef> & { entities?: Entity[] } = {}
): LevelDef & { title: string } {
  return {
    schemaVersion: 1,
    id: 'test-level',
    chapter: 1,
    order: 1,
    title: '测试关卡',
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 0 },
    orangeStart: { x: 4, y: 0 },
    blueExit: { x: 0, y: 4 },
    orangeExit: { x: 4, y: 4 },
    initialMapping: 'H_MIRROR',
    walls: [],
    entities: [],
    parMoves: 1,
    hint: { focus: '测试' },
    tags: ['chapter-1', 'M0'],
    ...overrides
  };
}

describe('语义校验 (validateLevelSemantics)', () => {
  it('合法关卡无错误', () => {
    const level = makeMinimalLevel();
    const errors = validateLevelSemantics(level);
    expect(errors).toEqual([]);
  });

  it('door.id 重复报错', () => {
    const level = makeMinimalLevel({
      entities: [
        { type: 'door', id: 'd1', x: 1, y: 1 },
        { type: 'door', id: 'd1', x: 2, y: 2 }
      ]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('door.id 重复'))).toBe(true);
  });

  it('plate.id 重复报错', () => {
    const level = makeMinimalLevel({
      entities: [
        { type: 'door', id: 'd1', x: 1, y: 1 },
        { type: 'plate', id: 'p1', x: 2, y: 2, doorId: 'd1' },
        { type: 'plate', id: 'p1', x: 3, y: 3, doorId: 'd1' }
      ]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('plate.id 重复'))).toBe(true);
  });

  it('plate.doorId 引用不存在的 door 报错', () => {
    const level = makeMinimalLevel({
      entities: [{ type: 'plate', id: 'p1', x: 2, y: 2, doorId: 'nonexistent' }]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('不存在的 doorId'))).toBe(true);
  });

  it('多压板同一 doorId 报错', () => {
    const level = makeMinimalLevel({
      entities: [
        { type: 'door', id: 'd1', x: 1, y: 1 },
        { type: 'plate', id: 'p1', x: 2, y: 2, doorId: 'd1' },
        { type: 'plate', id: 'p2', x: 3, y: 3, doorId: 'd1' }
      ]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('多个压板'))).toBe(true);
  });

  it('portal 不成对（只有一个 A 端）报错', () => {
    const level = makeMinimalLevel({
      entities: [{ type: 'portal', portalId: 'p1', x: 1, y: 1, end: 'A' }]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('portal 不成对'))).toBe(true);
  });

  it('portal 成对（A+B）无错误', () => {
    const level = makeMinimalLevel({
      entities: [
        { type: 'portal', portalId: 'p1', x: 1, y: 1, end: 'A' },
        { type: 'portal', portalId: 'p1', x: 2, y: 2, end: 'B' }
      ]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.filter((e) => e.message.includes('portal 不成对'))).toEqual([]);
  });

  it('同格多个传送入口报错', () => {
    const level = makeMinimalLevel({
      entities: [
        { type: 'portal', portalId: 'p1', x: 1, y: 1, end: 'A' },
        { type: 'portal', portalId: 'p2', x: 1, y: 1, end: 'A' },
        { type: 'portal', portalId: 'p1', x: 2, y: 2, end: 'B' },
        { type: 'portal', portalId: 'p2', x: 2, y: 2, end: 'B' }
      ]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('同格多个传送入口'))).toBe(true);
  });

  it('pulseSwitch 同一 pairId 数量不为 2 报错', () => {
    const level = makeMinimalLevel({
      entities: [
        { type: 'pulseSwitch', pairId: 'p1', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 'p1', x: 2, y: 2 },
        { type: 'pulseSwitch', pairId: 'p1', x: 3, y: 3 }
      ]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('pulseSwitch 数量不为 2'))).toBe(true);
  });

  it('pulseSwitch 数量恰为 2 无错误', () => {
    const level = makeMinimalLevel({
      entities: [
        { type: 'pulseSwitch', pairId: 'p1', x: 1, y: 1 },
        { type: 'pulseSwitch', pairId: 'p1', x: 2, y: 2 }
      ]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.filter((e) => e.message.includes('pulseSwitch'))).toEqual([]);
  });

  it('oneWay 压在出口上报错', () => {
    const level = makeMinimalLevel({
      blueExit: { x: 0, y: 4 },
      entities: [{ type: 'oneWay', x: 0, y: 4, arrow: 'UP' }]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('不可压在出口上'))).toBe(true);
  });

  it('portal 压在出口上报错', () => {
    const level = makeMinimalLevel({
      orangeExit: { x: 4, y: 4 },
      entities: [
        { type: 'portal', portalId: 'p1', x: 4, y: 4, end: 'A' },
        { type: 'portal', portalId: 'p1', x: 1, y: 1, end: 'B' }
      ]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('不可压在出口上'))).toBe(true);
  });

  it('实体与墙重叠报错', () => {
    const level = makeMinimalLevel({
      walls: [{ x: 2, y: 2 }],
      entities: [{ type: 'pauseTile', x: 2, y: 2 }]
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('与墙重叠'))).toBe(true);
  });

  it('tags 缺少章节标签报错', () => {
    const level = makeMinimalLevel({
      chapter: 2,
      tags: ['M0']
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('缺少章节标签'))).toBe(true);
  });

  it('tags 缺少机制标签报错', () => {
    const level = makeMinimalLevel({
      tags: ['chapter-1']
    });
    const errors = validateLevelSemantics(level);
    expect(errors.some((e) => e.message.includes('缺少机制标签'))).toBe(true);
  });
});

describe('parseLevel + validateLevelSemantics 集成', () => {
  function validRaw(): Record<string, unknown> {
    return {
      schemaVersion: 1,
      id: 'test-001',
      chapter: 1,
      order: 1,
      title: '测试',
      grid: { width: 5, height: 5 },
      blueStart: { x: 0, y: 0 },
      orangeStart: { x: 4, y: 0 },
      blueExit: { x: 0, y: 4 },
      orangeExit: { x: 4, y: 4 },
      initialMapping: 'H_MIRROR',
      walls: [],
      entities: [],
      parMoves: 1,
      hint: { focus: '测试' },
      tags: ['chapter-1', 'M0']
    };
  }

  it('合法数据通过解析与语义校验', () => {
    const raw = validRaw();
    const level = parseLevel(raw);
    const errors = validateLevelSemantics(level);
    expect(errors).toEqual([]);
  });

  it('portal 成对且不压出口通过', () => {
    const raw = validRaw();
    raw.entities = [
      { type: 'portal', portalId: 'tp1', x: 1, y: 1, end: 'A' },
      { type: 'portal', portalId: 'tp1', x: 3, y: 3, end: 'B' }
    ];
    const level = parseLevel(raw);
    const errors = validateLevelSemantics(level);
    expect(errors).toEqual([]);
  });
});
