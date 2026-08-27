import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import { bfsSolve } from '../../../tools/solver/bfs-solver';
import type { LevelDef } from '../../../src/domain/types';

function levelWithPhase(phase: 'ODD' | 'EVEN'): LevelDef {
  return {
    schemaVersion: 1,
    id: `phase-${phase.toLowerCase()}`,
    chapter: 5,
    order: 41,
    grid: { width: 7, height: 3 },
    blueStart: { x: 1, y: 1 },
    orangeStart: { x: 5, y: 1 },
    blueExit: { x: 3, y: 0 },
    orangeExit: { x: 3, y: 2 },
    initialMapping: 'H_MIRROR',
    walls: [],
    entities: [
      { type: 'phaseDoor', phase, x: 2, y: 1 },
      { type: 'phaseDoor', phase, x: 4, y: 1 }
    ],
    parMoves: 3,
    parMovesNote: 'test',
    hint: { focus: 'test' },
    tags: ['chapter-5', 'M9']
  };
}

describe('M9 phase door', () => {
  it('ODD gate is passable on the first applied turn', () => {
    const level = levelWithPhase('ODD');
    const state = createInitialState(level);
    const { state: next, result } = applyCommand(level, state, 'RIGHT');
    expect(result.blue.blocked).toBe(false);
    expect(result.orange.blocked).toBe(false);
    expect(next.actors.blue.pos).toEqual({ x: 2, y: 1 });
    expect(next.actors.orange.pos).toEqual({ x: 4, y: 1 });
    expect(next.moveCount).toBe(1);
  });

  it('EVEN gate blocks first entry but the blocked turn advances parity', () => {
    const level = levelWithPhase('EVEN');
    const state = createInitialState(level);
    const first = applyCommand(level, state, 'RIGHT');
    expect(first.result.blue.reason).toBe('phaseDoor');
    expect(first.result.orange.reason).toBe('phaseDoor');
    expect(first.state.moveCount).toBe(1);
    expect(first.state.actors.blue.pos).toEqual({ x: 1, y: 1 });

    const second = applyCommand(level, first.state, 'RIGHT');
    expect(second.result.blue.blocked).toBe(false);
    expect(second.result.orange.blocked).toBe(false);
    expect(second.state.actors.blue.pos).toEqual({ x: 2, y: 1 });
    expect(second.state.moveCount).toBe(2);
  });

  it('BFS distinguishes identical geometry at different turn parity', () => {
    const level = levelWithPhase('EVEN');
    const result = bfsSolve(level, { maxNodes: 10000, maxDepth: 20 });
    expect(result.budgetExhausted).toBe(false);
    expect(result.statesVisited).toBeGreaterThan(1);
  });
});
