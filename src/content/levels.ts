import type { LevelRecord } from './validate';
import { parseLevel } from './validate';
import level001 from '../../levels/chapter-01/level-001.json';
import level002 from '../../levels/chapter-01/level-002.json';
import level003 from '../../levels/chapter-01/level-003.json';

const RAW_LEVELS: readonly unknown[] = [level001, level002, level003];

export const LEVELS: readonly LevelRecord[] = (() => {
  const parsed = RAW_LEVELS.map((raw) => parseLevel(raw));
  const seen = new Set<string>();
  for (const level of parsed) {
    if (seen.has(level.id)) throw new Error(`关卡 ID 重复: ${level.id}`);
    seen.add(level.id);
  }
  return parsed.slice().sort((a, b) => a.chapter - b.chapter || a.order - b.order);
})();

export const FIRST_LEVEL_ID = LEVELS[0]?.id ?? 'level-001';

export function getLevelById(id: string): LevelRecord | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function getLevelByOrder(chapter: number, order: number): LevelRecord | undefined {
  return LEVELS.find((level) => level.chapter === chapter && level.order === order);
}

export function nextLevelId(id: string): string | null {
  const index = LEVELS.findIndex((level) => level.id === id);
  if (index < 0) return null;
  return LEVELS[index + 1]?.id ?? null;
}
