/**
 * 本地存档（ADR-001 双槽）：主槽 + 备份槽各写一份；读取时主槽优先，
 * 任一槽损坏回退另一槽，双槽损坏回退默认值。不做静默修复。
 * 版本 3（阶段 11）：增加 settings 字段（音乐/音效/振动/弱化动画开关）。
 */

export interface SaveData {
  version: number;
  /** 已解锁的最高线性序号（ADR-004：通关第 N 关解锁第 N+1 关；N 为全局排序位置），初始为 1。 */
  highestUnlocked: number;
  /** levelId -> 最佳步数。 */
  bestMoves: Record<string, number>;
  /** 设置项（阶段 11 新增，读取时容错）。 */
  settings?: SaveSettings;
}

export interface SaveSettings {
  music: boolean;
  sfx: boolean;
  vibration: boolean;
  reducedAnim: boolean;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SAVE_KEY_PRIMARY = 'twinfold-paths:save:a';
export const SAVE_KEY_BACKUP = 'twinfold-paths:save:b';
export const SETTINGS_KEY = 'twinfold-paths:settings';
/** 版本 3（阶段 11）：新增 settings 字段。 */
export const SAVE_VERSION = 3;

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, highestUnlocked: 1, bestMoves: {} };
}

export function defaultSettings(): SaveSettings {
  return { music: true, sfx: true, vibration: true, reducedAnim: false };
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
  // 版本兼容：v2 存档（version=2）视为可读取，但需转换
  if (obj.version !== SAVE_VERSION && obj.version !== 2) return null;
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
  // 读取 settings（v2 存档没有这个字段，容错为默认）
  let settings: SaveSettings | undefined;
  if (obj.settings !== undefined && obj.settings !== null && typeof obj.settings === 'object') {
    const s = obj.settings as Record<string, unknown>;
    settings = {
      music: s.music === true,
      sfx: s.sfx === true,
      vibration: s.vibration === true,
      reducedAnim: s.reducedAnim === true
    };
  }
  return { version: SAVE_VERSION, highestUnlocked: obj.highestUnlocked, bestMoves, settings };
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

/** 加载设置（从存档中读取，不存在则返回默认）。 */
export function loadSettings(store: KeyValueStore): SaveSettings {
  const save = loadSave(store);
  if (save.settings) return { ...save.settings };
  // 尝试从独立设置键读取（向后兼容）
  const raw = store.getItem(SETTINGS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        return {
          music: parsed.music === true,
          sfx: parsed.sfx === true,
          vibration: parsed.vibration === true,
          reducedAnim: parsed.reducedAnim === true
        };
      }
    } catch {
      // ignore
    }
  }
  return defaultSettings();
}

/** 保存设置到存档中。 */
export function persistSettings(store: KeyValueStore, settings: SaveSettings): void {
  const save = loadSave(store);
  save.settings = { ...settings };
  persistSave(store, save);
  // 同时写入独立键（向后兼容）
  store.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
    },
    settings: save.settings ? { ...save.settings } : undefined
  };
}

export function localStorageStore(): KeyValueStore {
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value)
  };
}
