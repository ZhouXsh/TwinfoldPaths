# 领域模型（Domain Model）V1.0

> 本文件是领域层的类型与数据事实来源。阶段 05 的 TypeScript 实现必须与本文件一一对应；偏离须走 `docs/decision-log.md`。
> 模型为纯数据：不含函数、渲染对象、DOM、音频或任何表现层引用。坐标系：原点在左上，x 向右，y 向下（与 `reference/关卡JSON_Schema.md` 一致）。

## 1. 基础类型

```text
Direction   = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'        // R-01：唯一输入域
Point       = { x: int, y: int }                       // 网格坐标
MappingMode = 'H_MIRROR' | 'V_MIRROR' | 'ROTATE_CW'    // M4 的三种映射
ActorColor  = 'BLUE' | 'ORANGE'
GameStatus  = 'PLAYING' | 'WON'
```

### 方向映射函数（R-02、M4）

```text
mirror(H_MIRROR):  LEFT<->RIGHT,  UP->UP,   DOWN->DOWN
mirror(V_MIRROR):  UP<->DOWN,     LEFT->LEFT, RIGHT->RIGHT
rotate(ROTATE_CW): UP->RIGHT, RIGHT->DOWN, DOWN->LEFT, LEFT->UP
applyMapping(d, m) = m == 'H_MIRROR' ? mirror(d) : m == 'V_MIRROR' ? mirrorV(d) : rotateCW(d)
```

约束：映射只作用于 ORANGE（不变量 I9）。初始映射来自关卡 `initialMapping`，缺省 `H_MIRROR`。

## 2. 角色状态

```text
ActorState = {
  color: ActorColor,
  pos: Point,          // 当前位置（结算后）
  hasPauseToken: bool  // M3 暂停令牌，上限 1（ADR-005，不变量 I10）
}
```

## 3. 机关实体

关卡静态数据中的实体统一为 `Entity`，动态可变字段标注（dyn）。

| type | 机制 | 静态字段 | 动态字段（dyn） | 语义 |
|---|---|---|---|---|
| `wall` | M0 | x,y | — | 阻挡；边界隐式为墙 |
| `door` | M1 | id, x,y | open: bool | 压板联动；回合末按压板占用刷新 |
| `plate` | M1 | id, x,y, doorId | — | 角色（任一颜色）站在其上 → 联动门开启 |
| `colorDoor` | M2 | x,y, color | — | 仅对应颜色角色可通过 |
| `pauseTile` | M3 | x,y | — | 回合末站在其上且无令牌 → 获得令牌 |
| `switcher` | M4 | x,y, target: MappingMode | — | 回合末站在其上 → 全局映射置为 target |
| `oneWay` | M5 | x,y, arrow: Direction | — | 进入不限；离开时方向必须等于 arrow |
| `portal` | M6 | portalId, x,y, end: 'A' \| 'B' | — | 成对（同 portalId 的 A/B）；回合末传送 |
| `fragile` | M7 | x,y | collapsed: bool | 角色离开后坍塌为障碍；撤销恢复 |
| `pulseSwitch` | M8 | pairId, x,y | — | 配对脉冲开关 |
| `pulseDoor` | M8 | pairId, x,y | activated: bool | 配对开关同回合触发 → 永久开启（闩锁） |

出口不是实体，是关卡字段：`blueExit`、`orangeExit`（Point）。出口永不锁定（R-05）。

## 4. 关卡定义（静态，加载后不可变）

```text
LevelDef = {
  schemaVersion: int,        // 关卡 Schema 版本
  id: string,                // 唯一 ID，如 "level-001"
  chapter: int, order: int,
  grid: { width: int, height: int },
  blueStart, orangeStart, blueExit, orangeExit: Point,
  initialMapping: MappingMode,
  walls: Point[],
  entities: Entity[],        // 不含 wall（wall 独立数组）
  parMoves: int,             // >= 求解器最优；上偏须有 parMovesNote（ADR-003）
  parMovesNote?: string,
  hint: { focus: string, direction?: Direction },
  tags: string[]
}
```

## 5. 游戏状态（动态，可序列化）

```text
GameState = {
  version: 1,                       // 状态序列化版本（迁移用）
  levelId: string,
  status: GameStatus,
  moveCount: int,                   // 仅统计已成立（未取消）的输入
  mapping: MappingMode,             // 当前生效映射
  actors: { blue: ActorState, orange: ActorState },
  doors: { [doorId]: bool },        // 普通门开闭
  pulseDoors: { [pairId]: bool },   // 同步脉冲门闩锁（activated）
  fragileCollapsed: Point[],        // 已坍塌的脆弱格（M7）
  history: Snapshot[]               // 撤销栈，见 §7
}
```

说明：

- 压板无独立状态：门开闭每回合末由占用直接推导（不变量 I11），避免冗余状态不同步。
- 暂停令牌存于 `ActorState.hasPauseToken`（不是计数器，上限 1）。
- `history` 属于状态一部分但不参与胜负哈希（§6 哈希排除 history）。

## 6. 序列化与稳定哈希

```text
canonicalJSON(v):
  对象键按字典序排序；数组保序；数字/字符串/布尔按 JSON 输出；禁止 undefined/函数。
stableHash(state):
  s = canonicalJSON(state 但剔除 history)
  return FNV-1a-32(s) 的 8 位十六进制
```

用途：`stableHash` 供 BFS 判重与回放校验；`canonicalJSON` 供存档与快照比对。禁止把渲染对象、函数、循环引用放入 `GameState`（不变量 I8）。

## 7. 快照与撤销（R-06）

```text
Snapshot = {
  status, moveCount, mapping,
  actors, doors, pulseDoors, fragileCollapsed   // 深拷贝，不含 history
}
```

- 每次**成立的**输入结算前，把当前状态投影为 Snapshot 压入 `history`。
- 被取消的回合（同格）不压栈、不计数（不变量 I6）。
- UNDO = 弹出栈顶 Snapshot 恢复全部字段；栈无上限。
- RESTART = 由 `LevelDef` 重建初始 `GameState`（history 清空），目标 ≤1 秒（FR-05）。

## 8. MoveResult（表现层消费的结算结果）

```text
MoveResult = {
  applied: bool,                     // false = 整步取消（R-04）
  blue:  { from: Point, to: Point, blocked: bool },
  orange:{ from: Point, to: Point, blocked: bool },
  teleported: { blue: bool, orange: bool },
  pauseConsumed: { blue: bool, orange: bool },
  won: bool
}
```

`MoveResult` 只描述本回合事实，供渲染、音效与动画使用；渲染层不得据此修改 `GameState`（AGENTS.md 纪律 4）。

## 9. 版本字段汇总

| 字段 | 归属 | 用途 |
|---|---|---|
| `LevelDef.schemaVersion` | 关卡数据 | Schema 迁移/拒绝（阶段 09） |
| `GameState.version` | 运行时状态 | 快照/存档迁移 |
| 存档版本 | 存档槽（阶段 06） | ADR-001 分槽 |

三者独立递增；加载器遇未知版本必须拒绝或走显式迁移，不得静默修复（Schema 基线）。
