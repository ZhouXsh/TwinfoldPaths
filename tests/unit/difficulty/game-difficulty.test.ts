import { afterEach, describe, expect, it } from 'vitest';
import { LEVELS, getLevelById } from '../../../src/content/levels';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_STORAGE_KEY,
  applyDifficultyToLevel,
  getActiveDifficulty,
  loadDifficulty,
  persistDifficulty,
  setActiveDifficulty,
  type GameDifficulty
} from '../../../src/difficulty/game-difficulty';
import type { KeyValueStore } from '../../../src/persistence/save-store';

function mapStore(initial?: Record<string, string>): KeyValueStore {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    }
  };
}

afterEach(() => setActiveDifficulty(DEFAULT_DIFFICULTY));

describe('主界面探索难度', () => {
  it('默认标准难度，非法存储值安全回退', () => {
    expect(loadDifficulty(mapStore())).toBe('standard');
    expect(loadDifficulty(mapStore({ [DIFFICULTY_STORAGE_KEY]: 'unknown' }))).toBe('standard');
  });

  it('选择难度后持久化，并立即更新当前游玩难度', () => {
    const store = mapStore();
    persistDifficulty(store, 'hard');
    expect(store.getItem(DIFFICULTY_STORAGE_KEY)).toBe('hard');
    expect(loadDifficulty(store)).toBe('hard');
    expect(getActiveDifficulty()).toBe('hard');
  });

  it('简单难度让地图全亮，但不修改原始关卡数据', () => {
    const source = LEVELS[30]!;
    expect(source.visibility?.mode).toBe('fog');
    expect(source.tags).toContain('V1-fog');

    setActiveDifficulty('easy');
    const playable = applyDifficultyToLevel(source);
    expect(playable.visibility).toEqual({ mode: 'full' });
    expect(playable.tags).not.toContain('V1-fog');
    expect(source.visibility?.mode).toBe('fog');
    expect(source.tags).toContain('V1-fog');
  });

  it('标准难度固定九宫格并永久记忆探索路径', () => {
    const source = LEVELS.find(
      (level) => level.visibility?.memory === 'none' || level.visibility?.source === 'alternating'
    );
    expect(source).toBeDefined();

    setActiveDifficulty('standard');
    const playable = applyDifficultyToLevel(source!);
    expect(playable.visibility?.mode).toBe('fog');
    expect(playable.visibility?.radius).toBe(1);
    expect(playable.visibility?.shape).toBe('square');
    expect(playable.visibility?.memory).toBe('persistent');
    expect(playable.visibility?.source).toBe('both');
  });

  it('困难难度只保留当前九宫格，不保留离开后的探索记忆', () => {
    const source = LEVELS.find((level) => level.visibility?.memory === 'persistent');
    expect(source).toBeDefined();

    setActiveDifficulty('hard');
    const playable = applyDifficultyToLevel(source!);
    expect(playable.visibility?.mode).toBe('fog');
    expect(playable.visibility?.radius).toBe(1);
    expect(playable.visibility?.shape).toBe('square');
    expect(playable.visibility?.memory).toBe('none');
    expect(playable.visibility?.source).toBe('both');
    expect(source!.visibility?.memory).toBe('persistent');
  });

  it.each<GameDifficulty>(['easy', 'standard', 'hard'])(
    'getLevelById 会按当前 %s 难度返回游玩视图',
    (difficulty) => {
      setActiveDifficulty(difficulty);
      const playable = getLevelById('level-031');
      expect(playable).toBeDefined();
      if (difficulty === 'easy') {
        expect(playable?.visibility?.mode).toBe('full');
      } else if (difficulty === 'standard') {
        expect(playable?.visibility?.memory).toBe('persistent');
      } else {
        expect(playable?.visibility?.memory).toBe('none');
      }
    }
  );
});
