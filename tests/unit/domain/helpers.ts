import type { LevelDef } from '../../../src/domain/types';

export function makeLevel(overrides: Partial<LevelDef> = {}): LevelDef {
  return {
    schemaVersion: 1,
    id: 'test-level',
    chapter: 1,
    order: 1,
    grid: { width: 5, height: 5 },
    blueStart: { x: 1, y: 2 },
    orangeStart: { x: 3, y: 2 },
    blueExit: { x: 0, y: 0 },
    orangeExit: { x: 4, y: 0 },
    initialMapping: 'H_MIRROR',
    walls: [],
    entities: [],
    parMoves: 1,
    hint: { focus: 'test' },
    tags: ['test'],
    ...overrides
  };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
