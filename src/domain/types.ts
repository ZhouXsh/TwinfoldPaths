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
  | PulseDoorEntity;

export interface LevelHint {
  focus: string;
  direction?: Direction | null;
}

/**
 * 表现层信息可见性规则。`fog` 只限制玩家能看到的地图信息，
 * 不参与领域层移动/碰撞/胜利判定，因此不会改变求解器语义。
 */
export interface LevelVisibility {
  mode: 'full' | 'fog';
  /** Chebyshev 半径；1 即角色周围 3x3 九宫格。 */
  radius?: number;
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

/** 阻挡原因（M5 要求单向格阻挡反馈与墙不同但逻辑确定；仅表现层消费）。 */
export type BlockReason =
  'bounds' | 'wall' | 'door' | 'colorDoor' | 'pulseDoor' | 'oneWay' | 'pause';

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
