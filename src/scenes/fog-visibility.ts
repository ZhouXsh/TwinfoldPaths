import type {
  LevelVisibility,
  Point,
  VisibilityShape,
  VisibilitySource
} from '../domain/types';

export interface FogVisibilityInput {
  width: number;
  height: number;
  actors: readonly Point[];
  radius: number;
  shape?: VisibilityShape;
}

export interface FogFrame {
  moveCount: number;
  blue: Point;
  orange: Point;
}

export interface FogBeacon extends Point {
  radius: number;
}

export interface FogStateInput {
  width: number;
  height: number;
  frames: readonly FogFrame[];
  rules: LevelVisibility;
  beacons?: readonly FogBeacon[];
}

export interface FogState {
  visible: Set<string>;
  remembered: Set<string>;
  activatedBeacons: Set<string>;
  pulseActive: boolean;
}

export function fogCellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function includeOffset(dx: number, dy: number, radius: number, shape: VisibilityShape): boolean {
  switch (shape) {
    case 'diamond':
      return Math.abs(dx) + Math.abs(dy) <= radius;
    case 'cross':
      return (dx === 0 || dy === 0) && Math.max(Math.abs(dx), Math.abs(dy)) <= radius;
    case 'square':
    default:
      return Math.max(Math.abs(dx), Math.abs(dy)) <= radius;
  }
}

/** 计算当前可见格；square + radius=1 即以角色为中心的 3x3 九宫格。 */
export function computeVisibleCells(input: FogVisibilityInput): Set<string> {
  const visible = new Set<string>();
  const radius = Math.max(0, Math.floor(input.radius));
  const shape = input.shape ?? 'square';
  for (const actor of input.actors) {
    const minX = Math.max(0, actor.x - radius);
    const maxX = Math.min(input.width - 1, actor.x + radius);
    const minY = Math.max(0, actor.y - radius);
    const maxY = Math.min(input.height - 1, actor.y + radius);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (includeOffset(x - actor.x, y - actor.y, radius, shape)) {
          visible.add(fogCellKey(x, y));
        }
      }
    }
  }
  return visible;
}

export function mergeExploredCells(explored: Set<string>, visible: ReadonlySet<string>): void {
  for (const key of visible) explored.add(key);
}

function actorsForFrame(frame: FogFrame, source: VisibilitySource): readonly Point[] {
  switch (source) {
    case 'blue':
      return [frame.blue];
    case 'orange':
      return [frame.orange];
    case 'alternating':
      return frame.moveCount % 2 === 0 ? [frame.blue] : [frame.orange];
    case 'both':
    default:
      return [frame.blue, frame.orange];
  }
}

function frameVisible(
  width: number,
  height: number,
  frame: FogFrame,
  rules: LevelVisibility,
  radiusOverride?: number
): Set<string> {
  return computeVisibleCells({
    width,
    height,
    actors: actorsForFrame(frame, rules.source ?? 'both'),
    radius: radiusOverride ?? rules.radius ?? 1,
    shape: rules.shape ?? 'square'
  });
}

function frameTouchesBeacon(frame: FogFrame, beacon: FogBeacon): boolean {
  return (
    (frame.blue.x === beacon.x && frame.blue.y === beacon.y) ||
    (frame.orange.x === beacon.x && frame.orange.y === beacon.y)
  );
}

/**
 * 从可撤销的历史快照重建探索状态，不依赖额外 GameState 字段：
 * - persistent：所有历史视野保留为半透明记忆；
 * - decay：只保留最近 memoryTurns 回合；
 * - none：只显示当前视野；
 * - alternating：每回合只由一名角色提供视野；
 * - pulseEvery：指定回合扩大为雷达扫描；
 * - visionBeacon：踩到后永久照亮信标周围。
 */
export function computeFogState(input: FogStateInput): FogState {
  const frames = input.frames;
  if (frames.length === 0) {
    return {
      visible: new Set<string>(),
      remembered: new Set<string>(),
      activatedBeacons: new Set<string>(),
      pulseActive: false
    };
  }

  const current = frames[frames.length - 1]!;
  const seenAt = new Map<string, number>();
  for (const frame of frames) {
    for (const key of frameVisible(input.width, input.height, frame, input.rules)) {
      seenAt.set(key, Math.max(seenAt.get(key) ?? -1, frame.moveCount));
    }
  }

  const pulseEvery = input.rules.pulseEvery ?? 0;
  const pulseActive = pulseEvery > 0 && current.moveCount > 0 && current.moveCount % pulseEvery === 0;
  const visible = frameVisible(
    input.width,
    input.height,
    current,
    input.rules,
    pulseActive ? (input.rules.pulseRadius ?? Math.max(input.width, input.height)) : undefined
  );

  const activatedBeacons = new Set<string>();
  for (const beacon of input.beacons ?? []) {
    if (!frames.some((frame) => frameTouchesBeacon(frame, beacon))) continue;
    activatedBeacons.add(fogCellKey(beacon.x, beacon.y));
    const beaconVisible = computeVisibleCells({
      width: input.width,
      height: input.height,
      actors: [beacon],
      radius: beacon.radius,
      shape: 'square'
    });
    for (const key of beaconVisible) visible.add(key);
  }

  const remembered = new Set<string>();
  const memory = input.rules.memory ?? 'persistent';
  if (memory !== 'none') {
    const memoryTurns = Math.max(1, input.rules.memoryTurns ?? 3);
    for (const [key, lastSeen] of seenAt) {
      if (visible.has(key)) continue;
      if (memory === 'persistent' || current.moveCount - lastSeen <= memoryTurns) {
        remembered.add(key);
      }
    }
  }

  return { visible, remembered, activatedBeacons, pulseActive };
}
