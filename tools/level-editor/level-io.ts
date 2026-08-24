/**
 * 编辑器核心类型与纯函数：编辑器状态 ↔ 关卡 JSON 的转换、校验、求解。
 * 纯 TS，无 DOM 依赖，可在浏览器与 Node 测试中复用。
 */
import type { Entity } from '../../src/domain/types';
import { parseLevel, validateLevelSemantics } from '../../src/content/validate';
import type { SemanticError } from '../../src/content/validate';
import { bfsSolve, DEFAULT_BUDGET } from '../solver/bfs-solver';
import type { SolverResult } from '../solver/bfs-solver';

/** 编辑器内部状态（不含 DOM 引用） */
export interface EditorState {
  grid: { width: number; height: number };
  blueStart: { x: number; y: number };
  orangeStart: { x: number; y: number };
  blueExit: { x: number; y: number };
  orangeExit: { x: number; y: number };
  initialMapping: string;
  walls: { x: number; y: number }[];
  entities: Entity[];
  parMoves: number;
  hint: { focus: string };
  tags: string[];
  /** 编辑器元数据 */
  levelId: string;
  chapter: number;
  order: number;
  title: string;
}

export function createDefaultState(): EditorState {
  return {
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 0 },
    orangeStart: { x: 4, y: 0 },
    blueExit: { x: 0, y: 4 },
    orangeExit: { x: 4, y: 4 },
    initialMapping: 'H_MIRROR',
    walls: [],
    entities: [],
    parMoves: 1,
    hint: { focus: '编辑器默认关卡' },
    tags: ['chapter-1', 'M0'],
    levelId: 'custom-001',
    chapter: 1,
    order: 1,
    title: '自定义关卡'
  };
}

/** 从编辑器状态构建 LevelDef 兼容的 JSON 对象 */
export function buildLevelJSON(state: EditorState): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: state.levelId,
    chapter: state.chapter,
    order: state.order,
    title: state.title,
    grid: { ...state.grid },
    blueStart: { ...state.blueStart },
    orangeStart: { ...state.orangeStart },
    blueExit: { ...state.blueExit },
    orangeExit: { ...state.orangeExit },
    initialMapping: state.initialMapping,
    walls: state.walls.map((w) => ({ ...w })),
    entities: state.entities.map((e) => ({ ...e })),
    parMoves: state.parMoves,
    hint: { ...state.hint },
    tags: [...state.tags]
  };
}

/** 导出关卡 JSON 文本 */
export function exportLevelText(state: EditorState): string {
  return JSON.stringify(buildLevelJSON(state), null, 2);
}

/** 导入结果 */
export type ImportResult =
  | {
      success: true;
      state: EditorState;
      /** 导入过程中产生的语义错误 */
      semanticErrors: SemanticError[];
    }
  | {
      success: false;
      error: string;
    };

/**
 * 导入关卡 JSON 文本：经 parseLevel + validateLevelSemantics 校验后转换为 EditorState。
 * 失败时返回错误信息，不抛异常。
 */
export function importLevelText(text: string): ImportResult {
  try {
    const parsed = JSON.parse(text);
    const level = parseLevel(parsed);
    const semanticErrors = validateLevelSemantics(level);

    // 转换为 EditorState
    const state: EditorState = {
      grid: { ...level.grid },
      blueStart: { ...level.blueStart },
      orangeStart: { ...level.orangeStart },
      blueExit: { ...level.blueExit },
      orangeExit: { ...level.orangeExit },
      initialMapping: level.initialMapping,
      walls: level.walls.map((w) => ({ ...w })),
      entities: level.entities.map((e) => ({ ...e })),
      parMoves: level.parMoves,
      hint: { ...level.hint },
      tags: [...level.tags],
      levelId: level.id,
      chapter: level.chapter,
      order: level.order,
      title: level.title
    };

    return { success: true, state, semanticErrors };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** 验证结果 */
export interface ValidationResult {
  valid: boolean;
  errors: SemanticError[];
}

/** 对当前编辑器状态做结构+语义校验 */
export function validateState(state: EditorState): ValidationResult {
  const json = buildLevelJSON(state);
  try {
    const level = parseLevel(json);
    const errors = validateLevelSemantics(level);
    return { valid: errors.length === 0, errors };
  } catch (e) {
    return { valid: false, errors: [{ path: '(顶层)', message: (e as Error).message }] };
  }
}

/** 求解结果包装 */
export interface SolveOutcome {
  running: boolean;
  result: SolverResult | null;
  error: string | null;
}

/**
 * 对当前编辑器状态做 BFS 求解（同步调用，大关卡可能耗时较长）。
 * 返回 null 表示求解失败（校验不通过等）。
 */
export function solveState(state: EditorState): SolverResult | null {
  const json = buildLevelJSON(state);
  try {
    const level = parseLevel(json);
    const semanticErrors = validateLevelSemantics(level);
    if (semanticErrors.length > 0) {
      return null;
    }
    return bfsSolve(level, DEFAULT_BUDGET);
  } catch {
    return null;
  }
}
