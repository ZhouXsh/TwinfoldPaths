import type { GameState, Snapshot } from './types';
import { STATE_VERSION } from './level';

export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJSON(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const body = keys.map((k) => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`).join(',');
  return `{${body}}`;
}

function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function stableHash(state: GameState): string {
  const logical: Omit<GameState, 'history'> = {
    version: state.version,
    levelId: state.levelId,
    status: state.status,
    moveCount: state.moveCount,
    mapping: state.mapping,
    actors: state.actors,
    doors: state.doors,
    pulseDoors: state.pulseDoors,
    fragileCollapsed: state.fragileCollapsed
  };
  return fnv1a32(canonicalJSON(logical)).toString(16).padStart(8, '0');
}

export function serialize(state: GameState): string {
  return canonicalJSON(state);
}

export function deserialize(text: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('存档解析失败：不是合法 JSON');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('存档解析失败：结构不是对象');
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== STATE_VERSION) {
    throw new Error(`存档版本不受支持: ${String(obj.version)}（期望 ${STATE_VERSION}）`);
  }
  for (const field of [
    'levelId',
    'status',
    'moveCount',
    'mapping',
    'actors',
    'doors',
    'pulseDoors',
    'fragileCollapsed',
    'history'
  ]) {
    if (!(field in obj)) {
      throw new Error(`存档缺少字段: ${field}`);
    }
  }
  const actors = obj.actors as Record<string, unknown>;
  if (
    actors === null ||
    typeof actors !== 'object' ||
    !('blue' in actors) ||
    !('orange' in actors)
  ) {
    throw new Error('存档 actors 结构非法');
  }
  return obj as unknown as GameState;
}

export function projectSnapshot(state: GameState): Snapshot {
  return {
    status: state.status,
    moveCount: state.moveCount,
    mapping: state.mapping,
    actors: {
      blue: { ...state.actors.blue, pos: { ...state.actors.blue.pos } },
      orange: { ...state.actors.orange, pos: { ...state.actors.orange.pos } }
    },
    doors: { ...state.doors },
    pulseDoors: { ...state.pulseDoors },
    fragileCollapsed: state.fragileCollapsed.map((p) => ({ ...p }))
  };
}

export function cloneState(state: GameState): GameState {
  return {
    version: state.version,
    levelId: state.levelId,
    ...projectSnapshot(state),
    history: state.history.map((snap) => ({
      ...snap,
      actors: {
        blue: { ...snap.actors.blue, pos: { ...snap.actors.blue.pos } },
        orange: { ...snap.actors.orange, pos: { ...snap.actors.orange.pos } }
      },
      doors: { ...snap.doors },
      pulseDoors: { ...snap.pulseDoors },
      fragileCollapsed: snap.fragileCollapsed.map((p) => ({ ...p }))
    }))
  };
}
