import { describe, expect, it } from 'vitest';
import type { Entity } from '../../../src/domain/types';
import {
  createDefaultState,
  buildLevelJSON,
  exportLevelText,
  importLevelText,
  validateState,
  solveState
} from '../../../tools/level-editor/level-io';

/**
 * 编辑器纯函数测试：测试 level-io.ts 的导出→导入往返等价、校验联动、求解联动。
 */
describe('编辑器 level-io 纯函数', () => {
  it('空实体关卡导出→导入往返等价', () => {
    const state = createDefaultState();
    state.levelId = 'test-001';
    state.chapter = 1;
    state.order = 1;
    state.title = '测试关卡';
    state.grid = { width: 5, height: 5 };
    state.blueStart = { x: 0, y: 0 };
    state.orangeStart = { x: 4, y: 0 };
    state.blueExit = { x: 0, y: 4 };
    state.orangeExit = { x: 4, y: 4 };
    state.initialMapping = 'H_MIRROR';
    state.walls = [{ x: 2, y: 2 }];
    state.entities = [];
    state.parMoves = 3;
    state.hint = { focus: '测试' };
    state.tags = ['chapter-1', 'M0'];

    const text = exportLevelText(state);
    const result = importLevelText(text);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const reloaded = result.state;
    expect(reloaded.levelId).toBe('test-001');
    expect(reloaded.chapter).toBe(1);
    expect(reloaded.grid.width).toBe(5);
    expect(reloaded.blueStart).toEqual({ x: 0, y: 0 });
    expect(reloaded.orangeStart).toEqual({ x: 4, y: 0 });
    expect(reloaded.blueExit).toEqual({ x: 0, y: 4 });
    expect(reloaded.orangeExit).toEqual({ x: 4, y: 4 });
    expect(reloaded.initialMapping).toBe('H_MIRROR');
    expect(reloaded.walls).toEqual([{ x: 2, y: 2 }]);
    expect(reloaded.entities).toEqual([]);
    expect(reloaded.parMoves).toBe(3);
    expect(reloaded.tags).toEqual(['chapter-1', 'M0']);
  });

  it('全实体类型导出→导入往返等价', () => {
    const state = createDefaultState();
    state.levelId = 'test-all-entities';
    state.grid = { width: 8, height: 8 };
    state.blueStart = { x: 0, y: 0 };
    state.orangeStart = { x: 7, y: 0 };
    state.blueExit = { x: 0, y: 7 };
    state.orangeExit = { x: 7, y: 7 };
    state.entities = [
      { type: 'door', id: 'd1', x: 1, y: 1 },
      { type: 'plate', id: 'p1', x: 2, y: 2, doorId: 'd1' },
      { type: 'colorDoor', x: 3, y: 3, color: 'BLUE' },
      { type: 'pauseTile', x: 4, y: 4 },
      { type: 'switcher', x: 5, y: 5, target: 'V_MIRROR' },
      { type: 'oneWay', x: 6, y: 6, arrow: 'UP' },
      { type: 'portal', portalId: 'tp1', x: 0, y: 1, end: 'A' },
      { type: 'portal', portalId: 'tp1', x: 1, y: 0, end: 'B' },
      { type: 'fragile', x: 2, y: 3 },
      { type: 'pulseSwitch', pairId: 'pp1', x: 3, y: 2 },
      { type: 'pulseSwitch', pairId: 'pp1', x: 4, y: 5 },
      { type: 'pulseDoor', pairId: 'pp1', x: 5, y: 4 }
    ];
    state.tags = ['chapter-1', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'];

    const text = exportLevelText(state);
    const result = importLevelText(text);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const reloaded = result.state;
    expect(reloaded.entities.length).toBe(state.entities.length);
    for (let i = 0; i < state.entities.length; i++) {
      const orig = state.entities[i] as Entity;
      const rel = reloaded.entities[i] as Entity;
      expect(rel.type).toBe(orig.type);
      expect(rel.x).toBe(orig.x);
      expect(rel.y).toBe(orig.y);
      if (orig.type === 'door') {
        expect((rel as Extract<Entity, { type: 'door' }>).id).toBe(orig.id);
      }
      if (orig.type === 'plate') {
        expect((rel as Extract<Entity, { type: 'plate' }>).id).toBe(orig.id);
        expect((rel as Extract<Entity, { type: 'plate' }>).doorId).toBe(orig.doorId);
      }
      if (orig.type === 'portal') {
        expect((rel as Extract<Entity, { type: 'portal' }>).portalId).toBe(orig.portalId);
        expect((rel as Extract<Entity, { type: 'portal' }>).end).toBe(orig.end);
      }
    }
  });

  it('导入后语义校验联动', () => {
    const state = createDefaultState();
    state.entities = [
      { type: 'door', id: 'd1', x: 1, y: 1 },
      { type: 'plate', id: 'p1', x: 2, y: 2, doorId: 'd1' }
    ];
    state.tags = ['chapter-1', 'M1'];

    const text = exportLevelText(state);
    const result = importLevelText(text);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.semanticErrors).toEqual([]);
  });

  it('导入坏文本拒绝且不抛未捕获异常', () => {
    const badTexts = [
      'not json',
      '{"schemaVersion": 1}',
      '{"schemaVersion": 1, "id": "", "chapter": 1, "order": 1, "title": "x", "grid": {"width": 5, "height": 5}, "blueStart": {"x": 0, "y": 0}, "orangeStart": {"x": 4, "y": 0}, "blueExit": {"x": 0, "y": 4}, "orangeExit": {"x": 4, "y": 4}, "initialMapping": "H_MIRROR", "walls": [], "entities": [], "parMoves": 1, "hint": {"focus": "x"}, "tags": ["chapter-1", "M0"]}'
    ];
    for (const text of badTexts) {
      const result = importLevelText(text);
      expect(result.success).toBe(false);
    }
  });

  it('validateState 对合法关卡返回 valid=true', () => {
    const state = createDefaultState();
    const result = validateState(state);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('solveState 对合法关卡返回求解结果', () => {
    const state = createDefaultState();
    state.grid = { width: 2, height: 2 };
    state.blueStart = { x: 0, y: 0 };
    state.orangeStart = { x: 1, y: 0 };
    state.blueExit = { x: 0, y: 1 };
    state.orangeExit = { x: 1, y: 1 };
    const result = solveState(state);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.solvable).toBe(true);
    }
  });

  it('buildLevelJSON 产生正确的 JSON 结构', () => {
    const state = createDefaultState();
    const json = buildLevelJSON(state);
    expect(json.schemaVersion).toBe(1);
    expect(json.id).toBe('custom-001');
    expect(json.grid).toEqual({ width: 5, height: 5 });
    expect(json.blueStart).toEqual({ x: 0, y: 0 });
    expect(json.orangeStart).toEqual({ x: 4, y: 0 });
    expect(json.blueExit).toEqual({ x: 0, y: 4 });
    expect(json.orangeExit).toEqual({ x: 4, y: 4 });
    expect(json.initialMapping).toBe('H_MIRROR');
    expect(json.walls).toEqual([]);
    expect(json.entities).toEqual([]);
    expect(json.parMoves).toBe(1);
    expect(json.hint).toEqual({ focus: '编辑器默认关卡' });
    expect(json.tags).toEqual(['chapter-1', 'M0']);
  });
});
