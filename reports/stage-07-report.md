# Stage 07 Report：基础机关 M1–M4

## 结论

- 状态：通过
- 构建版本：MVP V0.2（领域引擎 V1.1：M3 授予语义修订 ADR-015；表现层含 M1–M4 渲染与映射标签；11 关；单文件产物 1.18MB）
- 日期：2026-08-24

## 输入与目标

- 读取基线：`prompts/07_基础机关M1至M4.md`、`AGENTS.md`、`docs/turn-resolution.md`、`reference/关卡机制与50关规划.md`、`reference/关卡JSON_Schema.md`、`reports/stage-06-report.md`。
- 上一阶段出口：阶段 06（MVP 三关可玩、E2E 三引擎、`npm run check` 十步全绿）。
- 本阶段目标：M1 压板/门、M2 专属门、M3 暂停格、M4 映射切换器的逐机关用例、教学关与渲染反馈；机制进入 GameState/哈希/序列化/撤销；组合顺序集成测试。

## 实际变更

| 文件 | 变更 | 原因 |
|---|---|---|
| `levels/chapter-02/level-011.json` | 新建 | M1 教学关"压板开门"（par 5，解 LEFT×3、UP、RIGHT） |
| `levels/chapter-02/level-015.json` | 新建 | M0+M1 组合"墙体与门"（par 7） |
| `levels/chapter-02/level-016.json` | 新建 | M2 教学关"角色专属门"（par 3） |
| `levels/chapter-02/level-017.json` | 新建 | M1+M2 组合"两类门的顺序"（par 5） |
| `levels/chapter-03/level-021.json` | 新建 | M3 教学关"暂停令牌"（par 4） |
| `levels/chapter-03/level-023.json` | 新建 | M1+M3 组合"暂停压板协作"（par 4） |
| `levels/chapter-03/level-026.json` | 新建 | M4 教学关"垂直镜像切换"（par 4） |
| `levels/chapter-03/level-029.json` | 新建 | M1+M4 组合"映射决定开门"（par 4） |
| `src/domain/engine.ts` | 修改 | D6 令牌授予追加"本回合新抵达"条件（ADR-015）：停留不重授，消除暂停格永久冻结 |
| `docs/decision-log.md` | 登记 | ADR-015：M3 令牌授予时机（抵达授予 vs 驻留重授），含候选/证据/后果/复查条件 |
| `docs/turn-resolution.md` | 修改 | D6 行与 §7 伪代码注释按 ADR-015 修订 |
| `docs/domain-model.md` | 修改 | `pauseTile` 实体表按 ADR-015 修订 |
| `src/content/levels.ts` | 修改 | 注册 8 关；新增 `levelLinearIndex`（ADR-004 线性解锁的全局序号） |
| `src/persistence/save-store.ts` | 修改 | `SAVE_VERSION` 2：`highestUnlocked` 由章内 order 改为全局线性序号（稀疏编号不破坏解锁链） |
| `src/scenes/HomeScene.ts` | 修改 | 继续进度按线性序号取 `LEVELS[index-1]` |
| `src/scenes/GameScene.ts` | 修改 | 实体渲染（压板/门/专属门/暂停格/切换器）、门开闭与压板高亮由 `GameState` 驱动、暂停令牌徽章、映射标签同步、暂停消耗/映射切换状态行反馈、`recordWin` 用线性序号 |
| `src/scenes/BootScene.ts` | 修改 | 新增 10 种程序化贴图：plate、door-closed/open、colordoor-blue/orange（颜色+形状+纹理三重编码）、pausetile、switcher-H/V/R、token |
| `src/scenes/dom-ui.ts` | 修改 | 新增 `setMappingLabel`（M4：界面始终显示当前映射） |
| `index.html` | 修改 | HUD 新增 `#mapping-label`（data-testid=mapping-label） |
| `tests/unit/domain/mechanics-m1m4.test.ts` | 新建 | 25 用例：M1 时序/重推导/无板门/撤销；M2 双向阻挡/各走各门；M3 获取/消耗/不重授/取消恢复/双令牌/撤销；M4 切换时序/三映射/蓝优先/持续/撤销；M1+M3、M1+M4、D3+D4 组合；序列化与稳定哈希 |
| `tests/unit/content/levels.test.ts` | 修改 | 11 关注册表、11 关教学解回放至胜利且步数=par、标签完整性、线性序号 |
| `tests/unit/persistence/save-store.test.ts` | 修改 | v2 语义：拒绝 v1 旧存档、稀疏线性序号解锁 |
| `tests/e2e/mvp.spec.ts` | 修改 | 前三关回归后进入 2-11 并完整通关（按钮）、映射标签断言；新增 M2/M3/M4 渲染视觉证据用例与 M4 标签实时切换/撤销用例；截图改存 `artifacts/stage-07/` |
| `docs/mechanics/M1-M4.md` | 新建 | 机制手册：语义、表现编码、组合顺序、测试地图、关卡清单与人工已知解 |
| `artifacts/stage-07/*.png` | 新建 | 三引擎截图 39 张（含门开启、专属门、暂停格、切换器、映射标签） |

## 命令与证据

| 命令 | 退出码 | 关键结果 |
|---|---:|---|
| `npm test` | 0 | 11 文件 121 用例全过（94 旧 + 27 新/改：mechanics-m1m4 25、levels/save-store 更新） |
| `npm run check` | 0 | 10 步全过：format/lint/typecheck/test/validate(11 关 0 失败)/solve/build(1.18MB)/verify-dist/check-deps(19 文件)/check-stage01 |
| `npm run test:e2e`（最终配置连跑两轮） | 0 / 0 | 每轮 24/24：chromium、webkit、mobile-320；含 2-11 通关、M4 标签切换、渲染证据 |

强制验证逐项：

- [x] 逐机制正常、边界、撤销和组合测试：`mechanics-m1m4.test.ts` 25 用例全绿。
- [x] 每个教学关求出人工已知解：8 关解法写入 `levels.test.ts` 回放至 `WON` 且步数=par（见 `docs/mechanics/M1-M4.md` 清单）。
- [x] 前 3 关回归：单测回放 + E2E 三引擎"前三关并进入首个机关关"用例全绿。
- [x] `npm run check` 全绿。

## 验收门

- [x] 门的时序无歧义：P4 读回合开始门状态（踩板与穿门不可同回合）、离开即回合末关闭、每回合末重推导（I11）、关门后返回被阻——均有单测；E2E 2-11 通关佐证。
- [x] 暂停令牌可撤销：M3 撤销用例 + 多机制序列完全撤销（canonicalJSON/stableHash 与初始逐字段相等）+ 随机序列属性测试（阶段 05）保持全绿。
- [x] 映射切换可见且可序列化：HUD `#mapping-label` 常驻并在进关/回合末/撤销/重开同步；E2E 断言 3-26 踩切换器后标签实时变"垂直镜像"、撤销回"水平镜像"；序列化/哈希用例覆盖 mapping 字段。
- [x] M1–M4 不破坏 R-01 至 R-07：core-rules/undo-property/serialization/levels 全绿（121 用例），E2E 前三关回归三引擎通过。

## 缺陷、风险和技术债

1. **ADR-015（M3 授予时机）追溯修订阶段 05 引擎**：原字面实现（驻留重授）会使站上暂停格的角色每次输入都被暂停、永久无法离开，与机制词典"获得一次…消耗"及 50 关 M3 设计矛盾；已登记 ADR-015 改为"抵达授予、停留不重授"，同步修订 `turn-resolution.md`/`domain-model.md` 与测试。复查条件：阶段 10 若需"驻留补令牌"谜题重开。
2. **多压板联动同一 `doorId` 语义未形式化**：当前实现按实体数组顺序覆写（非 OR）。阶段 07 关卡保持 1:1；阶段 09 校验器须禁止多板同门或以 ADR 定义 OR 语义。已写入 `docs/mechanics/M1-M4.md`。
3. **parMoves 仍为人工最短解 + 单测回放锁定**：BFS 复核在阶段 09（各关 `parMovesNote` 已注明）。不阻塞。
4. **存档 v2 使 v1 旧存档按损坏回退默认值**：开发期无真实玩家数据，直接升版；若后续存在真实用户需迁移策略。不阻塞。
5. **完整 Schema/语义校验器与 BFS 求解器仍为桩**（阶段 09，ADR-012/013）。不阻塞。
6. **真人试玩未进行**（阶段 14 职责），本阶段仅自动化与截图证据。

## 下一阶段输入

1. 11 关注册表（ch1: 1–3；ch2: 11/15/16/17；ch3: 21/23/26/29），编号对齐 50 关规划，空档由阶段 10 补齐。
2. M1–M4 领域语义冻结（含 ADR-015）；表现层实体渲染与映射标签模式可复用于 M5–M8。
3. `docs/mechanics/M1-M4.md` 机制手册与测试地图。
4. 出入口不变：`npm run check` + `npm run test:e2e`（三项目）全绿。
