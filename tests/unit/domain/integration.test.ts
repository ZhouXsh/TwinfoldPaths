/**
 * 跨模块集成测试：加载关卡 → 执行动作序列 → 机关触发 → 胜利 → 存档 → 选关解锁。
 * 全链路覆盖领域层 + 存档层，不依赖 Phaser/DOM。
 */

import { describe, expect, it } from 'vitest';
import { applyCommand, restart } from '../../../src/domain/engine';
import { createInitialState } from '../../../src/domain/level';
import { canonicalJSON } from '../../../src/domain/serialize';
import type { Direction, GameState, LevelDef } from '../../../src/domain/types';
import {
  SAVE_VERSION,
  defaultSave,
  loadSave,
  parseSave,
  persistSave,
  recordWin,
  type KeyValueStore,
  loadSettings,
  persistSettings,
  defaultSettings
} from '../../../src/persistence/save-store';
import { LEVELS, getLevelById, levelLinearIndex, nextLevelId } from '../../../src/content/levels';
import { bfsSolve } from '../../../tools/solver/bfs-solver';

// ── 辅助：内存存储 ──

function mapStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    }
  };
}

// ── 辅助：执行方向序列 ──

function playSequence(level: LevelDef, moves: Direction[]): GameState {
  let state = createInitialState(level);
  for (const dir of moves) {
    state = applyCommand(level, state, dir).state;
  }
  return state;
}

// ── 集成测试 ──

describe('集成：加载关卡 → 执行 → 胜利 → 存档 → 解锁', () => {
  it('level-001 通过后 nextLevelId 正确且存档推进', () => {
    const level = LEVELS.find((l) => l.id === 'level-001');
    expect(level, 'level-001 应存在').toBeDefined();
    if (!level) return;

    // 执行已知解法
    const state = playSequence(level, ['LEFT']);
    expect(state.status).toBe('WON');
    expect(state.moveCount).toBe(1);

    // 存档记录胜利
    const save = recordWin(defaultSave(), 'level-001', 1, state.moveCount);
    expect(save.highestUnlocked).toBe(2);
    expect(save.bestMoves['level-001']).toBe(1);

    // nextLevelId 确认
    expect(nextLevelId('level-001')).toBe('level-002');

    // 持久化与回读
    const store = mapStore();
    persistSave(store, save);
    const loaded = loadSave(store);
    expect(loaded.highestUnlocked).toBe(2);
    expect(loaded.bestMoves['level-001']).toBe(1);
  });

  it('level-002 通关后解锁 level-003', () => {
    const level = LEVELS.find((l) => l.id === 'level-002');
    expect(level).toBeDefined();
    if (!level) return;

    const state = playSequence(level, ['UP', 'UP', 'LEFT']);
    expect(state.status).toBe('WON');

    const save = recordWin(defaultSave(), 'level-002', 2, state.moveCount);
    expect(save.highestUnlocked).toBe(3);
    expect(nextLevelId('level-002')).toBe('level-003');
  });

  it('线性序号推进：通关 level-010 解锁 level-011（跨章节）', () => {
    const save = recordWin(defaultSave(), 'level-010', 10, 7);
    expect(save.highestUnlocked).toBe(11);
    expect(nextLevelId('level-010')).toBe('level-011');
  });

  it('通关 level-020 解锁 level-021（第 2→3 章）', () => {
    const save = recordWin(defaultSave(), 'level-020', 20, 6);
    expect(save.highestUnlocked).toBe(21);
    expect(nextLevelId('level-020')).toBe('level-021');
  });

  it('通关 level-050 末关后 nextLevelId 为 null', () => {
    const save = recordWin(defaultSave(), 'level-050', 50, 6);
    expect(save.highestUnlocked).toBe(51);
    expect(nextLevelId('level-050')).toBeNull();
  });

  it('最佳步数不退化：先高步数通关，后低步数更新', () => {
    let save = defaultSave();
    // 第一次通关：5 步
    save = recordWin(save, 'level-001', 1, 5);
    expect(save.bestMoves['level-001']).toBe(5);
    // 第二次通关：2 步（更好）
    save = recordWin(save, 'level-001', 1, 2);
    expect(save.bestMoves['level-001']).toBe(2);
    // 第三次通关：3 步（不是更好）
    save = recordWin(save, 'level-001', 1, 3);
    expect(save.bestMoves['level-001']).toBe(2);
  });

  it('levelLinearIndex 与 levelId 的正确映射', () => {
    expect(levelLinearIndex('level-001')).toBe(1);
    expect(levelLinearIndex('level-010')).toBe(10);
    expect(levelLinearIndex('level-011')).toBe(11);
    expect(levelLinearIndex('level-050')).toBe(50);
  });

  it('getLevelById 返回正确关卡', () => {
    const level = getLevelById('level-001');
    expect(level).toBeDefined();
    expect(level?.id).toBe('level-001');
    expect(level?.chapter).toBe(1);
    expect(level?.order).toBe(1);
  });
});

describe('集成：机关触发 → 胜利 → 存档（含动态状态）', () => {
  it('M1 压板关卡通关后存档正确', () => {
    const level = LEVELS.find((l) => l.id === 'level-004');
    expect(level).toBeDefined();
    if (!level) return;

    // 用求解器找到解
    const result = bfsSolve(level);
    expect(result.solvable).toBe(true);
    const state = playSequence(level, result.solution);
    expect(state.status).toBe('WON');

    const save = recordWin(defaultSave(), 'level-004', 4, state.moveCount);
    expect(save.bestMoves['level-004']).toBeGreaterThan(0);
    expect(save.highestUnlocked).toBe(5);
  });

  it('M3 暂停令牌关卡通关后存档正确', () => {
    const level = LEVELS.find((l) => l.id === 'level-021');
    expect(level).toBeDefined();
    if (!level) return;

    const result = bfsSolve(level);
    expect(result.solvable).toBe(true);
    const state = playSequence(level, result.solution);
    expect(state.status).toBe('WON');

    const save = recordWin(defaultSave(), 'level-021', 21, state.moveCount);
    expect(save.highestUnlocked).toBe(22);
  });

  it('M7 脆弱格关卡通关后存档正确', () => {
    const level = LEVELS.find((l) => l.id === 'level-041');
    expect(level).toBeDefined();
    if (!level) return;

    const result = bfsSolve(level);
    expect(result.solvable).toBe(true);
    const state = playSequence(level, result.solution);
    expect(state.status).toBe('WON');

    const save = recordWin(defaultSave(), 'level-041', 41, state.moveCount);
    expect(save.highestUnlocked).toBe(42);
  });

  it('M8 脉冲门关卡通关后存档正确', () => {
    const level = LEVELS.find((l) => l.id === 'level-046');
    expect(level).toBeDefined();
    if (!level) return;

    const result = bfsSolve(level);
    expect(result.solvable).toBe(true);
    const state = playSequence(level, result.solution);
    expect(state.status).toBe('WON');

    const save = recordWin(defaultSave(), 'level-046', 46, state.moveCount);
    expect(save.highestUnlocked).toBe(47);
  });
});

describe('集成：存档设置持久化', () => {
  it('保存设置后回读一致', () => {
    const store = mapStore();
    const settings = { music: false, sfx: true, vibration: false, reducedAnim: true };
    persistSettings(store, settings);
    const loaded = loadSettings(store);
    expect(loaded).toEqual(settings);
  });

  it('默认设置回读', () => {
    const store = mapStore();
    const loaded = loadSettings(store);
    expect(loaded).toEqual(defaultSettings());
  });

  it('设置独立键与存档设置键一致', () => {
    const store = mapStore();
    const settings = { music: false, sfx: false, vibration: true, reducedAnim: true };
    persistSettings(store, settings);
    // 从存档中读取
    const save = loadSave(store);
    expect(save.settings).toEqual(settings);
    // 从独立设置键读取
    const loaded = loadSettings(store);
    expect(loaded).toEqual(settings);
  });

  it('设置修改后存档版本不变', () => {
    const store = mapStore();
    const settings = { music: true, sfx: false, vibration: true, reducedAnim: false };
    persistSettings(store, settings);
    const save = loadSave(store);
    expect(save.version).toBe(SAVE_VERSION);
  });
});

describe('集成：v2 存档兼容读取', () => {
  it('v2 存档可被 parseSave 解析', () => {
    const v2Data = JSON.stringify({
      version: 2,
      highestUnlocked: 5,
      bestMoves: { 'level-001': 1, 'level-002': 3 }
    });
    const parsed = parseSave(v2Data);
    expect(parsed).not.toBeNull();
    expect(parsed?.highestUnlocked).toBe(5);
    expect(parsed?.bestMoves['level-001']).toBe(1);
    expect(parsed?.version).toBe(SAVE_VERSION);
  });

  it('v2 存档无 settings 字段时回退默认', () => {
    const v2Data = JSON.stringify({
      version: 2,
      highestUnlocked: 3,
      bestMoves: {}
    });
    const parsed = parseSave(v2Data);
    expect(parsed?.settings).toBeUndefined();
    // loadSettings 应返回默认
    const store = mapStore();
    store.setItem('twinfold-paths:save:a', v2Data);
    expect(loadSettings(store)).toEqual(defaultSettings());
  });

  it('v2 存档写入后版本升级为 3', () => {
    const store = mapStore();
    const v2Data = JSON.stringify({
      version: 2,
      highestUnlocked: 3,
      bestMoves: {}
    });
    store.setItem('twinfold-paths:save:a', v2Data);
    store.setItem('twinfold-paths:save:b', v2Data);

    // 加载后写入（触发升级）
    const save = loadSave(store);
    const settings = { music: true, sfx: true, vibration: false, reducedAnim: false };
    save.settings = settings;
    persistSave(store, save);

    // 重新读取，应为 v3
    const reloaded = loadSave(store);
    expect(reloaded.version).toBe(SAVE_VERSION);
    expect(reloaded.settings).toEqual(settings);
    expect(reloaded.highestUnlocked).toBe(3);
  });
});

describe('集成：损坏回退（ADR-001 双槽）', () => {
  it('主槽损坏备份槽完好 → 正常回退', () => {
    const store = mapStore();
    const good = JSON.stringify({ version: SAVE_VERSION, highestUnlocked: 7, bestMoves: {} });
    store.setItem('twinfold-paths:save:a', '坏数据{');
    store.setItem('twinfold-paths:save:b', good);
    const save = loadSave(store);
    expect(save.highestUnlocked).toBe(7);
  });

  it('双槽损坏 → 回退默认值', () => {
    const store = mapStore();
    store.setItem('twinfold-paths:save:a', '坏数据');
    store.setItem('twinfold-paths:save:b', '{"version":99,"highestUnlocked":1,"bestMoves":{}}');
    const save = loadSave(store);
    expect(save).toEqual(defaultSave());
  });

  it('空存档 → 默认值', () => {
    const store = mapStore();
    expect(loadSave(store)).toEqual(defaultSave());
  });
});

describe('集成：restart 后关卡可重新通关', () => {
  it('level-001 restart 后重新通关', () => {
    const level = LEVELS.find((l) => l.id === 'level-001');
    expect(level).toBeDefined();
    if (!level) return;

    const state = playSequence(level, ['LEFT']);
    expect(state.status).toBe('WON');
    expect(state.moveCount).toBe(1);

    // restart
    const fresh = restart(level);
    expect(fresh.status).toBe('PLAYING');
    expect(fresh.moveCount).toBe(0);
    expect(fresh.history).toHaveLength(0);

    // 重新通关
    const state2 = playSequence(level, ['LEFT']);
    expect(state2.status).toBe('WON');
    expect(state2.moveCount).toBe(1);
  });
});

describe('集成：recordWin 不修改入参', () => {
  it('多次调用 recordWin 入参不变', () => {
    const base = defaultSave();
    const original = canonicalJSON(base);
    recordWin(base, 'level-001', 1, 1);
    expect(canonicalJSON(base)).toBe(original);
    recordWin(base, 'level-002', 2, 3);
    expect(canonicalJSON(base)).toBe(original);
  });
});

describe('集成：50 关全链路可通关', () => {
  it('每关用 BFS 求解后回放至胜利，recordWin 可记录', () => {
    for (const level of LEVELS) {
      const result = bfsSolve(level);
      expect(result.solvable, `${level.id} 应可解`).toBe(true);
      expect(result.solution.length).toBeGreaterThan(0);

      const state = playSequence(level, result.solution);
      expect(state.status, `${level.id} 回放应胜利`).toBe('WON');

      const idx = levelLinearIndex(level.id);
      expect(idx).toBeGreaterThan(0);
      const save = recordWin(defaultSave(), level.id, idx, state.moveCount);
      expect(save.bestMoves[level.id], `${level.id} 步数应记录`).toBe(state.moveCount);
    }
  });
});
