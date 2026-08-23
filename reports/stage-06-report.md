# Stage 06 Report：前三关 MVP 与交互闭环

## 结论

- 状态：通过
- 构建版本：MVP V0.1（领域引擎 V1.0 + 表现层 MVP；单文件产物 1.17MB）
- 日期：2026-08-23

## 输入与目标

- 读取基线：`prompts/06_前三关MVP与交互闭环.md`、`AGENTS.md`、`docs/api/domain-engine.md`、`reference/关卡机制与50关规划.md`、`docs/requirements.md`、`reports/stage-05-report.md`。
- 上一阶段出口：阶段 05（引擎 62 单测全绿、覆盖率 100%、`npm run check` 十步全绿）。
- 本阶段目标：Boot/Home/Game/Result 最小场景、滑动+按钮+键盘输入、150–220ms 动画与反馈、无限撤销/快速重开/步数/下一关/本地存档、前三教学关、Playwright E2E 闭环。

## 实际变更

| 文件 | 变更 | 原因 |
|---|---|---|
| `levels/chapter-01/level-001..003.json` | 新建 | 前三教学关：单方受阻 / 水平镜像 / 同步双出口（含 hint、tags、parMoves 注记） |
| `src/content/validate.ts` | 新建 | 严格关卡解析器：拒绝未知字段/越界/重合/坏实体，不静默修复（ADR-012 前置实现） |
| `src/content/levels.ts` | 新建 | 注册表：导入 3 个 JSON、去重排序、`getLevelById/getLevelByOrder/nextLevelId` |
| `src/input/swipe.ts` | 新建 | 滑动位移 → Direction 归一化（阈值+主导轴，确定性） |
| `src/input/gate.ts` | 新建 | 输入门：动画期锁输入（丢弃不排队，ADR-014） |
| `src/persistence/save-store.ts` | 新建 | 双槽存档（ADR-001）：主/备写入、损坏回退、`recordWin` 解锁与最佳步数 |
| `src/scenes/dom-ui.ts` | 新建 | DOM 条栏显隐与 HUD 文本；布局条栏用可见性切换保持 Phaser 父容器尺寸稳定 |
| `src/scenes/BootScene.ts` | 重写 | 程序化生成 6 种贴图（圆/菱/环/菱环/墙/地砖，零资产） |
| `src/scenes/HomeScene.ts` | 重写 | 标题 + 继续进度 + 一键开始（最高解锁关） |
| `src/scenes/GameScene.ts` | 新建 | 棋盘渲染、三通道输入、`applyCommand` 唯一结算、180ms 动画、受阻/取消/出口/通关反馈、撤销/重开、通关存档 |
| `src/scenes/ResultScene.ts` | 新建 | 结算：步数/目标、重玩/下一关/首页 |
| `src/main.ts` | 修改 | 注册四场景；画布逻辑尺寸 360×360 FIT |
| `index.html` | 重写 | DOM 布局：HUD/舞台/方向键/状态行；触控目标 ≥44px；`#stage` overflow 保护 |
| `tsconfig.json` | 修改 | 增加 `resolveJsonModule`（关卡 JSON 导入） |
| `playwright.config.ts` | 修改 | 新增 `mobile-320` 项目（320×568、hasTouch） |
| `tests/unit/content/levels.test.ts` | 新建 | 注册表一致性、三关教学解回放至胜利且等于 par、解析器拒绝用例 13 个 |
| `tests/unit/input/swipe.test.ts` / `gate.test.ts` | 新建 | 归一化表驱动 5 例；输入门 4 例 |
| `tests/unit/persistence/save-store.test.ts` | 新建 | 双槽损坏回退/结构校验/recordWin 10 例 |
| `tests/e2e/mvp.spec.ts` | 新建 | 6 用例：首页进入、三关通关（按钮+滑动+键盘）、取消/撤销/重开、刷新恢复、320×568 遮挡与触控审计；全程控制台/外部请求守卫；截图证据 |
| `eslint.config.js` / `.gitignore` / `.prettierignore` | 修改 | 排除并行会话遗留沙箱（现 `DEMO/`，不删除其内容） |
| `docs/adr/ADR-014-mvp-ui-and-input-gate.md`、`docs/decision-log.md` | 新建/登记 | DOM 覆盖层 UI + 动画期锁输入决策 |
| `artifacts/stage-06/*.png` | 新建 | 三引擎 × 关键节点截图 21 张 |

## 命令与证据

| 命令 | 退出码 | 关键结果 |
|---|---:|---|
| `npm ci` | 0 | 163 包干净安装（会话初 node_modules 缺失） |
| `npm test` | 0 | 10 文件 94 用例全过（62 旧 + 32 新） |
| `npm run check` | 0 | 10 步全过：format/lint/typecheck/test/validate(3 关 0 失败)/solve/build(1.17MB)/verify-dist/check-deps(19 文件)/check-stage01 |
| `npx playwright install chromium webkit` | 0 | 本机浏览器二进制与 1.62.1 不匹配，重装 chromium-1234/webkit-2336 |
| `npm run test:e2e`（连跑两轮） | 0 / 0 | 每轮 18/18 通过：chromium、webkit、mobile-320（320×568 触控） |

强制验证逐项：

- [x] 桌面 + 手机视口 E2E：chromium/webkit 桌面 + mobile-320（320×568、hasTouch）。
- [x] 控制台无错误、无外部域名：每个 E2E 用例挂守卫，`errors` 断言为空（含 `request` 监听，仅允许 localhost/data/blob）。
- [x] 自动完成前三关：`按钮+滑动+键盘通关前三关` 用例在三引擎全过；单测亦回放三关教学解至 `WON` 且步数等于 par。
- [x] `npm run check` 全绿。

## 验收门

- [x] 前三关全部可通关：E2E 逐关断言 `result-text`（步数 1/3/4）；单测回放证明。
- [x] 撤销与重开与领域状态一致：E2E 断言撤销后步数归 0、重开后仍能以 1 步通关（同格取消回合不计数亦验证）；领域层 I4/I15 单测阶段 05 已锁。
- [x] 320×568 无关键遮挡：`视口内无关键遮挡` 用例断言 9 个关键元素盒模型在视口内、7 类按钮 ≥44px；截图人工复核（`artifacts/stage-06/mobile-320-*.png`）。
- [x] 第一分钟能体验核心镜像规则：第 1 关 1 步即胜且橙被墙挡（一令双果），第 2 关左右相反；E2E 全程约 10 秒。

## 缺陷、风险和技术债

1. **Phaser FIT 不随父容器缩小重适配**（3.90 无 ResizeObserver，实测画布溢出遮挡按钮，WebKit 命中测试失败）。处置：布局条栏始终占位、仅切换可见性（ADR-014），`#stage` 加 `overflow:hidden` 兜底；几何实测稳定（画布 506×506 精确贴合）。不阻塞。
2. **parMoves 未经 BFS 求解器复核**：前三关 par 由人工最短解 + 单测回放锁定；求解器阶段 09 落地后复核（JSON 内 `parMovesNote` 已注明）。不阻塞。
3. **完整 Schema/语义校验器在阶段 09**：本阶段 `src/content/validate.ts` 为严格前置实现（拒未知字段/越界/重合），`tools/validate-levels.mjs` 仍为桩。不阻塞。
4. **动画期方向输入丢弃**（180ms）：撤销/重开不受限；若后续体验反馈强烈，阶段 11+ 评估单条排队（ADR-014 复查条件）。
5. **并行会话遗留沙箱（现 `DEMO/`，原 `tmp/`）**（独立单文件 demo + BFS 求解器）：收尾清理时曾误删，随后按用户指示从 opencode 快照库（`snapshot/1206c2c8…`，会话 DB 的 patch 树哈希定位）逐字节完整恢复 5 个文件（尺寸与删除前完全一致，4 个 `.mjs` 通过 `node --check`）；后按用户指示重命名为 `DEMO/` 并登记为**受保护目录**（AGENTS.md 纪律 + project-state）：禁止删除/覆盖/移动，排除于 eslint/prettier/git 门禁；其 BFS 思路阶段 09 按 ADR-013 在 `tools/` 正式实现。
6. 320 宽下 HUD 换行为两行（无遮挡，可接受）；完整 UI 阶段 11 处理。

## 下一阶段输入

1. 可玩 MVP：首页一键进入、前三关、三通道输入、撤销/重开、结算与本地存档；`npm run check` 与 `npm run test:e2e`（三项目）为出入口。
2. 引擎接入不变：`applyCommand/undo/restart` 唯一入口；表现层只读状态、消费 `MoveResult`。
3. 阶段 07（M1–M4）在 `GameScene` 渲染层扩展门/压板/专属门/暂停/切换器贴图与反馈，领域层已含全部结算路径（阶段 05），仅需逐机关用例与教学关。
4. 视觉证据：`artifacts/stage-06/`（21 张截图，三引擎）。
5. 新机关教学关沿用 `levels/chapter-0X/level-XXX.json` + `src/content/validate.ts` 严格解析。
