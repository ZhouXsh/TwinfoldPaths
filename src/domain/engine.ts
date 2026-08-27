import type {
  ActorColor,
  BlockReason,
  Direction,
  Entity,
  GameState,
  LevelDef,
  MappingMode,
  MoveResult,
  Point,
  TurnPhase
} from './types';
import { DIRECTIONS } from './types';
import { addDir, equalsPoint, inBounds, pointKey } from './point';
import { applyMapping } from './mapping';
import { createInitialState } from './level';
import { cloneState, projectSnapshot } from './serialize';

export interface ApplyOutcome {
  state: GameState;
  result: MoveResult;
}

export interface UndoOutcome {
  state: GameState;
  undone: boolean;
}

interface LevelIndex {
  walls: Set<string>;
  byCell: Map<string, Entity[]>;
}

function indexLevel(level: LevelDef): LevelIndex {
  const walls = new Set<string>(level.walls.map(pointKey));
  const byCell = new Map<string, Entity[]>();
  for (const entity of level.entities) {
    const k = pointKey(entity);
    const list = byCell.get(k);
    if (list) list.push(entity);
    else byCell.set(k, [entity]);
  }
  return { walls, byCell };
}

function entitiesAt(idx: LevelIndex, p: Point): Entity[] {
  return idx.byCell.get(pointKey(p)) ?? [];
}

function isCollapsed(state: GameState, p: Point): boolean {
  return state.fragileCollapsed.some((c) => equalsPoint(c, p));
}

function nextTurnPhase(state: GameState): TurnPhase {
  return (state.moveCount + 1) % 2 === 1 ? 'ODD' : 'EVEN';
}

/** P4 阻挡判定并给出原因（目标格阻挡先于当前格 oneWay 离开约束）。 */
function obstructionReason(
  idx: LevelIndex,
  state: GameState,
  color: ActorColor,
  cell: Point,
  grid: LevelDef['grid']
): BlockReason | null {
  if (!inBounds(grid, cell)) return 'bounds';
  if (idx.walls.has(pointKey(cell))) return 'wall';
  if (isCollapsed(state, cell)) return 'wall';
  for (const entity of entitiesAt(idx, cell)) {
    if (entity.type === 'door' && !state.doors[entity.id]) return 'door';
    if (entity.type === 'colorDoor' && entity.color !== color) return 'colorDoor';
    if (entity.type === 'pulseDoor' && !state.pulseDoors[entity.pairId]) return 'pulseDoor';
    if (entity.type === 'phaseDoor' && entity.phase !== nextTurnPhase(state)) return 'phaseDoor';
  }
  return null;
}

function isObstructedCell(
  idx: LevelIndex,
  state: GameState,
  color: ActorColor,
  cell: Point,
  grid: LevelDef['grid']
): boolean {
  return obstructionReason(idx, state, color, cell, grid) !== null;
}

function proposeStep(
  level: LevelDef,
  idx: LevelIndex,
  state: GameState,
  color: ActorColor,
  from: Point,
  dir: Direction
): { to: Point; blocked: boolean; reason: BlockReason | null } {
  const next = addDir(from, dir);
  const cellReason = obstructionReason(idx, state, color, next, level.grid);
  if (cellReason) {
    return { to: { ...from }, blocked: true, reason: cellReason };
  }
  for (const entity of entitiesAt(idx, from)) {
    if (entity.type === 'oneWay' && entity.arrow !== dir) {
      return { to: { ...from }, blocked: true, reason: 'oneWay' };
    }
  }
  return { to: next, blocked: false, reason: null };
}

function teleportActors(
  level: LevelDef,
  idx: LevelIndex,
  state: GameState,
  result: MoveResult
): void {
  const portalAt = (p: Point) =>
    entitiesAt(idx, p).find((e): e is Extract<Entity, { type: 'portal' }> => e.type === 'portal');

  const bluePortal = portalAt(state.actors.blue.pos);
  const orangePortal = portalAt(state.actors.orange.pos);
  if (!bluePortal && !orangePortal) return;

  const targetOf = (portal: Extract<Entity, { type: 'portal' }>): Point | null => {
    const other = level.entities.find(
      (e): e is Extract<Entity, { type: 'portal' }> =>
        e.type === 'portal' && e.portalId === portal.portalId && e.end !== portal.end
    );
    return other ? { x: other.x, y: other.y } : null;
  };

  const blueStart = { ...state.actors.blue.pos };
  const orangeStart = { ...state.actors.orange.pos };
  const blueTarget = bluePortal ? targetOf(bluePortal) : null;
  const orangeTarget = orangePortal ? targetOf(orangePortal) : null;

  const passable = (color: ActorColor, cell: Point): boolean =>
    !isObstructedCell(idx, state, color, cell, level.grid);

  let blueGoes =
    blueTarget !== null &&
    passable('BLUE', blueTarget) &&
    !(equalsPoint(blueTarget, orangeStart) && !orangePortal);
  let orangeGoes =
    orangeTarget !== null &&
    passable('ORANGE', orangeTarget) &&
    !(equalsPoint(orangeTarget, blueStart) && !bluePortal);

  if (blueTarget && orangeTarget && equalsPoint(blueTarget, orangeTarget)) {
    blueGoes = false;
    orangeGoes = false;
  }
  if (
    blueGoes &&
    blueTarget &&
    orangePortal &&
    !orangeGoes &&
    equalsPoint(blueTarget, orangeStart)
  ) {
    blueGoes = false;
  }
  if (
    orangeGoes &&
    orangeTarget &&
    bluePortal &&
    !blueGoes &&
    equalsPoint(orangeTarget, blueStart)
  ) {
    orangeGoes = false;
  }

  if (blueGoes && blueTarget) {
    state.actors.blue.pos = blueTarget;
    result.teleported.blue = true;
  }
  if (orangeGoes && orangeTarget) {
    state.actors.orange.pos = orangeTarget;
    result.teleported.orange = true;
  }
}

export function applyCommand(level: LevelDef, prev: GameState, input: Direction): ApplyOutcome {
  if (!DIRECTIONS.includes(input)) {
    throw new Error(`非法方向输入: ${String(input)}`);
  }
  if (prev.status === 'WON') {
    return {
      state: prev,
      result: {
        applied: false,
        blue: {
          from: prev.actors.blue.pos,
          to: prev.actors.blue.pos,
          blocked: false,
          reason: null
        },
        orange: {
          from: prev.actors.orange.pos,
          to: prev.actors.orange.pos,
          blocked: false,
          reason: null
        },
        teleported: { blue: false, orange: false },
        pauseConsumed: { blue: false, orange: false },
        won: false
      }
    };
  }

  const idx = indexLevel(level);
  const snapshot = projectSnapshot(prev);
  const state = cloneState(prev);

  const blueDir = input;
  const orangeDir = applyMapping(input, prev.mapping);

  const pauseConsumed = { blue: false, orange: false };
  const paused = { blue: false, orange: false };
  for (const who of ['blue', 'orange'] as const) {
    if (state.actors[who].hasPauseToken) {
      state.actors[who].hasPauseToken = false;
      pauseConsumed[who] = true;
      paused[who] = true;
    }
  }

  const blueFrom = { ...prev.actors.blue.pos };
  const orangeFrom = { ...prev.actors.orange.pos };
  const blueStep = paused.blue
    ? { to: { ...blueFrom }, blocked: true, reason: 'pause' as BlockReason | null }
    : proposeStep(level, idx, prev, 'BLUE', blueFrom, blueDir);
  const orangeStep = paused.orange
    ? { to: { ...orangeFrom }, blocked: true, reason: 'pause' as BlockReason | null }
    : proposeStep(level, idx, prev, 'ORANGE', orangeFrom, orangeDir);

  if (equalsPoint(blueStep.to, orangeStep.to)) {
    return {
      state: prev,
      result: {
        applied: false,
        blue: { from: blueFrom, to: blueFrom, blocked: false, reason: null },
        orange: { from: orangeFrom, to: orangeFrom, blocked: false, reason: null },
        teleported: { blue: false, orange: false },
        pauseConsumed: { blue: false, orange: false },
        won: false
      }
    };
  }

  state.actors.blue.pos = blueStep.to;
  state.actors.orange.pos = orangeStep.to;

  const result: MoveResult = {
    applied: true,
    blue: {
      from: blueFrom,
      to: blueStep.to,
      blocked: blueStep.blocked,
      reason: paused.blue ? 'pause' : blueStep.reason
    },
    orange: {
      from: orangeFrom,
      to: orangeStep.to,
      blocked: orangeStep.blocked,
      reason: paused.orange ? 'pause' : orangeStep.reason
    },
    teleported: { blue: false, orange: false },
    pauseConsumed,
    won: false
  };

  teleportActors(level, idx, state, result);

  for (const who of ['blue', 'orange'] as const) {
    const start = who === 'blue' ? blueFrom : orangeFrom;
    if (!entitiesAt(idx, start).some((e) => e.type === 'fragile')) continue;
    const occupiedAfter =
      equalsPoint(state.actors.blue.pos, start) || equalsPoint(state.actors.orange.pos, start);
    if (!occupiedAfter && !isCollapsed(state, start)) {
      state.fragileCollapsed.push({ ...start });
    }
  }

  let blueSwitch: MappingMode | null = null;
  let orangeSwitch: MappingMode | null = null;
  for (const entity of entitiesAt(idx, state.actors.blue.pos)) {
    if (entity.type === 'switcher') blueSwitch = entity.target;
  }
  for (const entity of entitiesAt(idx, state.actors.orange.pos)) {
    if (entity.type === 'switcher') orangeSwitch = entity.target;
  }
  if (blueSwitch) state.mapping = blueSwitch;
  else if (orangeSwitch) state.mapping = orangeSwitch;

  for (const entity of level.entities) {
    if (entity.type !== 'plate') continue;
    const occupied =
      equalsPoint(state.actors.blue.pos, entity) || equalsPoint(state.actors.orange.pos, entity);
    state.doors[entity.doorId] = occupied;
  }

  const pulsePairs = new Map<string, number>();
  for (const entity of level.entities) {
    if (entity.type !== 'pulseSwitch') continue;
    const occupied =
      equalsPoint(state.actors.blue.pos, entity) || equalsPoint(state.actors.orange.pos, entity);
    if (occupied) pulsePairs.set(entity.pairId, (pulsePairs.get(entity.pairId) ?? 0) + 1);
  }
  for (const [pairId, count] of pulsePairs) {
    if (count >= 2) state.pulseDoors[pairId] = true;
  }

  for (const who of ['blue', 'orange'] as const) {
    const start = who === 'blue' ? blueFrom : orangeFrom;
    const arrived = !equalsPoint(state.actors[who].pos, start);
    const onTile = entitiesAt(idx, state.actors[who].pos).some((e) => e.type === 'pauseTile');
    if (arrived && onTile && !state.actors[who].hasPauseToken) {
      state.actors[who].hasPauseToken = true;
    }
  }

  const won =
    equalsPoint(state.actors.blue.pos, level.blueExit) &&
    equalsPoint(state.actors.orange.pos, level.orangeExit);
  state.status = won ? 'WON' : 'PLAYING';
  result.won = won;

  state.moveCount = prev.moveCount + 1;
  state.history = [...prev.history, snapshot];
  return { state, result };
}

export function undo(state: GameState): UndoOutcome {
  const snapshot = state.history[state.history.length - 1];
  if (!snapshot) {
    return { state, undone: false };
  }
  const restored: GameState = {
    version: state.version,
    levelId: state.levelId,
    status: snapshot.status,
    moveCount: snapshot.moveCount,
    mapping: snapshot.mapping,
    actors: {
      blue: { ...snapshot.actors.blue, pos: { ...snapshot.actors.blue.pos } },
      orange: { ...snapshot.actors.orange, pos: { ...snapshot.actors.orange.pos } }
    },
    doors: { ...snapshot.doors },
    pulseDoors: { ...snapshot.pulseDoors },
    fragileCollapsed: snapshot.fragileCollapsed.map((p) => ({ ...p })),
    history: state.history.slice(0, -1)
  };
  return { state: restored, undone: true };
}

export function restart(level: LevelDef): GameState {
  return createInitialState(level);
}
