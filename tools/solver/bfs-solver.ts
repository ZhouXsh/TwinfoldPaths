import type { Direction, GameState, LevelDef, MoveResult } from '../../src/domain/types';
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

function samePoint(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return a.x === b.x && a.y === b.y;
}

function pointKey(p: { x: number; y: number }): string {
  return `${p.x},${p.y}`;
}

/** R-04：两球本回合从相邻格互换位置，属于允许的“对穿交换”。 */
export function isPassThroughSwap(result: MoveResult): boolean {
  if (!result.applied) return false;
  const blueMoved = !samePoint(result.blue.from, result.blue.to);
  const orangeMoved = !samePoint(result.orange.from, result.orange.to);
  return (
    blueMoved &&
    orangeMoved &&
    samePoint(result.blue.to, result.orange.from) &&
    samePoint(result.orange.to, result.blue.from)
  );
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

interface InternalSolveOptions {
  allowPassThrough: boolean;
}

function solveInternal(
  level: LevelDef,
  budget: SolverBudget,
  options: InternalSolveOptions
): SolverResult {
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
        if (!options.allowPassThrough && isPassThroughSwap(outcome.result)) continue;

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

export function bfsSolve(level: LevelDef, budget: SolverBudget = DEFAULT_BUDGET): SolverResult {
  return solveInternal(level, budget, { allowPassThrough: true });
}

/**
 * 质量审计用 BFS：禁止使用 R-04 对穿交换。
 * 若该结果不可解或显著变长，可量化证明“对穿”不是纯视觉偶遇，而是有解法价值。
 */
export function bfsSolveWithoutPassThrough(
  level: LevelDef,
  budget: SolverBudget = DEFAULT_BUDGET
): SolverResult {
  return solveInternal(level, budget, { allowPassThrough: false });
}

export interface SolutionTraceStats {
  appliedTurns: number;
  cancelledTurns: number;
  passThroughSwaps: number;
  jointMoveTurns: number;
  blueSoloMoveTurns: number;
  orangeSoloMoveTurns: number;
  blueBlockedOrangeMoved: number;
  orangeBlockedBlueMoved: number;
  blueVisitedCells: number;
  orangeVisitedCells: number;
  sharedVisitedCells: number;
  mappingChanges: number;
}

/** 对一条解序列逐回合回放，统计真正的双球空间交互，而非只看 walls 外形。 */
export function analyzeSolutionTrace(level: LevelDef, moves: Direction[]): SolutionTraceStats {
  let state = createInitialState(level);
  const blueVisited = new Set([pointKey(state.actors.blue.pos)]);
  const orangeVisited = new Set([pointKey(state.actors.orange.pos)]);
  let appliedTurns = 0;
  let cancelledTurns = 0;
  let passThroughSwaps = 0;
  let jointMoveTurns = 0;
  let blueSoloMoveTurns = 0;
  let orangeSoloMoveTurns = 0;
  let blueBlockedOrangeMoved = 0;
  let orangeBlockedBlueMoved = 0;
  let mappingChanges = 0;

  for (const dir of moves) {
    const beforeMapping = state.mapping;
    const outcome = applyCommand(level, state, dir);
    const { result } = outcome;
    const blueMoved = !samePoint(result.blue.from, result.blue.to);
    const orangeMoved = !samePoint(result.orange.from, result.orange.to);

    if (result.applied) appliedTurns++;
    else cancelledTurns++;
    if (isPassThroughSwap(result)) passThroughSwaps++;
    if (blueMoved && orangeMoved) jointMoveTurns++;
    else if (blueMoved) blueSoloMoveTurns++;
    else if (orangeMoved) orangeSoloMoveTurns++;
    if (result.blue.blocked && orangeMoved) blueBlockedOrangeMoved++;
    if (result.orange.blocked && blueMoved) orangeBlockedBlueMoved++;

    state = outcome.state;
    if (state.mapping !== beforeMapping) mappingChanges++;
    blueVisited.add(pointKey(state.actors.blue.pos));
    orangeVisited.add(pointKey(state.actors.orange.pos));
  }

  let sharedVisitedCells = 0;
  for (const cell of blueVisited) {
    if (orangeVisited.has(cell)) sharedVisitedCells++;
  }

  return {
    appliedTurns,
    cancelledTurns,
    passThroughSwaps,
    jointMoveTurns,
    blueSoloMoveTurns,
    orangeSoloMoveTurns,
    blueBlockedOrangeMoved,
    orangeBlockedBlueMoved,
    blueVisitedCells: blueVisited.size,
    orangeVisitedCells: orangeVisited.size,
    sharedVisitedCells,
    mappingChanges
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
