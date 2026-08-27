import { describe, expect, it } from 'vitest';
import { computeVisibleCells, fogCellKey, mergeExploredCells } from '../../src/scenes/fog-visibility';

describe('fog visibility', () => {
  it('radius=1 reveals a 3x3 area around one centered actor', () => {
    const visible = computeVisibleCells({
      width: 5,
      height: 5,
      actors: [{ x: 2, y: 2 }],
      radius: 1
    });
    expect(visible.size).toBe(9);
    expect(visible.has(fogCellKey(1, 1))).toBe(true);
    expect(visible.has(fogCellKey(3, 3))).toBe(true);
    expect(visible.has(fogCellKey(0, 0))).toBe(false);
  });

  it('clips the nine-grid at map boundaries', () => {
    const visible = computeVisibleCells({
      width: 4,
      height: 4,
      actors: [{ x: 0, y: 0 }],
      radius: 1
    });
    expect([...visible].sort()).toEqual(['0,0', '0,1', '1,0', '1,1']);
  });

  it('unions both actors visibility and keeps explored cells', () => {
    const explored = new Set<string>();
    const first = computeVisibleCells({
      width: 8,
      height: 8,
      actors: [
        { x: 0, y: 0 },
        { x: 7, y: 7 }
      ],
      radius: 1
    });
    mergeExploredCells(explored, first);
    expect(explored.has('0,0')).toBe(true);
    expect(explored.has('7,7')).toBe(true);

    const second = computeVisibleCells({
      width: 8,
      height: 8,
      actors: [
        { x: 2, y: 2 },
        { x: 5, y: 5 }
      ],
      radius: 1
    });
    mergeExploredCells(explored, second);
    expect(explored.has('0,0')).toBe(true);
    expect(explored.has('2,2')).toBe(true);
    expect(explored.has('5,5')).toBe(true);
  });
});
