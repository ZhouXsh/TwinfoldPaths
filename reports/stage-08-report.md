# Stage 08 Report：高级机关 M5–M8

## 结论

- 状态：通过
- 构建版本：MVP V0.3（领域引擎 V1.2：ADR-016 坍塌对穿精化 + `MoveResult.reason` 阻挡原因；M5–M8 渲染与状态行反馈；19 关；单文件产物 1.19MB）
- 日期：2026-08-24

## 输入与目标

- 读取基线：`prompts/08_高级机关M5至M8.md`、`AGENTS.md`、`docs/mechanics/M1-M4.md`、`docs/invariants.md`、`reference/关卡机制与50关规划.md`、`reports/stage-07-report.md`。
- 上一阶段出口：阶段 07（M1–M4 语义冻结、11 关、`npm run check` + E2E 24/24 全绿）。
- 本阶段目标：M5 单向格、M6 传送门、M7 脆弱格、M8 同步脉冲的边界正确性证明（无循环、无重复触发、无撤销缺失）、教学/组合关、渲染反馈、机制手册。

## 实际变更

| 文件 | 变更 | 原因 |
|---|---|---|
| `src/domain/engine.ts` | 修改 | ① D1 追加占位判定（ADR-016）：对穿/传送落点占据离开者的脆弱格时不坍塌，修复"角色站在已坍塌格上"的 I1 违例；② `obstructionReason` 输出阻挡原因，`proposeStep`/`MoveResult` 携带 `reason`（M5 反馈与墙区分） |
| `src/domain/types.ts` | 修改 | 新增 `BlockReason` 类型；`ActorMoveInfo.reason: BlockReason \| null` |
| `docs/decision-log.md` | 登记 | ADR-016：M7 坍塌对穿精化（D2 后格上有角色则不坍塌），含候选/证据/后果/复查条件 |
| `docs/turn-resolution.md` | 修改 | D1 行追加占位条件；P4 追加阻挡原因输出说明；§7 伪代码同步 |
| `docs/invariants.md` | 修改 | I12 精化（占位不坍塌） |
| `docs/domain-model.md` | 修改 | §8 `MoveResult` 追加 `BlockReason`/`reason`；`fragile` 实体语义注记 ADR-016 |
| `docs/api/domain-engine.md` | 修改 | `MoveResult.reason` 契约与 I12 说明 |
| `tests/unit/domain/mechanics-m5m8.test.ts` | 新建 | 37 用例：M5 离开约束/阻挡原因/优先级/映射交互/传送落点；M6 传送链单跳、互传往返、门口碰撞 6 分支、落点触发 D3/D4/D5/D6；M7 坍塌时机、坍塌对穿与传送落点占位反例（ADR-016）、撤销/重开/存档往返；M8 同回合/错回合/占用语义/闩锁不回退/仅撤销还原/多配对独立；综合序列撤销、stableHash 覆盖、快照隔离（I19）、全字段序列化往返 |
| `tests/unit/domain/undo-property.test.ts` | 修改 | 随机序列属性追加"不站在已坍塌脆弱格上"（I1、ADR-016 回归） |
| `levels/chapter-04/level-031.json` | 新建 | M5 教学"顺箭而行"（par 7） |
| `levels/chapter-04/level-034.json` | 新建 | M4+M5 组合"映射与离向"（par 5） |
| `levels/chapter-04/level-036.json` | 新建 | M6 教学"穿墙之门"（par 3） |
| `levels/chapter-04/level-038.json` | 新建 | M5+M6 组合"传送接单向"（par 3） |
| `levels/chapter-05/level-041.json` | 新建 | M7 教学"脆弱之桥"（par 5） |
| `levels/chapter-05/level-044.json` | 新建 | M5+M7 组合"不可回头路"（par 6） |
| `levels/chapter-05/level-046.json` | 新建 | M8 教学"同步脉冲"（par 6） |
| `levels/chapter-05/level-047.json` | 新建 | M3+M8 组合"暂停调节同步"（par 6） |
| `src/content/levels.ts` | 修改 | 注册 8 关（共 19 关） |
| `tests/unit/content/levels.test.ts` | 修改 | 19 关注册表、8 关教学解回放至胜利且步数=par、tutorial 标签、线性序号（031→12、047→19）、nextLevelId 链 |
| `src/scenes/BootScene.ts` | 修改 | 新增 10 种程序化贴图：oneway-UP/DOWN/LEFT/RIGHT（箭头形状编码方向）、portal、fragile、fragile-collapsed、pulseswitch、pulsedoor-closed/open |
| `src/scenes/GameScene.ts` | 修改 | M5–M8 实体渲染；脆弱格/脉冲门/脉冲开关由 `GameState` 驱动同步；单向格阻挡用原地抖动+状态行（与墙区分）；传送淡入；状态行事件：传送/坍塌/脉冲闩锁/单向阻挡/脉冲门未激活 |
| `tests/e2e/mvp.spec.ts` | 修改 | 新增 4 条机关用例（4-31 单向反馈+通关、4-36 传送通关、5-41 坍塌+撤销恢复+通关、5-46 脉冲通关）+ M5–M8 渲染证据 8 关；截图目录改 `artifacts/stage-08/` |
| `docs/mechanics/M5-M8.md` | 新建 | 机制手册：语义、表现编码、组合顺序、测试地图、关卡清单、阶段 09 校验器输入 |
| `artifacts/stage-08/*.png` | 新建 | 三引擎截图 69 张（含单向格、传送门、脆弱格坍塌/撤销、脉冲开关与门、映射切换组合） |

## 命令与证据

| 命令 | 退出码 | 关键结果 |
|---|---:|---|
| `npm test` | 0 | 12 文件 158 用例全过（121 旧 + 37 新；undo-property 强化 1 用例） |
| `npm run check` | 0 | 10 步全过：format/lint/typecheck/test/validate(19 关 0 失败)/solve/build(1.19MB)/verify-dist/check-deps(19 文件)/check-stage01 |
| `npm run test:e2e`（连跑两轮） | 0 / 0 | 每轮 39/39：chromium、webkit、mobile-320（13 用例×3 项目） |

强制验证逐项：

- [x] 传送循环被阻止：三入口传送链每回合仅一跳（回合 1→(2,2)、回合 2→(4,4)、回合 3 回到 (0,0)）；相邻互传对 A↔B 每回合确定性往返；落点为另一入口不二次传送（I5，`mechanics-m5m8.test.ts`"M6 传送：循环终止"组 + 阶段 05 GWT-M6-4）。
- [x] 脆弱格撤销、重开、存档往返：撤销逐步恢复坍塌集合（canonicalJSON 与初始全等）、重开清空、`serialize→deserialize` 后坍塌集合保留且仍可撤销（"M7 脆弱格：撤销、重开与存档往返"组）。
- [x] 同步脉冲同回合与错回合：同回合双抵达闩锁；驻留+抵达闩锁（占用语义，D5）；错回合先后占据从不闩锁；闩锁离开不回退、仅撤销还原（"M8 同步脉冲"组 4 用例 + 阶段 05 GWT-M8-1/2/3）。
- [x] 全部规则回归：158 单测 + 39 E2E 全绿（含前三关回归、同格取消、撤销/重开、刷新续关）。

## 验收门

- [x] M5–M8 都有可解释的教学关：4-31（单向）、4-36（传送）、5-41（脆弱）、5-46（脉冲）教学解回放至胜利且步数=par，关卡 `hint.focus` 一句话点题；4 个组合关（34/38/44/47）各锁定一种机制交互。画面识别不依赖长文本：箭头形状编码方向、裂纹/碎屑区分脆弱格完整与坍塌、品红按钮/栅栏为脉冲家族。
- [x] 所有动态字段进入快照和哈希：`fragileCollapsed`、`pulseDoors` 自阶段 05 已在 `Snapshot`/`stableHash`/`serialize` 中；本阶段补测试证明——坍塌/闩锁变化即哈希变化、篡改恢复状态不污染 history 快照（I19）、全字段序列化往返哈希一致。
- [x] 不存在单回合无限触发：传送单跳由结算结构保证（`teleportActors` 单次调用，无冷却状态、不序列化）；脉冲闩锁幂等（只置真）；坍塌幂等（已坍塌跳过）；传送链/互传对用例锁定。
- [x] 完整测试与构建通过：`npm run check` 10 步全绿；`npm run test:e2e` 两轮各 39/39。

## 缺陷、风险和技术债

1. **发现并修复 I1 违例（坍塌对穿）**：阶段 05 字面实现下，对穿交换或传送落点占据离开者的脆弱格时，该格坍塌而角色仍站在其上。已按 ADR-016 精化为"D2 后格上无角色才坍塌"，反例测试入 `mechanics-m5m8.test.ts`，随机属性测试追加"不站坍塌格"。复查条件：阶段 10 若需"脚下碎裂"谜题重开。
2. **同格多传送入口按 `entities` 数组顺序取第一个**：引擎行为确定（I3）但关卡语义含糊；阶段 09 校验器应禁止入口重叠、portal 不成对（已写入 `docs/mechanics/M5-M8.md` 阶段 09 输入）。
3. **M8 为占用语义（非"本回合新抵达"）**：一方此前驻留、另一方本回合抵达同样闩锁。与冻结规范 `turn-resolution.md` D5 一致，已在手册中显式说明；阶段 10 设计"必须同时踏上"谜题时须知晓此语义。
4. **`oneWay`/`portal` 压在出口上的关卡合法性未形式化**：出口永不锁定（R-05）与"站上入口即传送"可能冲突；本阶段关卡均未使用，留阶段 09 校验器禁止。
5. **parMoves 为人工解 + 临时 BFS 复核一致**：设计期用一次性 BFS（测试形态，交付前已删除）证明 8 关最优解与宣称 par 一致；正式求解器仍在阶段 09（ADR-013）。不阻塞。
6. **真人试玩未进行**（阶段 14 职责），本阶段仅自动化与截图证据。

## 下一阶段输入

1. 19 关注册表（ch1: 1–3；ch2: 11/15/16/17；ch3: 21/23/26/29；ch4: 31/34/36/38；ch5: 41/44/46/47），编号对齐 50 关规划，空档由阶段 10 补齐。
2. **完整 M0–M8 机制系统**：领域引擎 `applyCommand`/`undo`/`restart` + `stableHash`（含全动态字段）为阶段 09 BFS 求解器的唯一结算入口；10 类实体全部有解析、渲染与测试覆盖。
3. `docs/mechanics/M1-M4.md` + `docs/mechanics/M5-M8.md` 机制手册与测试地图；M5-M8.md 末尾列出阶段 09 校验器必须禁止的 4 类关卡结构。
4. 出入口不变：`npm run check` + `npm run test:e2e`（三项目）全绿。
