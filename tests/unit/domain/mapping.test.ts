import { describe, expect, it } from 'vitest';
import { applyMapping } from '../../../src/domain/mapping';
import type { Direction, MappingMode } from '../../../src/domain/types';

const CASES: Array<[MappingMode, Direction, Direction]> = [
  ['H_MIRROR', 'LEFT', 'RIGHT'],
  ['H_MIRROR', 'RIGHT', 'LEFT'],
  ['H_MIRROR', 'UP', 'UP'],
  ['H_MIRROR', 'DOWN', 'DOWN'],
  ['V_MIRROR', 'UP', 'DOWN'],
  ['V_MIRROR', 'DOWN', 'UP'],
  ['V_MIRROR', 'LEFT', 'LEFT'],
  ['V_MIRROR', 'RIGHT', 'RIGHT'],
  ['ROTATE_CW', 'UP', 'RIGHT'],
  ['ROTATE_CW', 'RIGHT', 'DOWN'],
  ['ROTATE_CW', 'DOWN', 'LEFT'],
  ['ROTATE_CW', 'LEFT', 'UP']
];

describe('方向映射（R-02、M4）', () => {
  it.each(CASES)('applyMapping(%s, %s) === %s', (mode, input, expected) => {
    expect(applyMapping(input, mode)).toBe(expected);
  });

  it('覆盖全部 4 个方向与 3 种映射（完备性）', () => {
    expect(CASES.length).toBe(12);
  });
});
