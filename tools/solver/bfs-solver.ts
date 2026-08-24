import type { Direction, GameState, LevelDef } from '../../src/domain/types';
import { DIRECTIONS } from '../../src/domain/types';
import { applyCommand } from '../../src/domain/engine';
import { createInitialState } from '../../src/domain/level';
import { canonicalJSON } from '../../src/domain/serialize';
import { parseLevel } from '../../src/content/validate';

/**
 * BFS 专用的稳定哈希，排除 moveCount 和 history（二者对状态转移无影响）。
 */
function bfsHash(state: GameState): string {
  const logical = {
    version: state.version,
    levelId: state.levelId,
    status: state.status,
    mapping: state.mapping,
    actors: state.actors,
    doors: state.doors,
    pulseDoors: state.pulseDoors,
    fragileCollapsed: state.fragileCollapsed
  };
  return fnv1a32(canonicalJSON(logical)).toString(16).padStart(8, '0');
}

function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export interface SolverResult {
  solvable: boolean;
  optimalSteps: number;
  solution: Direction[];
  statesVisited: number;
  solutionCount: number;
  elapsedMs: number;
  budgetExhausted: boolean;
  reachedDepth: number;
  /** Reason for failure (unsolvable vs budget exhausted) */
  reason?: string;
}

export interface SolverBudget {
  maxNodes: number;
  maxDepth: number;
}

export const DEFAULT_BUDGET: SolverBudget = {
  maxNodes: 500_000,
  maxDepth: 100
};

/**
 * BFS 求解器（ADR-013）：四方向扩展，调用 applyCommand，
 * 用 stableHash（不含 history）判重。
 * 输出：可解性、最短步数、一条最短解、访问状态数、最短解数量。
 */
export function bfsSolve(level: LevelDef, budget: SolverBudget = DEFAULT_BUDGET): SolverResult {
  const start = Date.now();
  const initial = createInitialState(level);

  // 初始即胜利
  if (initial.status === 'WON') {
    return {
      solvable: true,
      optimalSteps: 0,
      solution: [],
      statesVisited: 1,
      solutionCount: 1,
      elapsedMs: Date.now() - start,
      budgetExhausted: false,
      reachedDepth: 0
    };
  }

  const seen = new Set<string>();
  const initialHash = bfsHash(initial);
  seen.add(initialHash);

  interface BfsNode {
    state: GameState;
    moves: Direction[];
  }

  let frontier: BfsNode[] = [{ state: initial, moves: [] }];
  let statesVisited = 1;
  let solutionCount = 0;
  let firstSolution: Direction[] | null = null;
  let optimalSteps = Infinity;
  let reachedDepth = 0;

  for (let depth = 0; depth < budget.maxDepth; depth++) {
    if (frontier.length === 0) break;

    // 如果已经找到解且当前层深度 > 最优步数，可以提前终止
    if (firstSolution !== null && depth >= optimalSteps) break;

    const nextFrontier: BfsNode[] = [];

    for (const node of frontier) {
      // 如果已经找到解且当前节点深度 >= 最优步数，不需要再扩展
      if (firstSolution !== null && node.moves.length >= optimalSteps) continue;

      if (statesVisited >= budget.maxNodes) {
        return {
          solvable: false,
          optimalSteps: -1,
          solution: [],
          statesVisited,
          solutionCount: 0,
          elapsedMs: Date.now() - start,
          budgetExhausted: true,
          reachedDepth,
          reason: `节点预算超限: 已访问 ${statesVisited} 个状态 (上限 ${budget.maxNodes})，深度 ${depth}`
        };
      }

      for (const dir of DIRECTIONS) {
        const outcome = applyCommand(level, node.state, dir);
        const nextState = outcome.state;

        const hash = bfsHash(nextState);

        if (seen.has(hash)) continue;
        seen.add(hash);
        statesVisited++;

        const newMoves = [...node.moves, dir];
        reachedDepth = Math.max(reachedDepth, newMoves.length);

        if (nextState.status === 'WON') {
          if (firstSolution === null) {
            firstSolution = newMoves;
            optimalSteps = newMoves.length;
            solutionCount = 1;
          } else if (newMoves.length === optimalSteps) {
            solutionCount++;
          }
          // 同一层可能有多个解，继续搜完本层
          continue;
        }

        // 剪枝：如果当前路径已经 >= 已知最优，不加入下一层
        if (firstSolution !== null && newMoves.length >= optimalSteps) continue;

        nextFrontier.push({ state: nextState, moves: newMoves });
      }
    }

    frontier = nextFrontier;

    // 如果本层已找到解，不再继续向下搜索
    if (firstSolution !== null) {
      break;
    }
  }

  // 如果还有未处理的 frontier 但已找到解
  if (firstSolution !== null) {
    return {
      solvable: true,
      optimalSteps,
      solution: firstSolution,
      statesVisited,
      solutionCount,
      elapsedMs: Date.now() - start,
      budgetExhausted: false,
      reachedDepth
    };
  }

  // 如果 frontier 为空，状态空间穷尽
  const elapsed = Date.now() - start;
  if (frontier.length === 0 && firstSolution === null) {
    return {
      solvable: false,
      optimalSteps: -1,
      solution: [],
      statesVisited,
      solutionCount: 0,
      elapsedMs: elapsed,
      budgetExhausted: false,
      reachedDepth,
      reason: '状态空间已穷尽，无解'
    };
  }

  // 深度超限
  return {
    solvable: false,
    optimalSteps: -1,
    solution: [],
    statesVisited,
    solutionCount: 0,
    elapsedMs: elapsed,
    budgetExhausted: true,
    reachedDepth,
    reason: `深度预算超限: 已达最大深度 ${budget.maxDepth}`
  };
}

/**
 * 回放校验：从初始状态按解序列跑 applyCommand，终态 status === 'WON'。
 */
export function replaySolution(level: LevelDef, moves: Direction[]): boolean {
  let state = createInitialState(level);
  for (const dir of moves) {
    state = applyCommand(level, state, dir).state;
  }
  return state.status === 'WON';
}

/**
 * 从 JSON 文件内容解析关卡
 */
export function parseLevelFromJson(json: string): LevelDef {
  return parseLevel(JSON.parse(json));
}
