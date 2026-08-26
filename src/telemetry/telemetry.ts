/**
 * 开发版匿名本地事件遥测。
 *
 * 记录 level_start、move、invalid、undo、restart、hint、complete、quit 事件。
 * 仅开发模式（import.meta.env.DEV === true）默认启用，可通过 URL 参数 `?telemetry=0` 强制关闭；
 * 生产构建（import.meta.env.PROD）默认关闭，可通过 URL 参数 `?telemetry=1` 强制开启。
 *
 * 纯本地存储，不收集任何身份信息（不收集 IP、姓名、设备 ID、指纹等）。
 * 支持导出 CSV 格式。
 */

export interface TelemetryEvent {
  /** 事件类型 */
  type: TelemetryEventType;
  /** 事件发生时间（ISO 8601） */
  timestamp: string;
  /** 关卡 ID（如 'level-001'），部分事件可能为 '' */
  levelId: string;
  /** 当前步数（仅 move/complete/undo/restart 有效，其余为 0） */
  moveCount: number;
  /** 额外数据（JSON 字符串，匿名） */
  payload: string;
}

export type TelemetryEventType =
  'level_start' | 'move' | 'invalid' | 'undo' | 'restart' | 'hint' | 'complete' | 'quit';

const STORAGE_KEY = 'twinfold-paths:telemetry';
const MAX_EVENTS = 5000;

let enabled: boolean | null = null;

/**
 * 检查遥测是否启用。
 * 逻辑：生产构建默认关闭，开发模式默认开启；URL 参数 `?telemetry=0` 强制关闭，`?telemetry=1` 强制开启。
 */
function isEnabled(): boolean {
  if (enabled !== null) return enabled;
  // 检查 URL 参数
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const param = params.get('telemetry');
  if (param === '0') {
    enabled = false;
    return false;
  }
  if (param === '1') {
    enabled = true;
    return true;
  }
  // 默认：开发模式开启，生产模式关闭
  // import.meta.env 是 Vite 编译时注入，在 node 测试环境不可用
  let dev = false;
  try {
    dev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
  } catch {
    // 测试环境无 import.meta.env
  }
  enabled = dev;
  return enabled;
}

/** 强制设置遥测开关（用于测试）。 */
export function setTelemetryEnabled(value: boolean): void {
  enabled = value;
}

/** 重置遥测开关（重新评估环境）。 */
export function resetTelemetryEnabled(): void {
  enabled = null;
}

/** 从 localStorage 读取事件记录。 */
function loadEvents(): TelemetryEvent[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** 写入事件记录到 localStorage（限制最大条数）。 */
function saveEvents(events: TelemetryEvent[]): void {
  try {
    // 只保留最近 MAX_EVENTS 条
    const trimmed = events.slice(-MAX_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage 满时静默丢弃
  }
}

/** 记录一条遥测事件。 */
export function recordEvent(
  type: TelemetryEventType,
  levelId: string,
  moveCount: number,
  payload: string = ''
): void {
  if (!isEnabled()) return;
  const event: TelemetryEvent = {
    type,
    timestamp: new Date().toISOString(),
    levelId,
    moveCount,
    payload
  };
  const events = loadEvents();
  events.push(event);
  saveEvents(events);
}

/** 导出全部遥测事件为 CSV 字符串。 */
export function exportCSV(): string {
  const events = loadEvents();
  const header = 'type,timestamp,levelId,moveCount,payload';
  const rows = events.map((e) => {
    // 对 payload 做简单转义（逗号换引号）
    const payload =
      e.payload.includes(',') || e.payload.includes('"')
        ? `"${e.payload.replace(/"/g, '""')}"`
        : e.payload;
    return `${e.type},${e.timestamp},${e.levelId},${e.moveCount},${payload}`;
  });
  return [header, ...rows].join('\n');
}

/** 下载遥测 CSV 文件。 */
export function downloadCSV(filename: string = 'telemetry-export.csv'): void {
  const csv = exportCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 清除所有遥测事件。 */
export function clearEvents(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** 获取遥测事件总数。 */
export function eventCount(): number {
  return loadEvents().length;
}

/** 获取遥测状态信息。 */
export function getStatus(): { enabled: boolean; eventCount: number } {
  return { enabled: isEnabled(), eventCount: eventCount() };
}
