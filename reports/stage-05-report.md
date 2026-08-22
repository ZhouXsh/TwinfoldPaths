# Stage 05 Report：核心移动引擎与撤销

## 结论

- 状态：通过
- 构建版本：引擎 V1.0（`src/domain` 6 模块；单文件产物仍 1.15MB，未含新资产）
- 日期：2026-08-22

## 输入与目标

- 读取基线：`prompts/05_核心移动引擎.md`、`AGENTS.md`、`docs/domain-model.md`、`docs/turn-resolution.md`、`docs/invariants.md`、`docs/examples/rule-cases.md`。
- 上一阶段出口：`reports/stage-04-report.md`（绿色工程基线，`npm run check` 为出入口）。
- 本阶段目标：实现 R-01~R-07、序列化、无限撤销的纯逻辑引擎，并以表驱动测试锁定规则；覆盖率 ≥90%。

## 实际变更

| 文件 | 变更 | 原因 |
|---|---|---|
| `src/domain/types.ts` | 重写扩展 | 全量领域类型：Actor/Entity（10 类）/LevelDef/Snapshot/GameState/MoveResult |
| `src/domain/point.ts` | 新建 | 坐标工具：DELTA、pointKey、equalsPoint、addDir、inBounds |
| `src/domain/mapping.ts` | 新建 | applyMapping（H/V_MIRROR、ROTATE_CW），仅橙生效（I9） |
| `src/domain/level.ts` | 新建 | createInitialState：门全关、脉冲未激活、映射初始化 |
| `src/domain/serialize.ts` | 新建 | canonicalJSON、FNV-1a stableHash（剔除 history）、serialize/deserialize（版本与结构校验）、projectSnapshot、cloneState |
| `src/domain/engine.ts` | 新建 | applyCommand（P1–P9 全流水线：映射→令牌→意图→同格取消→传送→坍塌→切换器→压板/门→脉冲→令牌授予→胜利→快照）、undo、restart |
| `tests/unit/domain/helpers.ts` | 新建 | makeLevel 工厂 + mulberry32 种子随机 |
| `tests/unit/domain/mapping.test.ts` | 新建 | 12 映射表驱动用例 + 完备性 |
| `tests/unit/domain/core-rules.test.ts` | 新建 | R-01~R-07 + M0 共 24 用例（GWT 编号对应） |
| `tests/unit/domain/serialization.test.ts` | 新建 | 规范化/哈希/往返/拒绝坏档 + 100 次确定性 |
| `tests/unit/domain/undo-property.test.ts` | 新建 | 300 步种子随机+全撤销深相等、I1/I2 逐步断言、双跑哈希一致 |
| `tests/unit/domain/mechanics.test.ts` | 新建 | 传送 §3 全分支（含 §3-d 与两条精化）+ M1/M2/M5/M8 阻挡面 14 用例 |
| `docs/api/domain-engine.md` | 新建 | 引擎对外 API 契约、MoveResult 语义、不变量映射、边界禁止 |
| `docs/turn-resolution.md` | 修订 | 补 D6 令牌授予；§3 增补 d 规则（双传送同目标均失败）；伪代码与论证改为"先 D2 后 D1"实现顺序 |

## 命令与证据

| 命令 | 退出码 | 关键结果 |
|---|---:|---|
| `npm test` | 0 | 6 文件 62 用例全过 |
| `npm run coverage` | 0 | `src/domain` 语句/分支/函数/行均 100%（v8 报告） |
| `npm run check` | 0 | 10 步全过（含 build、verify:dist、check-deps 11 文件） |

强制验证逐项：

- [x] domain 单测与覆盖率：62 用例；分支 100%（报告原文在命令输出，本阶段无覆盖率造假空间）。
- [x] 同一输入序列 100 次哈希一致：`serialization.test.ts` "同一序列执行 100 次" 用例，`Set` 大小断言为 1。
- [x] 随机执行并完全撤销与初始深度相等：`undo-property.test.ts` 种子 20260822、300 步，`canonicalJSON` 全等 + 撤销次数等于成立回合数。
- [x] `npm run check` 全绿。

过程中的缺陷处置（如实记录）：

1. 实现中发现规范缺漏：P6 表缺 M3 令牌授予阶段、§3 未定义"双传送目标同格"、伪代码 D1/D2 顺序与数据依赖矛盾 → 修订 `docs/turn-resolution.md`（D6、§3-d、先 D2 后 D1），引擎按修订后规范实现。
2. 测试自身缺陷两处（非引擎缺陷）：R-06 撤销循环条件读取了递减中的 `moveCount` 导致只撤销一半；R-07 序列设计触发同格取消。均修正测试并保留断言强度。
3. lint 报 `no-useless-assignment`：restart 用例补上"重开前状态已偏离"的前置断言，消除无用赋值。

## 验收门

- [x] R-01 至 R-07 全部有正常与边界测试：`core-rules.test.ts` 24 用例（含取消恢复令牌、站错出口、WON 后忽略输入等边界）。
- [x] 关键领域分支覆盖率不低于 90%，核心规则路径 100% 命中：实测 100%（含传送精化分支、脉冲闩锁、单向进入/离开、门开闭时序）。
- [x] domain 无 Phaser/DOM/localStorage 导入：`scripts/check-deps.mjs` 通过（11 文件）+ 代码审查。
- [x] 撤销恢复全部动态状态：GWT-R06-1（门/坍塌/令牌/映射/闩锁/计数全恢复）+ 随机 300 步往返深相等。

## 缺陷、风险和技术债

- 缺陷：无遗留（过程缺陷均已修复并记录）。
- 技术债：无新增。`docs/api/domain-engine.md` 记录了 `applyCommand(level, state, dir)` 与规范示例签名的差异及理由（地形查询需 LevelDef）。
- 风险：无新增。引擎已含 M1–M8 全部结算路径；阶段 07/08 的职责转为"逐机关用例扩充 + 教学关验证 + 边界加固"，不重复实现。
- 提醒：`MoveResult.blocked` 对暂停停留也记 true，表现层若需区分"被墙挡"与"暂停"，应使用 `pauseConsumed` 字段（已写入 API 文档）。

## 下一阶段输入

1. 执行 `prompts/06_前三关MVP与交互闭环.md`。
2. 引擎接入契约：`docs/api/domain-engine.md`；唯一入口 `applyCommand`，撤销 `undo`，重开 `restart`；表现层只读 `GameState` 并消费 `MoveResult`。
3. 关卡数据暂以内存对象提供（阶段 06 可用测试工厂或内联 LevelDef；正式 JSON 与校验在阶段 09）。
4. 输入归一化（滑动/按钮 → Direction）属于表现/输入层，落 `src/input`（阶段 06），归一化后只能调用 `applyCommand`。
5. 完成后更新 `.ai/project-state.md`（06 → completed）并继续阶段 07。
