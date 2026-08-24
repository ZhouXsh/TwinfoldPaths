# 领域引擎 API（domain-engine）V1.0

> `src/domain` 的唯一对外契约。表现层（Phaser 场景）只允许通过这些 API 与领域层交互；禁止直接构造或修改 `GameState` 内部字段。实现依据：`docs/turn-resolution.md`（P1–P9 流水线）、`docs/domain-model.md`、`docs/invariants.md`。

## 模块清单

| 模块           | 导出                                                                                                     | 说明                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `types.ts`     | Direction、Point、MappingMode、ActorState、Entity（10 类）、LevelDef、Snapshot、GameState、MoveResult 等 | 纯类型与常量（DIRECTIONS）                                  |
| `point.ts`     | DELTA、pointKey、equalsPoint、addDir、inBounds                                                           | 坐标工具                                                    |
| `mapping.ts`   | applyMapping                                                                                             | 方向映射（H_MIRROR/V_MIRROR/ROTATE_CW），只作用于橙色（I9） |
| `level.ts`     | STATE_VERSION、createInitialState                                                                        | 由关卡定义构造初始状态                                      |
| `serialize.ts` | canonicalJSON、stableHash、serialize、deserialize、projectSnapshot、cloneState                           | 序列化/稳定哈希/快照/克隆                                   |
| `engine.ts`    | applyCommand、undo、restart                                                                              | 回合结算与撤销/重开                                         |

## 函数契约

### `createInitialState(level: LevelDef): GameState`

由关卡构造初始状态：角色就位、普通门全关、脉冲门未激活、无坍塌、无令牌、映射取 `initialMapping`、history 为空。纯函数。

### `applyCommand(level: LevelDef, prev: GameState, input: Direction): ApplyOutcome`

唯一的动作结算入口（AGENTS.md 纪律：输入归一化后只能走这里）。

- 返回 `{ state, result }`：`state` 为结算后的**新状态对象**（输入 `prev` 不被修改）；`result: MoveResult` 供表现层渲染。
- 回合成立：`state` 为新对象，`moveCount = prev.moveCount + 1`，`history` 追加回合前快照。
- 回合被同格取消（R-04）：返回的 `state` 就是 `prev`（同一引用，按位不变），`result.applied = false`，不压栈不计数，令牌恢复（I6）。
- `prev.status === 'WON'`：忽略 MOVE，返回原状态与 `applied = false`。
- 非法 Direction：抛出 `Error`（不吞非法状态）。
- 与规范的一处签名差异：因 `GameState` 仅含 `levelId`（`docs/domain-model.md` §5），地形查询需要 `LevelDef`，故 API 显式接收 `level` 参数；语义与 `resolveTurn(state, input)` 一致。
- 实现顺序按 `docs/turn-resolution.md` §7：P2 映射 → P3 令牌 → P4 意图 → P5 同格 → D2 传送 → D1 坍塌 → D3 切换器 → D4 压板/门 → D5 脉冲闩锁 → D6 令牌授予 → P7 胜利 → P8 快照/计数。

`MoveResult` 字段语义：

- `applied`：回合是否成立。
- `blue/orange.from/to`：回合内起点与实际终点（被阻挡或取消时 `to == from`）。
- `blue/orange.blocked`：本回合未移动（墙/边界/门/单向/暂停均记为 true）。
- `blue/orange.reason`：阻挡原因 `BlockReason | null`（`bounds|wall|door|colorDoor|pulseDoor|oneWay|pause`），仅 `blocked=true` 时非空；阶段 08 追加，供表现层区分反馈（M5 单向格反馈必须与墙不同）。坍塌脆弱格记为 `wall`。
- `teleported`：本回合是否发生传送。
- `pauseConsumed`：本回合是否消耗了令牌。
- `won`：本回合是否达成胜利。

### `undo(state: GameState): UndoOutcome`

返回 `{ state, undone }`。history 非空：弹出栈顶快照，全字段恢复（位置、映射、令牌、门、闩锁、坍塌、status、moveCount），`undone = true`（I4）；空栈：返回原状态，`undone = false`（I15）。纯函数，不修改输入。

### `restart(level: LevelDef): GameState`

等价 `createInitialState(level)`（I16）。

### `serialize(state) / deserialize(text) / stableHash(state) / canonicalJSON(value)`

- `canonicalJSON`：键按字典序的确定性 JSON。
- `stableHash`：对**剔除 history** 的逻辑状态做 FNV-1a-32，8 位十六进制；供 BFS 判重与回放校验（I8）。
- `serialize/deserialize`：存档用；`deserialize` 校验版本与必填字段，非法输入抛错（拒绝静默修复）。

## 不变量保证（实现层）

- I1/I2/I13：阻挡谓词 + 同格取消保证位置合法、不同格、单步。
- I3：全流程纯函数、无随机/时钟（`check` 门禁内测试锁定）。
- I5：传送每角色每回合最多一次（单次 D2，无循环重入）。
- I6：取消路径不产生新状态。
- I11：门开闭每回合末由压板占用推导，无独立记忆。
- I12：脆弱格仅"离开"坍塌（比较回合开始位置与最终位置）；D2 后格上仍有角色则不坍塌（ADR-016）。
- I17：脉冲闩锁只置真不回退（仅撤销还原）。
- I18：映射切换不影响本回合方向（方向在 D3 之前已计算）。

## 边界与禁止

- `src/domain` 零外部导入（`scripts/check-deps.mjs` 机器强制）：不得出现 Phaser、DOM、localStorage、音频、网络。
- 表现层不得修改 `GameState`；渲染只能消费 `state`（只读）与 `MoveResult`。
- 求解器（阶段 09）复用 `applyCommand` 与 `stableHash`，不得另写结算逻辑。
