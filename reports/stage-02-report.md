# Stage 02 Report：规则形式化与状态模型

## 结论

- 状态：通过
- 构建版本：无代码构建（本阶段产出规范文档与伪代码，禁止实现代码）
- 日期：2026-08-22

## 输入与目标

- 读取基线：`prompts/02_规则形式化与状态模型.md`、`AGENTS.md`、`docs/requirements.md`、`docs/decision-log.md`（ADR-001~004）、`reference/关卡JSON_Schema.md`。
- 上一阶段出口：`reports/stage-01-report.md`（V1.0 需求基线冻结）。
- 本阶段目标：建立唯一回合结算规范（开发/求解器/撤销/测试共用事实来源）、不变量表、可序列化状态模型与规则用例。

## 实际变更

| 文件 | 变更 | 原因 |
|---|---|---|
| `docs/domain-model.md` | 新建 | Direction/Point/MappingMode/ActorState/Entity/LevelDef/GameState/MoveResult/Snapshot 类型；canonicalJSON 与 FNV-1a 稳定哈希；版本字段（LevelDef.schemaVersion、GameState.version、存档版本） |
| `docs/turn-resolution.md` | 新建 | 结算流水线 P1–P9（归一化→映射→令牌→单步意图→同格判定→D1–D6 动态→胜利→快照）；传送算法 4 分支；状态转移表；无循环依赖论证；伪代码 |
| `docs/invariants.md` | 新建 | I1–I19 不变量（含测试层级），并给出 R-01~R-07、M0~M8 的覆盖核对 |
| `docs/examples/rule-cases.md` | 新建 | Given/When/Then 用例 49 例：R-01~R-07 共 18、M0~M8 共 27、交叉机制 4；覆盖正常/边界/冲突，含单方受阻、对穿交换、提前到达出口 |
| `docs/decision-log.md` | 更新 | 新增 ADR-005（暂停令牌上限 1）、ADR-006（切换器蓝色优先、传送失败停留、互传交换） |
| `.ai/project-state.md` | 更新 | 阶段 02 → completed |

## 命令与证据

| 命令 | 退出码 | 关键结果 | 证据路径 |
|---|---:|---|---|
| `node scripts/check-stage01.mjs` | 0 | `检查文件数: 41；需求表定义编号: 31, 矩阵映射编号: 31；PASS`（含新增 4 份文档的内链检查） | 本报告 |
| 文档自审（人工交叉核对） | — | 发现并修正 1 处边界缺陷：D1 脆弱格坍塌原措辞"移动前的 pos"会把"被阻挡停留在脆弱格上"误判为坍塌；修正为"回合开始位置且最终位置（D2 后）不再等于该格"；同步修订伪代码、无循环依赖论证与 GWT-X-2 | `docs/turn-resolution.md`、`docs/examples/rule-cases.md` |

## 验收门

- [x] 所有规则都有确定结果：R-01~R-07 与 M0~M8 逐条有 GWT 用例（49 例）；不变量表给出 R 与 M 的全覆盖核对；两处未定义行为（令牌上限、切换器/传送冲突）已以 ADR-005/006 定死。
- [x] 结算顺序不存在循环依赖：`docs/turn-resolution.md` §6 给出逐步数据流论证（每阶段只读先前阶段输入，无回灌）。
- [x] 状态模型足以表示 M0–M8：`docs/domain-model.md` §3 逐机制列出实体与动态字段；撤销/哈希字段（令牌、门、闩锁、坍塌集合、映射）齐备。
- [x] 领域模型不依赖表现层：全部类型为纯数据；`MoveResult` 仅供渲染消费，规范明确"渲染层不得据此修改 GameState"；无 Phaser/DOM/音频引用。

强制验证：

- [x] 逐条规则有 Given/When/Then 表示（`docs/examples/rule-cases.md`）。
- [x] 同一格（GWT-R04-2/3）、对穿（GWT-R04-1）、门关闭时序（GWT-M1-2/3）、传送循环（GWT-M6-4 + I5）、撤销（GWT-R06-1~3、I4/I19）均无未定义状态。
- [x] 模型可序列化且不含渲染对象：canonicalJSON 约束 + I8；history 排除于哈希之外。

## 缺陷、风险和技术债

- 缺陷（已修复）：D1 坍塌边界措辞缺陷，修复于本阶段（见命令与证据）。
- 技术债 TD-03（低，新）：阶段 03 提示词要求 `docs/adr/ADR-001-technology-stack.md` 等文件，与 `docs/decision-log.md` 现有 ADR-001~006 编号体系冲突；阶段 03 必须统一（建议 `docs/adr/` 从 ADR-007 续号，decision-log 索引同步），已写入 `.ai/project-state.md` 下一步。
- 风险：无新增；RISK-04（求解器状态空间）因 I8 稳定哈希与 ADR-005 布尔令牌得到缓解。

## 下一阶段输入

1. 执行 `prompts/03_技术架构与实施计划.md`（本会话已读取）。
2. 关键输入文件：`docs/requirements.md`、`docs/domain-model.md`、`docs/turn-resolution.md`、`docs/invariants.md`、`docs/examples/rule-cases.md`、`docs/risk-register.md`。
3. 架构必须满足：`src/domain` 零外部依赖（无 Phaser/DOM）；关卡数据与代码分离；状态可序列化/哈希/克隆以支持 BFS 与存档；单文件离线构建（`dist/index.html`）。
4. 处理 TD-03：统一 ADR 编号（`docs/adr/` 目录建议从 ADR-007 续号）。
5. 完成后更新 `.ai/project-state.md`（03 → completed）并继续阶段 04。
