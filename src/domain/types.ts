export const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;

export type Direction = (typeof DIRECTIONS)[number];

export interface Point {
  x: number;
  y: number;
}

export interface Grid {
  width: number;
  height: number;
}

export type MappingMode = 'H_MIRROR' | 'V_MIRROR' | 'ROTATE_CW';

export type ActorColor = 'BLUE' | 'ORANGE';

export type GameStatus = 'PLAYING' | 'WON';

export type TurnPhase = 'ODD' | 'EVEN';

export interface ActorState {
  color: ActorColor;
  pos: Point;
  hasPauseToken: boolean;
}

export interface DoorEntity {
  type: 'door';
  id: string;
  x: number;
  y: number;
}

export interface PlateEntity {
  type: 'plate';
  id: string;
  x: number;
  y: number;
  doorId: string;
}

export interface ColorDoorEntity {
  type: 'colorDoor';
  x: number;
  y: number;
  color: ActorColor;
}

export interface PauseTileEntity {
  type: 'pauseTile';
  x: number;
  y: number;
}

export interface SwitcherEntity {
  type: 'switcher';
  x: number;
  y: number;
  target: MappingMode;
}

export interface OneWayEntity {
  type: 'oneWay';
  x: number;
  y: number;
  arrow: Direction;
}

export interface PortalEntity {
  type: 'portal';
  portalId: string;
  x: number;
  y: number;
  end: 'A' | 'B';
}

export interface FragileEntity {
  type: 'fragile';
  x: number;
  y: number;
}

export interface PulseSwitchEntity {
  type: 'pulseSwitch';
  pairId: string;
  x: number;
  y: number;
}

export interface PulseDoorEntity {
  type: 'pulseDoor';
  pairId: string;
  x: number;
  y: number;
}

/** M9：仅在指定回合奇偶相位允许进入的门。 */
export interface PhaseDoorEntity {
  type: 'phaseDoor';
  phase: TurnPhase;
  x: number;
  y: number;
}

/** V2：探索章节中的视野信标；踩到后永久照亮其周围区域。 */
export interface VisionBeaconEntity {
  type: 'visionBeacon';
  radius: number;
  x: number;
  y: number;
}

export type Entity =
  | DoorEntity
  | PlateEntity
  | ColorDoorEntity
  | PauseTileEntity
  | SwitcherEntity
  | OneWayEntity
  | PortalEntity
  | FragileEntity
  | PulseSwitchEntity
  | PulseDoorEntity
  | PhaseDoorEntity
  | VisionBeaconEntity;

export interface LevelHint {
  focus: string;
  direction?: Direction | null;
}

export type VisibilityShape = 'square' | 'diamond' | 'cross';
export type VisibilityMemory = 'persistent' | 'decay' | 'none';
export type VisibilitySource = 'both' | 'alternating' | 'blue' | 'orange';

/**
 * 表现层信息可见性规则。探索规则只限制玩家能看到的地图信息，
 * 不参与领域层移动/碰撞/胜利判定，因此不会改变求解器的几何语义。
 */
export interface LevelVisibility {
  mode: 'full' | 'fog';
  /** 视野半径；square + radius=1 即角色周围 3x3 九宫格。 */
  radius?: number;
  /** 视野形状，用于章节内形成不同的探索手感。 */
  shape?: VisibilityShape;
  /** 已探索区域的记忆方式。 */
  memory?: VisibilityMemory;
  /** memory=decay 时，旧视野保留多少个已应用回合。 */
  memoryTurns?: number;
  /** 哪个角色提供当前视野；alternating 会随回合在蓝/橙之间交替。 */
  source?: VisibilitySource;
  /** 每隔多少个已应用回合触发一次雷达脉冲。 */
  pulseEvery?: number;
  /** 雷达脉冲半径；大于地图长边即可视为全图扫描。 */
  pulseRadius?: number;
}

export interface LevelDef {
  schemaVersion: number;
  id: string;
  chapter: number;
  order: number;
  grid: Grid;
  blueStart: Point;
  orangeStart: Point;
  blueExit: Point;
  orangeExit: Point;
  initialMapping: MappingMode;
  walls: Point[];
  entities: Entity[];
  parMoves: number;
  parMovesNote?: string;
  hint: LevelHint;
  tags: string[];
  visibility?: LevelVisibility;
}

export interface Snapshot {
  status: GameStatus;
  moveCount: number;
  mapping: MappingMode;
  actors: {
    blue: ActorState;
    orange: ActorState;
  };
  doors: Record<string, boolean>;
  pulseDoors: Record<string, boolean>;
  fragileCollapsed: Point[];
}

export interface GameState {
  version: number;
  levelId: string;
  status: GameStatus;
  moveCount: number;
  mapping: MappingMode;
  actors: {
    blue: ActorState;
    orange: ActorState;
  };
  doors: Record<string, boolean>;
  pulseDoors: Record<string, boolean>;
  fragileCollapsed: Point[];
  history: Snapshot[];
}

/** 阻挡原因（仅表现层消费，用于给玩家区分不同规则反馈）。 */
export type BlockReason =
  | 'bounds'
  | 'wall'
  | 'door'
  | 'colorDoor'
  | 'pulseDoor'
  | 'phaseDoor'
  | 'oneWay'
  | 'pause';

export interface ActorMoveInfo {
  from: Point;
  to: Point;
  blocked: boolean;
  /** blocked=true 时给出原因；未阻挡与回合取消为 null。 */
  reason: BlockReason | null;
}

export interface MoveResult {
  applied: boolean;
  blue: ActorMoveInfo;
  orange: ActorMoveInfo;
  teleported: {
    blue: boolean;
    orange: boolean;
  };
  pauseConsumed: {
    blue: boolean;
    orange: boolean;
  };
  won: boolean;
}
