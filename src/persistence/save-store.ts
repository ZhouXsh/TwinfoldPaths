/**
 * 本地存档（ADR-001 双槽）：主槽 + 备份槽各写一份；读取时主槽优先，
 * 任一槽损坏回退另一槽，双槽损坏回退默认值。不做静默修复。
 */

export interface SaveData {
  version: number;
  /** 已解锁的最高线性序号（ADR-004：通关第 N 关解锁第 N+1 关；N 为全局排序位置），初始为 1。 */
  highestUnlocked: number;
  /** levelId -> 最佳步数。 */
  bestMoves: Record<string, number>;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SAVE_KEY_PRIMARY = 'twinfold-paths:save:a';
export const SAVE_KEY_BACKUP = 'twinfold-paths:save:b';
/** 版本 2（阶段 07）：highestUnlocked 由"章内 order"改为"全局线性序号"，旧存档按损坏处理回退默认值。 */
export const SAVE_VERSION = 2;

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, highestUnlocked: 1, bestMoves: {} };
}

export function parseSave(text: string | null | undefined): SaveData | null {
  if (typeof text !== 'string' || text.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== SAVE_VERSION) return null;
  if (
    typeof obj.highestUnlocked !== 'number' ||
    !Number.isInteger(obj.highestUnlocked) ||
    obj.highestUnlocked < 1
  ) {
    return null;
  }
  if (obj.bestMoves === null || typeof obj.bestMoves !== 'object' || Array.isArray(obj.bestMoves)) {
    return null;
  }
  const bestMoves: Record<string, number> = {};
  for (const [levelId, value] of Object.entries(obj.bestMoves as Record<string, unknown>)) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null;
    bestMoves[levelId] = value;
  }
  return { version: SAVE_VERSION, highestUnlocked: obj.highestUnlocked, bestMoves };
}

export function loadSave(store: KeyValueStore): SaveData {
  return (
    parseSave(store.getItem(SAVE_KEY_PRIMARY)) ??
    parseSave(store.getItem(SAVE_KEY_BACKUP)) ??
    defaultSave()
  );
}

export function persistSave(store: KeyValueStore, data: SaveData): void {
  const text = JSON.stringify(data);
  store.setItem(SAVE_KEY_PRIMARY, text);
  store.setItem(SAVE_KEY_BACKUP, text);
}

/** 通关结算：推进解锁、刷新最佳步数；返回新存档（不修改入参）。 */
export function recordWin(
  save: SaveData,
  levelId: string,
  linearIndex: number,
  moves: number
): SaveData {
  const best = save.bestMoves[levelId];
  return {
    version: SAVE_VERSION,
    highestUnlocked: Math.max(save.highestUnlocked, linearIndex + 1),
    bestMoves: {
      ...save.bestMoves,
      [levelId]: best === undefined || moves < best ? moves : best
    }
  };
}

export function localStorageStore(): KeyValueStore {
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value)
  };
}
