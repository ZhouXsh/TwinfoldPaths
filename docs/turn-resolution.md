# 回合结算规范（Turn Resolution）V1.0

> 唯一的回合结算事实来源：开发（阶段 05）、求解器（阶段 09）、撤销与所有测试共用本顺序。结算顺序为**严格线性流水线，无循环依赖**（验收门）；任何步骤只读取"当前阶段输入"，不回写先前阶段。

## 0. 术语

- **输入**：一次归一化后的 `Direction`（R-01）。一次手势/按键只产生一个输入（FR-02）。
- **回合**：一个输入的完整结算。被取消的回合不计回合数（I6）。
- **阶段（Phase）**：流水线中的固定步骤，编号 P1–P9。

## 1. 流水线总览

```text
P1 输入归一化 → P2 方向映射 → P3 暂停令牌消耗 → P4 单步移动意图（含阻挡）
→ P5 同格判定（可能整步取消）→ P6 动态结算 D1–D6 → P7 胜利判定
→ P8 快照压栈与计数 → 输出 MoveResult
```

## 2. 各阶段定义

### P1 输入归一化

滑动向量或按钮按下 → 取主轴方向 → `Direction`。动画/结算进行中不接受新输入（FR-02）。

### P2 方向映射（R-02、M4）

```text
blueDir  = input
orangeDir = applyMapping(input, state.mapping)
```

本回合映射以**回合开始时**的 `state.mapping` 为准；本回合内切换器生效只影响后续回合。

### P3 暂停令牌消耗（M3、ADR-002）

对每个 `hasPauseToken` 的角色：清除其令牌（暂记），其本回合目标格 = 当前格（视为被自身暂停阻挡），**不**跳过回合——另一角色照常结算，动态状态照常推进（ADR-002：消耗回合）。若回合最终被 P5 取消，令牌随全量回退恢复（I6）。

### P4 单步移动意图与阻挡（M0、M2、M5、M7）

每角色每输入最多移动 1 格（I13）。候选格 `next = pos + dir`。按固定优先级判定阻挡，任一命中即该角色停留原地：

```text
blocked(actor, next, dir) =
  1. next 出界                                    // 边界
  2. next 是墙（walls 或坍塌的脆弱格）             // M0/M7
  3. next 是关闭的普通门（doors[id] == false）     // M1
  4. next 是 colorDoor 且颜色不匹配                // M2
  5. next 是未激活的 pulseDoor                    // M8
  6. 当前格是 oneWay 且 dir != oneWay.arrow        // M5：离开约束
```

出口格永不阻挡（R-05）。两角色的阻挡判定**并行**基于回合开始状态（一方停留不影响另一方候选，除非触发 P5）。

### P5 同格判定（R-04）

```text
if blueNext == orangeNext:
    整步取消：状态回到回合开始，不压栈、不计数、令牌恢复（I6），返回 applied=false
else:
    提交 blue.pos = blueNext; orange.pos = orangeNext
```

对穿（blue: A→B 且 orange: B→A）不触发同格，合法成立——这是"允许对穿交换"的构造性证明：两目标格不同。

### P6 动态结算（固定子顺序，均基于已提交位置）

| 子阶段 | 内容 | 规则出处 |
|---|---|---|
| D1 脆弱格坍塌 | 回合开始时所在格为脆弱格、且该角色**最终位置**（D2 后）不再等于该格、且该格尚未坍塌 → 记入 `fragileCollapsed`；被阻挡而停留不坍塌 | M7 |
| D2 传送 | 见 §3 传送算法 | M6 |
| D3 映射切换 | 传送后仍站在某 `switcher` 上的角色 → `state.mapping = switcher.target`；两角色站在不同 target 的切换器上 → 蓝色优先（ADR-006） | M4 |
| D4 压板与门 | 对每个 `plate`：`doors[plate.doorId] = 有角色（传送后）站在该板上`；无板联动的门保持关闭 | M1 |
| D5 同步脉冲 | 若某 `pairId` 的两个 `pulseSwitch` 本回合各被一名角色占用（传送后位置）→ `pulseDoors[pairId] = true`（闩锁，之后不回退，仅撤销可还原） | M8 |
| D6 — | （保留） | |

注意：D4/D5 读取的是 D2 之后的位置（传送落点可压板/触发脉冲）；D1 比较回合开始位置与 D2 后最终位置（移动离开或传送离开均触发坍塌，被阻挡停留不坍塌）。

### P7 胜利判定（R-05）

```text
won = (blue.pos == blueExit) AND (orange.pos == orangeExit)   // 以 D 阶段后最终位置判定
```

出口不锁定：已在出口的角色可被后续输入移走；仅回合结束时**同时**满足才 `status = WON`。

### P8 快照与计数（R-06）

回合成立时：先把**回合开始前**状态投影为 Snapshot 压 `history`，然后 `moveCount += 1`，输出 `MoveResult`。

## 3. 传送算法（D2，M6）

```text
teleporters = 站在某 portal 入口格上的角色（0、1 或 2 个）
对每个 teleporter：target = 同 portalId 的另一端坐标
判定（基于传送阶段开始时的位置）：
  a. target 出界/墙/坍塌脆弱格/关闭普通门/不匹配 colorDoor/未激活 pulseDoor → 失败，停留原地
  b. target == 另一角色的当前位置，且另一角色本阶段不传送 → 失败，停留原地
  c. target == 另一角色的当前位置，且另一角色本阶段也传送 → 两者同时交换（成功）
  d. 其余情况 → 成功，移动到 target
每角色每回合最多传送一次（I5）：落在 portal 入口格上不触发二次传送。
```

传送循环（A↔B 相邻对）因 I5 天然终止；关卡校验（阶段 09）另须保证 portal 成对、target 合法。

## 4. 撤销 / 重开结算

```text
UNDO:    history 非空 → 弹出栈顶 Snapshot 全字段恢复；否则 no-op。恢复含令牌、门、脉冲闩锁、坍塌集合、映射、计数（I4）。
RESTART: 从 LevelDef 重建初始 GameState（history 清空）。
```

两者均为纯函数：`undo(state) -> state'`、`restart(levelDef) -> state`。

## 5. 状态转移表

| 当前状态 | 事件 | 条件 | 次态 / 效果 |
|---|---|---|---|
| PLAYING | MOVE(d) | 结算成立，未达成出口 | PLAYING；moveCount+1；压快照 |
| PLAYING | MOVE(d) | 结算成立且达成双出口 | WON；同上 |
| PLAYING | MOVE(d) | P5 同格取消 | PLAYING；状态按位不变；不压栈不计数（I6） |
| PLAYING | UNDO | history 非空 | PLAYING/WON→恢复栈顶快照 |
| PLAYING/WON | UNDO | history 为空 | 无变化 |
| PLAYING/WON | RESTART | — | PLAYING；初始状态 |
| WON | MOVE(d) | — | 忽略（由表现层引导下一关/重开） |

## 6. 结算顺序无循环依赖论证

P1→P9 严格单向：P2 只读映射；P3 只读令牌；P4 只读回合开始地形/门状态（门状态由上一回合 D4 已定）；P5 只比较候选格；D1 读回合开始位置与最终位置；D2 读提交后位置并只改位置；D3/D4/D5 读 D2 后位置并只写映射/门/闩锁；P7 只读最终位置。无任何步骤输出回灌先前步骤，故无循环依赖（阶段验收门）。

## 7. 伪代码（总入口）

```text
function resolveTurn(state, input) -> MoveResult:
  d      = normalize(input)                      // P1
  blueD  = d                                     // P2
  orgD   = applyMapping(d, state.mapping)
  snap   = projectSnapshot(state)                // P8 预备（先投影）
  tokens = consumePauseTokens(state)             // P3（暂记，取消时恢复）
  bNext, bBlocked = step(state.actors.blue,  blueD, state)   // P4
  oNext, oBlocked = step(state.actors.orange, orgD, state)
  if bNext == oNext:                             // P5
      restoreTokens(state, tokens)
      return MoveResult(applied=false, ...)
  state.actors.blue.pos = bNext; state.actors.orange.pos = oNext
  collapseFragiles(state, 起始脆弱格且最终位置已离开的集合)   // D1
  teleport(state)                                // D2
  applySwitchers(state)                          // D3
  refreshDoors(state)                            // D4
  latchPulses(state)                             // D5
  state.status = checkWin(state) ? WON : PLAYING // P7
  if applied: state.history.push(snap); state.moveCount += 1  // P8
  return MoveResult(...)
```

所有函数为纯数据操作；实现（阶段 05）不得引入随机数、时钟或渲染副作用。
