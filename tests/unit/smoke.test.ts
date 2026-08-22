import { describe, expect, it } from 'vitest';
import { DIRECTIONS } from '../../src/domain/types';

describe('工程基线冒烟', () => {
  it('Direction 域恰为四个正交方向（R-01 输入域）', () => {
    expect(DIRECTIONS).toEqual(['UP', 'DOWN', 'LEFT', 'RIGHT']);
  });

  it('方向集合无重复', () => {
    expect(new Set(DIRECTIONS).size).toBe(DIRECTIONS.length);
  });
});
