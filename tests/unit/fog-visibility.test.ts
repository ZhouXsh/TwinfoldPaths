import { describe, expect, it } from 'vitest';
import {
  computeFogState,
  computeVisibleCells,
  fogCellKey,
  mergeExploredCells
} from '../../src/scenes/fog-visibility';

describe('fog visibility', () => {
  it('radius=1 + square reveals a 3x3 area around one centered actor', () => {
    const visible = computeVisibleCells({
      width: 5,
      height: 5,
      actors: [{ x: 2, y: 2 }],
      radius: 1,
      shape: 'square'
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

  it('supports diamond and cross vision shapes', () => {
    const diamond = computeVisibleCells({
      width: 7,
      height: 7,
      actors: [{ x: 3, y: 3 }],
      radius: 2,
      shape: 'diamond'
    });
    expect(diamond.has('3,1')).toBe(true);
    expect(diamond.has('1,1')).toBe(false);

    const cross = computeVisibleCells({
      width: 7,
      height: 7,
      actors: [{ x: 3, y: 3 }],
      radius: 2,
      shape: 'cross'
    });
    expect(cross.has('3,1')).toBe(true);
    expect(cross.has('2,2')).toBe(false);
    expect(cross.size).toBe(9);
  });

  it('persistent memory becomes fully visible, while none disables memory and decay stays translucent', () => {
    const frames = [
      { moveCount: 0, blue: { x: 1, y: 1 }, orange: { x: 6, y: 6 } },
      { moveCount: 1, blue: { x: 2, y: 1 }, orange: { x: 5, y: 6 } },
      { moveCount: 5, blue: { x: 5, y: 1 }, orange: { x: 2, y: 6 } }
    ];
    const persistent = computeFogState({
      width: 8,
      height: 8,
      frames,
      rules: { mode: 'fog', radius: 1, memory: 'persistent' }
    });
    expect(persistent.visible.has('0,0')).toBe(true);
    expect(persistent.remembered.has('0,0')).toBe(false);

    const none = computeFogState({
      width: 8,
      height: 8,
      frames,
      rules: { mode: 'fog', radius: 1, memory: 'none' }
    });
    expect(none.visible.has('0,0')).toBe(false);
    expect(none.remembered.size).toBe(0);

    const recentFrames = frames.slice(0, 2);
    const decayRecent = computeFogState({
      width: 8,
      height: 8,
      frames: recentFrames,
      rules: { mode: 'fog', radius: 1, memory: 'decay', memoryTurns: 2 }
    });
    expect(decayRecent.remembered.has('0,0')).toBe(true);
    expect(decayRecent.visible.has('0,0')).toBe(false);

    const decayExpired = computeFogState({
      width: 8,
      height: 8,
      frames,
      rules: { mode: 'fog', radius: 1, memory: 'decay', memoryTurns: 2 }
    });
    expect(decayExpired.remembered.has('0,0')).toBe(false);
  });

  it('alternates the active vision source by move parity', () => {
    const even = computeFogState({
      width: 10,
      height: 10,
      frames: [{ moveCount: 2, blue: { x: 1, y: 1 }, orange: { x: 8, y: 8 } }],
      rules: { mode: 'fog', radius: 1, source: 'alternating', memory: 'none' }
    });
    expect(even.visible.has('1,1')).toBe(true);
    expect(even.visible.has('8,8')).toBe(false);

    const odd = computeFogState({
      width: 10,
      height: 10,
      frames: [{ moveCount: 3, blue: { x: 1, y: 1 }, orange: { x: 8, y: 8 } }],
      rules: { mode: 'fog', radius: 1, source: 'alternating', memory: 'none' }
    });
    expect(odd.visible.has('1,1')).toBe(false);
    expect(odd.visible.has('8,8')).toBe(true);
  });

  it('radar pulse temporarily expands vision', () => {
    const fog = computeFogState({
      width: 9,
      height: 9,
      frames: [{ moveCount: 5, blue: { x: 1, y: 1 }, orange: { x: 7, y: 7 } }],
      rules: {
        mode: 'fog',
        radius: 1,
        memory: 'none',
        pulseEvery: 5,
        pulseRadius: 12
      }
    });
    expect(fog.pulseActive).toBe(true);
    expect(fog.visible.size).toBe(81);
  });

  it('activated beacon permanently contributes a reveal area', () => {
    const fog = computeFogState({
      width: 9,
      height: 9,
      frames: [
        { moveCount: 0, blue: { x: 1, y: 1 }, orange: { x: 7, y: 7 } },
        { moveCount: 1, blue: { x: 3, y: 3 }, orange: { x: 5, y: 7 } },
        { moveCount: 4, blue: { x: 6, y: 3 }, orange: { x: 2, y: 7 } }
      ],
      rules: { mode: 'fog', radius: 1, memory: 'none' },
      beacons: [{ x: 3, y: 3, radius: 2 }]
    });
    expect(fog.activatedBeacons.has('3,3')).toBe(true);
    expect(fog.visible.has('1,1')).toBe(true);
  });

  it('legacy mergeExploredCells helper still unions visible cells', () => {
    const explored = new Set<string>();
    mergeExploredCells(explored, new Set(['0,0', '1,1']));
    mergeExploredCells(explored, new Set(['1,1', '2,2']));
    expect([...explored].sort()).toEqual(['0,0', '1,1', '2,2']);
  });
});
