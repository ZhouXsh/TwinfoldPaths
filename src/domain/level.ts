import type { GameState, LevelDef } from './types';

export const STATE_VERSION = 1;

export function createInitialState(level: LevelDef): GameState {
  const doors: Record<string, boolean> = {};
  const pulseDoors: Record<string, boolean> = {};
  for (const entity of level.entities) {
    if (entity.type === 'door') doors[entity.id] = false;
    if (entity.type === 'pulseDoor') pulseDoors[entity.pairId] = false;
  }
  return {
    version: STATE_VERSION,
    levelId: level.id,
    status: 'PLAYING',
    moveCount: 0,
    mapping: level.initialMapping,
    actors: {
      blue: { color: 'BLUE', pos: { ...level.blueStart }, hasPauseToken: false },
      orange: { color: 'ORANGE', pos: { ...level.orangeStart }, hasPauseToken: false }
    },
    doors,
    pulseDoors,
    fragileCollapsed: [],
    history: []
  };
}
