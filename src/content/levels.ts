import type { LevelRecord } from './validate';
import { parseLevel } from './validate';
import level001 from '../../levels/chapter-01/level-001.json';
import level002 from '../../levels/chapter-01/level-002.json';
import level003 from '../../levels/chapter-01/level-003.json';
import level011 from '../../levels/chapter-02/level-011.json';
import level015 from '../../levels/chapter-02/level-015.json';
import level016 from '../../levels/chapter-02/level-016.json';
import level017 from '../../levels/chapter-02/level-017.json';
import level021 from '../../levels/chapter-03/level-021.json';
import level023 from '../../levels/chapter-03/level-023.json';
import level026 from '../../levels/chapter-03/level-026.json';
import level029 from '../../levels/chapter-03/level-029.json';

const RAW_LEVELS: readonly unknown[] = [
  level001,
  level002,
  level003,
  level011,
  level015,
  level016,
  level017,
  level021,
  level023,
  level026,
  level029
];

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

/** 线性解锁序号（ADR-004）：1 基全局位置；未知关卡返回 -1。 */
export function levelLinearIndex(id: string): number {
  const index = LEVELS.findIndex((level) => level.id === id);
  return index < 0 ? -1 : index + 1;
}

export function nextLevelId(id: string): string | null {
  const index = LEVELS.findIndex((level) => level.id === id);
  if (index < 0) return null;
  return LEVELS[index + 1]?.id ?? null;
}
