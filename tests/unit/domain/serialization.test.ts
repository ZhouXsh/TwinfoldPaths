import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import { canonicalJSON, deserialize, serialize, stableHash } from '../../../src/domain/serialize';
import type { Direction, GameState } from '../../../src/domain/types';
import { makeLevel } from './helpers';

describe('canonicalJSON 与 stableHash', () => {
  it('对象键顺序不影响规范化输出', () => {
    expect(canonicalJSON({ b: 1, a: 2 })).toBe(canonicalJSON({ a: 2, b: 1 }));
    expect(canonicalJSON({ a: [3, { z: 1, y: 2 }] })).toBe(
      canonicalJSON({ a: [3, { y: 2, z: 1 }] })
    );
  });

  it('stableHash 排除 history（逻辑等价即同哈希）', () => {
    const level = makeLevel();
    const s1 = createInitialState(level);
    const s2 = createInitialState(level);
    s2.history = [];
    expect(stableHash(s1)).toBe(stableHash(s2));
    const moved = applyCommand(level, s1, 'LEFT').state;
    expect(moved.history).toHaveLength(1);
    const stripped: GameState = { ...moved, history: [] };
    expect(stableHash(moved)).toBe(stableHash(stripped));
  });

  it('逻辑状态不同则哈希不同', () => {
    const level = makeLevel();
    const s0 = createInitialState(level);
    const s1 = applyCommand(level, s0, 'LEFT').state;
    expect(stableHash(s0)).not.toBe(stableHash(s1));
  });
});

describe('serialize / deserialize', () => {
  it('往返一致', () => {
    const level = makeLevel();
    let state = createInitialState(level);
    state = applyCommand(level, state, 'LEFT').state;
    state = applyCommand(level, state, 'UP').state;
    const restored = deserialize(serialize(state));
    expect(canonicalJSON(restored)).toBe(canonicalJSON(state));
  });

  it('拒绝非法 JSON 与坏结构', () => {
    expect(() => deserialize('{oops')).toThrow(/不是合法 JSON/);
    expect(() => deserialize('"str"')).toThrow(/结构不是对象/);
    expect(() => deserialize('{"version":99}')).toThrow(/版本不受支持/);
    expect(() => deserialize('{"version":1}')).toThrow(/缺少字段/);
    expect(() => deserialize(JSON.stringify({ version: 1, actors: {} }))).toThrow(/缺少字段/);
    const badActors = JSON.stringify({
      version: 1,
      levelId: 'x',
      status: 'PLAYING',
      moveCount: 0,
      mapping: 'H_MIRROR',
      actors: { blue: {} },
      doors: {},
      pulseDoors: {},
      fragileCollapsed: [],
      history: []
    });
    expect(() => deserialize(badActors)).toThrow(/actors 结构非法/);
  });
});

describe('确定性（强制验证：同一输入序列 100 次哈希一致）', () => {
  const level = makeLevel({
    grid: { width: 6, height: 6 },
    blueStart: { x: 1, y: 3 },
    orangeStart: { x: 4, y: 3 },
    walls: [{ x: 3, y: 3 }],
    entities: [{ type: 'fragile', x: 2, y: 2 }]
  });
  const SEQUENCE: Direction[] = [
    'LEFT',
    'UP',
    'RIGHT',
    'DOWN',
    'LEFT',
    'UP',
    'RIGHT',
    'RIGHT',
    'DOWN',
    'LEFT',
    'UP',
    'DOWN',
    'RIGHT',
    'LEFT',
    'UP',
    'RIGHT'
  ];

  function runSequence(): string {
    let state = createInitialState(level);
    for (const d of SEQUENCE) {
      state = applyCommand(level, state, d).state;
    }
    return stableHash(state);
  }

  it('同一序列执行 100 次，最终哈希全部一致', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      hashes.add(runSequence());
    }
    expect(hashes.size).toBe(1);
  });
});
