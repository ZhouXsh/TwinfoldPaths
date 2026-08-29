import type { LevelRecord } from '../content/validate';
import type { KeyValueStore } from '../persistence/save-store';

export const GAME_DIFFICULTIES = ['easy', 'standard', 'hard'] as const;
export type GameDifficulty = (typeof GAME_DIFFICULTIES)[number];

export const DIFFICULTY_STORAGE_KEY = 'twinfold-paths:difficulty';
export const DEFAULT_DIFFICULTY: GameDifficulty = 'standard';

export const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  easy: '简单',
  standard: '标准',
  hard: '困难'
};

export const DIFFICULTY_DESCRIPTIONS: Record<GameDifficulty, string> = {
  easy: '全地图常亮，不受迷雾限制。',
  standard: '当前九宫格可见，走过与探索过的区域会保持点亮。',
  hard: '只显示当前附近九宫格，离开后的区域重新被迷雾覆盖。'
};

let activeDifficulty: GameDifficulty = DEFAULT_DIFFICULTY;

export function parseDifficulty(value: string | null | undefined): GameDifficulty | null {
  return GAME_DIFFICULTIES.find((difficulty) => difficulty === value) ?? null;
}

export function loadDifficulty(store: KeyValueStore): GameDifficulty {
  return parseDifficulty(store.getItem(DIFFICULTY_STORAGE_KEY)) ?? DEFAULT_DIFFICULTY;
}

export function persistDifficulty(store: KeyValueStore, difficulty: GameDifficulty): void {
  store.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
  activeDifficulty = difficulty;
}

export function setActiveDifficulty(difficulty: GameDifficulty): void {
  activeDifficulty = difficulty;
}

export function getActiveDifficulty(): GameDifficulty {
  return activeDifficulty;
}

/**
 * 只改表现层可见性，不改几何、机关、移动、胜利条件或 BFS 语义。
 * - easy：全图常亮；
 * - standard：固定 3x3 基础视野 + 永久探索记忆；
 * - hard：固定 3x3 基础视野，离开后不保留探索记忆。
 * 关卡已有的雷达脉冲等额外字段继续保留。
 */
export function applyDifficultyToLevel(level: LevelRecord): LevelRecord {
  if (activeDifficulty === 'easy') {
    return {
      ...level,
      tags: level.tags.filter((tag) => tag !== 'V1-fog'),
      visibility: { mode: 'full' }
    };
  }

  return {
    ...level,
    visibility: {
      ...(level.visibility ?? { mode: 'fog' as const }),
      mode: 'fog',
      radius: 1,
      shape: 'square',
      memory: activeDifficulty === 'standard' ? 'persistent' : 'none',
      source: 'both'
    }
  };
}
