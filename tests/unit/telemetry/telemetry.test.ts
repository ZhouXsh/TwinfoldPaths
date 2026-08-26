/**
 * 遥测模块单元测试。
 * 测试环境为 node，需模拟 window.localStorage 和 location.search。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  recordEvent,
  exportCSV,
  clearEvents,
  eventCount,
  getStatus,
  setTelemetryEnabled,
  resetTelemetryEnabled
} from '../../../src/telemetry/telemetry';

// 模拟 localStorage
const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    store.set(key, value);
  },
  removeItem: (key: string): void => {
    store.delete(key);
  },
  clear: (): void => {
    store.clear();
  },
  get length(): number {
    return store.size;
  },
  key: (index: number): string | null => Array.from(store.keys())[index] ?? null
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal('window', { localStorage: mockLocalStorage, location: { search: '' } });
  resetTelemetryEnabled();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetTelemetryEnabled();
});

describe('遥测模块', () => {
  it('在 vitest 中 import.meta.env.DEV 为 true，默认开启', () => {
    const status = getStatus();
    expect(status.enabled).toBe(true);
  });

  it('setTelemetryEnabled 强制开启后 recordEvent 记录事件', () => {
    setTelemetryEnabled(true);
    recordEvent('level_start', 'level-001', 0);
    expect(eventCount()).toBe(1);
  });

  it('setTelemetryEnabled 强制关闭后不记录事件', () => {
    setTelemetryEnabled(false);
    recordEvent('level_start', 'level-001', 0);
    expect(eventCount()).toBe(0);
  });

  it('URL 参数 telemetry=0 强制关闭', () => {
    vi.stubGlobal('window', {
      localStorage: mockLocalStorage,
      location: { search: '?telemetry=0' }
    });
    resetTelemetryEnabled();
    recordEvent('level_start', 'level-001', 0);
    expect(eventCount()).toBe(0);
  });

  it('URL 参数 telemetry=1 强制开启', () => {
    vi.stubGlobal('window', {
      localStorage: mockLocalStorage,
      location: { search: '?telemetry=1' }
    });
    resetTelemetryEnabled();
    recordEvent('level_start', 'level-001', 0);
    expect(eventCount()).toBe(1);
  });

  it('记录所有事件类型', () => {
    setTelemetryEnabled(true);
    const types = [
      'level_start',
      'move',
      'invalid',
      'undo',
      'restart',
      'hint',
      'complete',
      'quit'
    ] as const;
    for (const type of types) {
      recordEvent(type, 'level-001', 0);
    }
    expect(eventCount()).toBe(8);
  });

  it('exportCSV 导出正确格式', () => {
    setTelemetryEnabled(true);
    recordEvent('level_start', 'level-001', 0, '');
    recordEvent('move', 'level-001', 1, '');
    const csv = exportCSV();
    const lines = csv.split('\n');
    expect(lines[0]).toBe('type,timestamp,levelId,moveCount,payload');
    expect(lines[1]).toContain('level_start');
    expect(lines[1]).toContain('level-001');
    expect(lines[2]).toContain('move');
    expect(lines[2]).toContain(',1,');
  });

  it('clearEvents 清除所有事件', () => {
    setTelemetryEnabled(true);
    recordEvent('level_start', 'level-001', 0);
    expect(eventCount()).toBe(1);
    clearEvents();
    expect(eventCount()).toBe(0);
  });

  it('getStatus 返回正确的状态信息', () => {
    setTelemetryEnabled(true);
    recordEvent('level_start', 'level-001', 0);
    const status = getStatus();
    expect(status.enabled).toBe(true);
    expect(status.eventCount).toBe(1);
  });

  it('payload 包含逗号时 CSV 正确转义', () => {
    setTelemetryEnabled(true);
    recordEvent('move', 'level-001', 1, 'a,b,c');
    const csv = exportCSV();
    expect(csv).toContain('"a,b,c"');
  });
});
