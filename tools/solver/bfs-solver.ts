import type { Direction, GameState, LevelDef } from '../../src/domain/types';
import { DIRECTIONS } from '../../src/domain/types';
import { applyCommand } from '../../src/domain/engine';
import { createInitialState } from '../../src/domain/level';
import { canonicalJSON } from '../../src/domain/serialize';
import { parseLevel } from '../../src/content/validate';

/**
 * BFS 专用稳定哈希。普通关卡排除 moveCount/history；M9 相位门关卡额外保留回合奇偶，
 * 因为同一几何状态在奇/偶回合拥有不同的后继状态。
 */
function bfsHash(state: GameState, includeTurnParity: boolean): string {
  const logical = {
    version: state.version,
    levelId: state.levelId,
    status: state.status,
    mapping: state.mapping,
    actors: state.actors,
    doors: state.doors,
    pulseDoors: state.pulseDoors,
    fragileCollapsed: state.fragileCollapsed,
    ...(includeTurnParity ? { turnParity: state.moveCount % 2 } : {})
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

export function bfsSolve(level: LevelDef, budget: SolverBudget = DEFAULT_BUDGET): SolverResult {
  const start = Date.now();
  const initial = createInitialState(level);
  const includeTurnParity = level.entities.some((entity) => entity.type === 'phaseDoor');

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
  seen.add(bfsHash(initial, includeTurnParity));

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
    if (firstSolution !== null && depth >= optimalSteps) break;

    const nextFrontier: BfsNode[] = [];

    for (const node of frontier) {
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
        const hash = bfsHash(nextState, includeTurnParity);

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
          continue;
        }

        if (firstSolution !== null && newMoves.length >= optimalSteps) continue;
        nextFrontier.push({ state: nextState, moves: newMoves });
      }
    }

    frontier = nextFrontier;
    if (firstSolution !== null) break;
  }

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

  const elapsed = Date.now() - start;
  if (frontier.length === 0) {
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

export function replaySolution(level: LevelDef, moves: Direction[]): boolean {
  let state = createInitialState(level);
  for (const dir of moves) {
    state = applyCommand(level, state, dir).state;
  }
  return state.status === 'WON';
}

export function parseLevelFromJson(json: string): LevelDef {
  return parseLevel(JSON.parse(json));
}
