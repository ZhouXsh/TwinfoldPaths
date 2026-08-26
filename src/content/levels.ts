import type { LevelRecord } from './validate';
import { parseLevel } from './validate';
import level001 from '../../levels/chapter-01/level-001.json';
import level002 from '../../levels/chapter-01/level-002.json';
import level003 from '../../levels/chapter-01/level-003.json';
import level004 from '../../levels/chapter-01/level-004.json';
import level005 from '../../levels/chapter-01/level-005.json';
import level006 from '../../levels/chapter-01/level-006.json';
import level007 from '../../levels/chapter-01/level-007.json';
import level008 from '../../levels/chapter-01/level-008.json';
import level009 from '../../levels/chapter-01/level-009.json';
import level010 from '../../levels/chapter-01/level-010.json';
import level011 from '../../levels/chapter-02/level-011.json';
import level012 from '../../levels/chapter-02/level-012.json';
import level013 from '../../levels/chapter-02/level-013.json';
import level014 from '../../levels/chapter-02/level-014.json';
import level015 from '../../levels/chapter-02/level-015.json';
import level016 from '../../levels/chapter-02/level-016.json';
import level017 from '../../levels/chapter-02/level-017.json';
import level018 from '../../levels/chapter-02/level-018.json';
import level019 from '../../levels/chapter-02/level-019.json';
import level020 from '../../levels/chapter-02/level-020.json';
import level021 from '../../levels/chapter-03/level-021.json';
import level022 from '../../levels/chapter-03/level-022.json';
import level023 from '../../levels/chapter-03/level-023.json';
import level024 from '../../levels/chapter-03/level-024.json';
import level025 from '../../levels/chapter-03/level-025.json';
import level026 from '../../levels/chapter-03/level-026.json';
import level027 from '../../levels/chapter-03/level-027.json';
import level028 from '../../levels/chapter-03/level-028.json';
import level029 from '../../levels/chapter-03/level-029.json';
import level030 from '../../levels/chapter-03/level-030.json';
import level031 from '../../levels/chapter-04/level-031.json';
import level032 from '../../levels/chapter-04/level-032.json';
import level033 from '../../levels/chapter-04/level-033.json';
import level034 from '../../levels/chapter-04/level-034.json';
import level035 from '../../levels/chapter-04/level-035.json';
import level036 from '../../levels/chapter-04/level-036.json';
import level037 from '../../levels/chapter-04/level-037.json';
import level038 from '../../levels/chapter-04/level-038.json';
import level039 from '../../levels/chapter-04/level-039.json';
import level040 from '../../levels/chapter-04/level-040.json';
import level041 from '../../levels/chapter-05/level-041.json';
import level042 from '../../levels/chapter-05/level-042.json';
import level043 from '../../levels/chapter-05/level-043.json';
import level044 from '../../levels/chapter-05/level-044.json';
import level045 from '../../levels/chapter-05/level-045.json';
import level046 from '../../levels/chapter-05/level-046.json';
import level047 from '../../levels/chapter-05/level-047.json';
import level048 from '../../levels/chapter-05/level-048.json';
import level049 from '../../levels/chapter-05/level-049.json';
import level050 from '../../levels/chapter-05/level-050.json';

const RAW_LEVELS: readonly unknown[] = [
  level001,
  level002,
  level003,
  level004,
  level005,
  level006,
  level007,
  level008,
  level009,
  level010,
  level011,
  level012,
  level013,
  level014,
  level015,
  level016,
  level017,
  level018,
  level019,
  level020,
  level021,
  level022,
  level023,
  level024,
  level025,
  level026,
  level027,
  level028,
  level029,
  level030,
  level031,
  level032,
  level033,
  level034,
  level035,
  level036,
  level037,
  level038,
  level039,
  level040,
  level041,
  level042,
  level043,
  level044,
  level045,
  level046,
  level047,
  level048,
  level049,
  level050
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
