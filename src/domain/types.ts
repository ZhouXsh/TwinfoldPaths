export const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;

export type Direction = (typeof DIRECTIONS)[number];

export interface Point {
  x: number;
  y: number;
}

export type MappingMode = 'H_MIRROR' | 'V_MIRROR' | 'ROTATE_CW';

export type ActorColor = 'BLUE' | 'ORANGE';

export type GameStatus = 'PLAYING' | 'WON';
