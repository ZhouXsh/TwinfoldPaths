import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY_BACKUP,
  SAVE_KEY_PRIMARY,
  defaultSave,
  loadSave,
  parseSave,
  persistSave,
  recordWin,
  type KeyValueStore
} from '../../../src/persistence/save-store';

function mapStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    }
  };
}

describe('双槽存档（ADR-001：损坏安全回退）', () => {
  it('空存档回退默认值', () => {
    const save = loadSave(mapStore());
    expect(save).toEqual(defaultSave());
  });

  it('写入后两槽一致且可回读', () => {
    const store = mapStore();
    const data = { version: 1, highestUnlocked: 3, bestMoves: { 'level-001': 1 } };
    persistSave(store, data);
    expect(loadSave(store)).toEqual(data);
    expect(store.getItem(SAVE_KEY_PRIMARY)).toBe(store.getItem(SAVE_KEY_BACKUP));
  });

  it('主槽损坏、备份槽完好 → 回退备份槽', () => {
    const store = mapStore();
    persistSave(store, { version: 1, highestUnlocked: 2, bestMoves: {} });
    store.setItem(SAVE_KEY_PRIMARY, '坏数据{');
    expect(loadSave(store).highestUnlocked).toBe(2);
  });

  it('双槽损坏 → 回退默认值', () => {
    const store = mapStore();
    store.setItem(SAVE_KEY_PRIMARY, '坏数据');
    store.setItem(SAVE_KEY_BACKUP, '{"version":99}');
    expect(loadSave(store)).toEqual(defaultSave());
  });
});

describe('parseSave 结构校验（不静默修复）', () => {
  it('合法文本解析成功', () => {
    const text = JSON.stringify({ version: 1, highestUnlocked: 2, bestMoves: { 'level-001': 3 } });
    expect(parseSave(text)).toEqual({
      version: 1,
      highestUnlocked: 2,
      bestMoves: { 'level-001': 3 }
    });
  });

  it('拒绝非法 JSON、null、数组与错误版本', () => {
    expect(parseSave('{')).toBeNull();
    expect(parseSave(null)).toBeNull();
    expect(parseSave('')).toBeNull();
    expect(parseSave('[1,2]')).toBeNull();
    expect(parseSave('{"version":2,"highestUnlocked":1,"bestMoves":{}}')).toBeNull();
  });

  it('拒绝非法 highestUnlocked 与 bestMoves 值', () => {
    expect(parseSave('{"version":1,"highestUnlocked":0,"bestMoves":{}}')).toBeNull();
    expect(parseSave('{"version":1,"highestUnlocked":1.5,"bestMoves":{}}')).toBeNull();
    expect(parseSave('{"version":1,"highestUnlocked":1,"bestMoves":{"a":-1}}')).toBeNull();
    expect(parseSave('{"version":1,"highestUnlocked":1,"bestMoves":{"a":"x"}}')).toBeNull();
    expect(parseSave('{"version":1,"highestUnlocked":1}')).toBeNull();
  });
});

describe('recordWin 通关结算', () => {
  it('推进解锁并记录最佳步数', () => {
    const next = recordWin(defaultSave(), 'level-001', 1, 1);
    expect(next.highestUnlocked).toBe(2);
    expect(next.bestMoves['level-001']).toBe(1);
  });

  it('最佳步数只保留更小值，解锁不回退', () => {
    const base = { version: 1, highestUnlocked: 3, bestMoves: { 'level-001': 1 } };
    const worse = recordWin(base, 'level-001', 1, 5);
    expect(worse.bestMoves['level-001']).toBe(1);
    expect(worse.highestUnlocked).toBe(3);
    const better = recordWin(base, 'level-002', 2, 3);
    expect(better.bestMoves['level-002']).toBe(3);
    expect(better.highestUnlocked).toBe(3);
  });

  it('不修改入参存档', () => {
    const base = defaultSave();
    recordWin(base, 'level-001', 1, 1);
    expect(base).toEqual(defaultSave());
  });
});
