import type { Direction, MappingMode } from './types';

const H_MIRROR: Record<Direction, Direction> = {
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
  UP: 'UP',
  DOWN: 'DOWN'
};

const V_MIRROR: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT'
};

const ROTATE_CW: Record<Direction, Direction> = {
  UP: 'RIGHT',
  RIGHT: 'DOWN',
  DOWN: 'LEFT',
  LEFT: 'UP'
};

export function applyMapping(d: Direction, mode: MappingMode): Direction {
  switch (mode) {
    case 'H_MIRROR':
      return H_MIRROR[d];
    case 'V_MIRROR':
      return V_MIRROR[d];
    case 'ROTATE_CW':
      return ROTATE_CW[d];
  }
}
