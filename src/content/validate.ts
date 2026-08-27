import type {
  ActorColor,
  Direction,
  Entity,
  LevelDef,
  LevelVisibility,
  MappingMode,
  Point,
  TurnPhase,
  VisibilityMemory,
  VisibilityShape,
  VisibilitySource
} from '../domain/types';
import { DIRECTIONS } from '../domain/types';
import { equalsPoint, pointKey } from '../domain/point';

/** 关卡记录 = 领域 LevelDef + 展示元数据（title 不属于领域状态）。 */
export interface LevelRecord extends LevelDef {
  title: string;
}

const MAPPING_MODES: readonly MappingMode[] = ['H_MIRROR', 'V_MIRROR', 'ROTATE_CW'];
const ACTOR_COLORS: readonly ActorColor[] = ['BLUE', 'ORANGE'];
const TURN_PHASES: readonly TurnPhase[] = ['ODD', 'EVEN'];
const VISIBILITY_SHAPES: readonly VisibilityShape[] = ['square', 'diamond', 'cross'];
const VISIBILITY_MEMORIES: readonly VisibilityMemory[] = ['persistent', 'decay', 'none'];
const VISIBILITY_SOURCES: readonly VisibilitySource[] = ['both', 'alternating', 'blue', 'orange'];
const GRID_MIN = 2;
const GRID_MAX = 32;

const LEVEL_KEYS = new Set([
  'schemaVersion',
  'id',
  'chapter',
  'order',
  'title',
  'grid',
  'blueStart',
  'orangeStart',
  'blueExit',
  'orangeExit',
  'initialMapping',
  'walls',
  'entities',
  'parMoves',
  'parMovesNote',
  'hint',
  'tags',
  'visibility'
]);

function fail(message: string): never {
  throw new Error(`关卡数据非法: ${message}`);
}

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: Set<string>, label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${label} 未知字段: ${key}`);
  }
}

function parsePoint(value: unknown, label: string, width: number, height: number): Point {
  if (!isRecord(value)) fail(`${label} 不是坐标对象`);
  const x = value.x;
  const y = value.y;
  if (!isInt(x) || !isInt(y)) fail(`${label} 坐标不是整数`);
  if (x < 0 || y < 0 || x >= width || y >= height) fail(`${label} 坐标越界: (${x},${y})`);
  return { x, y };
}

function parseDirection(value: unknown, label: string): Direction {
  if (typeof value !== 'string' || !(DIRECTIONS as readonly string[]).includes(value)) {
    fail(`${label} 不是合法方向: ${String(value)}`);
  }
  return value as Direction;
}

function parseMapping(value: unknown, label: string): MappingMode {
  if (typeof value !== 'string' || !(MAPPING_MODES as readonly string[]).includes(value)) {
    fail(`${label} 不是合法映射模式: ${String(value)}`);
  }
  return value as MappingMode;
}

function parseVisibility(value: unknown): LevelVisibility | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) fail('visibility 不是对象');
  rejectUnknownKeys(
    value,
    new Set([
      'mode',
      'radius',
      'shape',
      'memory',
      'memoryTurns',
      'source',
      'pulseEvery',
      'pulseRadius'
    ]),
    'visibility'
  );

  if (value.mode !== 'full' && value.mode !== 'fog') fail('visibility.mode 必须是 full/fog');
  const visibility: LevelVisibility = { mode: value.mode };

  if (value.radius !== undefined) {
    if (!isInt(value.radius) || value.radius < 0 || value.radius > 16) {
      fail('visibility.radius 必须是 0..16 的整数');
    }
    visibility.radius = value.radius;
  }
  if (value.shape !== undefined) {
    if (
      typeof value.shape !== 'string' ||
      !(VISIBILITY_SHAPES as readonly string[]).includes(value.shape)
    ) {
      fail(`visibility.shape 非法: ${String(value.shape)}`);
    }
    visibility.shape = value.shape as VisibilityShape;
  }
  if (value.memory !== undefined) {
    if (
      typeof value.memory !== 'string' ||
      !(VISIBILITY_MEMORIES as readonly string[]).includes(value.memory)
    ) {
      fail(`visibility.memory 非法: ${String(value.memory)}`);
    }
    visibility.memory = value.memory as VisibilityMemory;
  }
  if (value.memoryTurns !== undefined) {
    if (!isInt(value.memoryTurns) || value.memoryTurns < 1 || value.memoryTurns > 50) {
      fail('visibility.memoryTurns 必须是 1..50 的整数');
    }
    visibility.memoryTurns = value.memoryTurns;
  }
  if (value.source !== undefined) {
    if (
      typeof value.source !== 'string' ||
      !(VISIBILITY_SOURCES as readonly string[]).includes(value.source)
    ) {
      fail(`visibility.source 非法: ${String(value.source)}`);
    }
    visibility.source = value.source as VisibilitySource;
  }
  if (value.pulseEvery !== undefined) {
    if (!isInt(value.pulseEvery) || value.pulseEvery < 2 || value.pulseEvery > 30) {
      fail('visibility.pulseEvery 必须是 2..30 的整数');
    }
    visibility.pulseEvery = value.pulseEvery;
  }
  if (value.pulseRadius !== undefined) {
    if (!isInt(value.pulseRadius) || value.pulseRadius < 1 || value.pulseRadius > 32) {
      fail('visibility.pulseRadius 必须是 1..32 的整数');
    }
    visibility.pulseRadius = value.pulseRadius;
  }
  if (visibility.memory === 'decay' && visibility.memoryTurns === undefined) {
    visibility.memoryTurns = 3;
  }
  if (visibility.pulseRadius !== undefined && visibility.pulseEvery === undefined) {
    fail('visibility.pulseRadius 需要同时设置 pulseEvery');
  }
  return visibility;
}

function parseEntity(value: unknown, index: number, width: number, height: number): Entity {
  const label = `entities[${index}]`;
  if (!isRecord(value)) fail(`${label} 不是对象`);
  const type = value.type;
  if (typeof type !== 'string') fail(`${label} 缺少 type`);
  const x = value.x;
  const y = value.y;
  if (!isInt(x) || !isInt(y)) fail(`${label} 坐标不是整数`);
  if (x < 0 || y < 0 || x >= width || y >= height) fail(`${label} 坐标越界: (${x},${y})`);

  switch (type) {
    case 'door':
      if (typeof value.id !== 'string' || value.id.length === 0) fail(`${label} 门缺少 id`);
      return { type, id: value.id, x, y };
    case 'plate':
      if (typeof value.id !== 'string' || value.id.length === 0) fail(`${label} 压板缺少 id`);
      if (typeof value.doorId !== 'string' || value.doorId.length === 0) {
        fail(`${label} 压板缺少 doorId`);
      }
      return { type, id: value.id, x, y, doorId: value.doorId };
    case 'colorDoor':
      if (
        typeof value.color !== 'string' ||
        !(ACTOR_COLORS as readonly string[]).includes(value.color)
      ) {
        fail(`${label} 专属门颜色非法: ${String(value.color)}`);
      }
      return { type, x, y, color: value.color as ActorColor };
    case 'pauseTile':
      return { type, x, y };
    case 'switcher':
      return { type, x, y, target: parseMapping(value.target, `${label}.target`) };
    case 'oneWay':
      return { type, x, y, arrow: parseDirection(value.arrow, `${label}.arrow`) };
    case 'portal':
      if (typeof value.portalId !== 'string' || value.portalId.length === 0) {
        fail(`${label} 传送门缺少 portalId`);
      }
      if (value.end !== 'A' && value.end !== 'B') fail(`${label} 传送门 end 必须是 A/B`);
      return { type, portalId: value.portalId, x, y, end: value.end };
    case 'fragile':
      return { type, x, y };
    case 'pulseSwitch':
    case 'pulseDoor':
      if (typeof value.pairId !== 'string' || value.pairId.length === 0) {
        fail(`${label} 脉冲机关缺少 pairId`);
      }
      return { type, pairId: value.pairId, x, y };
    case 'phaseDoor':
      if (
        typeof value.phase !== 'string' ||
        !(TURN_PHASES as readonly string[]).includes(value.phase)
      ) {
        fail(`${label} 相位门 phase 必须是 ODD/EVEN`);
      }
      return { type, phase: value.phase as TurnPhase, x, y };
    case 'visionBeacon':
      if (!isInt(value.radius) || value.radius < 1 || value.radius > 8) {
        fail(`${label} 视野信标 radius 必须是 1..8 的整数`);
      }
      return { type, radius: value.radius, x, y };
    default:
      fail(`${label} 未知实体类型: ${type}`);
  }
}

/** 严格解析：拒绝未知字段与非法结构，不做静默修复（ADR-012）。 */
export function parseLevel(input: unknown): LevelRecord {
  if (!isRecord(input)) fail('顶层不是对象');
  for (const key of Object.keys(input)) {
    if (!LEVEL_KEYS.has(key)) fail(`未知字段: ${key}`);
  }
  if (input.schemaVersion !== 1) {
    fail(`schemaVersion 不受支持: ${String(input.schemaVersion)}（期望 1）`);
  }
  if (typeof input.id !== 'string' || input.id.length === 0) fail('id 必须是非空字符串');
  if (typeof input.title !== 'string' || input.title.length === 0) fail('title 必须是非空字符串');
  if (!isInt(input.chapter) || input.chapter < 1) fail('chapter 必须是正整数');
  if (!isInt(input.order) || input.order < 1) fail('order 必须是正整数');

  if (!isRecord(input.grid)) fail('grid 不是对象');
  const width = input.grid.width;
  const height = input.grid.height;
  if (!isInt(width) || !isInt(height)) fail('grid 宽高不是整数');
  if (width < GRID_MIN || width > GRID_MAX || height < GRID_MIN || height > GRID_MAX) {
    fail(`grid 尺寸超出 ${GRID_MIN}..${GRID_MAX}: ${width}x${height}`);
  }

  const blueStart = parsePoint(input.blueStart, 'blueStart', width, height);
  const orangeStart = parsePoint(input.orangeStart, 'orangeStart', width, height);
  const blueExit = parsePoint(input.blueExit, 'blueExit', width, height);
  const orangeExit = parsePoint(input.orangeExit, 'orangeExit', width, height);
  if (blueStart.x === orangeStart.x && blueStart.y === orangeStart.y) fail('双角色起点重合');
  if (blueExit.x === orangeExit.x && blueExit.y === orangeExit.y) fail('双出口重合');

  const initialMapping = parseMapping(input.initialMapping, 'initialMapping');

  if (!Array.isArray(input.walls)) fail('walls 不是数组');
  const wallKeys = new Set<string>();
  const walls: Point[] = input.walls.map((w, i) => {
    const p = parsePoint(w, `walls[${i}]`, width, height);
    const key = `${p.x},${p.y}`;
    if (wallKeys.has(key)) fail(`墙重复: (${p.x},${p.y})`);
    wallKeys.add(key);
    return p;
  });
  const occupied = [blueStart, orangeStart, blueExit, orangeExit];
  for (const wall of walls) {
    if (occupied.some((p) => p.x === wall.x && p.y === wall.y)) {
      fail(`墙与起点/出口重合: (${wall.x},${wall.y})`);
    }
  }

  if (!Array.isArray(input.entities)) fail('entities 不是数组');
  const entities = input.entities.map((e, i) => parseEntity(e, i, width, height));

  if (!isInt(input.parMoves) || input.parMoves < 1) fail('parMoves 必须是正整数');
  let parMovesNote: string | undefined;
  if (input.parMovesNote !== undefined) {
    if (typeof input.parMovesNote !== 'string') fail('parMovesNote 必须是字符串');
    parMovesNote = input.parMovesNote;
  }

  if (!isRecord(input.hint)) fail('hint 不是对象');
  if (typeof input.hint.focus !== 'string' || input.hint.focus.length === 0) {
    fail('hint.focus 必须是非空字符串');
  }
  let direction: Direction | null = null;
  if (input.hint.direction !== undefined && input.hint.direction !== null) {
    direction = parseDirection(input.hint.direction, 'hint.direction');
  }

  if (!Array.isArray(input.tags) || input.tags.length === 0) fail('tags 必须是非空数组');
  const tags = input.tags.map((t, i) => {
    if (typeof t !== 'string' || t.length === 0) fail(`tags[${i}] 必须是非空字符串`);
    return t;
  });

  const visibility = parseVisibility(input.visibility);

  return {
    schemaVersion: 1,
    id: input.id,
    chapter: input.chapter,
    order: input.order,
    title: input.title,
    grid: { width, height },
    blueStart,
    orangeStart,
    blueExit,
    orangeExit,
    initialMapping,
    walls,
    entities,
    parMoves: input.parMoves,
    ...(parMovesNote === undefined ? {} : { parMovesNote }),
    hint: { focus: input.hint.focus, direction },
    tags,
    ...(visibility === undefined ? {} : { visibility })
  };
}

export interface SemanticError {
  path: string;
  message: string;
}

export function validateLevelSemantics(level: LevelDef): SemanticError[] {
  const errors: SemanticError[] = [];
  const doorIds = new Set<string>();
  const plateIds = new Set<string>();
  const plateDoorIds = new Map<string, number>();
  const portalEnds = new Map<string, Set<string>>();
  const portalPositions = new Map<string, string>();
  const pulseSwitchCounts = new Map<string, number>();

  for (let i = 0; i < level.entities.length; i++) {
    const entity = level.entities[i];
    if (!entity) continue;
    const path = `entities[${i}]`;

    if (entity.type === 'oneWay' || entity.type === 'portal' || entity.type === 'phaseDoor') {
      if (equalsPoint(entity, level.blueExit) || equalsPoint(entity, level.orangeExit)) {
        errors.push({ path, message: `${entity.type} 不可压在出口上: (${entity.x},${entity.y})` });
      }
    }

    if (level.walls.some((w) => equalsPoint(w, entity))) {
      errors.push({ path, message: `${entity.type} 与墙重叠: (${entity.x},${entity.y})` });
    }

    switch (entity.type) {
      case 'door': {
        if (doorIds.has(entity.id)) errors.push({ path, message: `door.id 重复: ${entity.id}` });
        doorIds.add(entity.id);
        break;
      }
      case 'plate': {
        if (plateIds.has(entity.id)) errors.push({ path, message: `plate.id 重复: ${entity.id}` });
        plateIds.add(entity.id);
        plateDoorIds.set(entity.doorId, (plateDoorIds.get(entity.doorId) ?? 0) + 1);
        break;
      }
      case 'portal': {
        const ends = portalEnds.get(entity.portalId);
        if (ends) ends.add(entity.end);
        else portalEnds.set(entity.portalId, new Set([entity.end]));

        const portalKey = pointKey(entity);
        if (portalPositions.has(portalKey)) {
          errors.push({
            path,
            message: `同格多个传送入口: (${entity.x},${entity.y}) (portalId: ${portalPositions.get(portalKey)} 和 ${entity.portalId})`
          });
        }
        portalPositions.set(portalKey, entity.portalId);
        break;
      }
      case 'pulseSwitch':
        pulseSwitchCounts.set(entity.pairId, (pulseSwitchCounts.get(entity.pairId) ?? 0) + 1);
        break;
      default:
        break;
    }
  }

  for (const [doorId, count] of plateDoorIds) {
    if (!doorIds.has(doorId)) {
      errors.push({ path: 'entities', message: `plate 引用了不存在的 doorId: ${doorId}` });
    }
    if (count > 1) {
      errors.push({ path: 'entities', message: `多个压板 (${count}个) 联动同一 doorId: ${doorId}` });
    }
  }

  for (const [portalId, ends] of portalEnds) {
    if (ends.size !== 2 || !ends.has('A') || !ends.has('B')) {
      errors.push({
        path: 'entities',
        message: `portal 不成对: portalId=${portalId} (有 end: ${[...ends].join(',')})`
      });
    }
  }

  for (const [pairId, count] of pulseSwitchCounts) {
    if (count !== 2) {
      errors.push({
        path: 'entities',
        message: `pulseSwitch 数量不为 2: pairId=${pairId} (数量=${count})`
      });
    }
  }

  const chapterTag = `chapter-${level.chapter}`;
  if (!level.tags.includes(chapterTag)) {
    errors.push({ path: 'tags', message: `缺少章节标签: ${chapterTag}` });
  }

  if (!level.tags.some((t) => /^M\d+$/.test(t))) {
    errors.push({ path: 'tags', message: '缺少机制标签 (M0-M9)' });
  }

  if (level.chapter === 4 && level.visibility?.mode !== 'fog') {
    errors.push({ path: 'visibility', message: '第四章必须启用探索迷雾模式' });
  }

  return errors;
}
