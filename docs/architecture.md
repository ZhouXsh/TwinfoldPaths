# 技术架构（Architecture）V1.0（已冻结）

> 冻结日期：2026-08-22。输入：`docs/requirements.md`、`docs/domain-model.md`、`docs/turn-resolution.md`、`docs/risk-register.md`。决策依据见 `docs/adr/`（ADR-007~013）。变更须走 `docs/decision-log.md`。

## 1. 技术栈（冻结）

| 项          | 选择                                                               | 决策出处  |
| ----------- | ------------------------------------------------------------------ | --------- |
| 语言        | TypeScript（`strict`，禁止无理由 `any`）                           | AGENTS.md |
| 构建        | Vite + `vite-plugin-singlefile`（单文件产物 `dist/index.html`）    | ADR-009   |
| 渲染/表现   | Phaser 3（最新 3.x 稳定版，阶段 04 安装时精确锁版本）              | ADR-007   |
| 单元测试    | Vitest                                                             | ADR-007   |
| E2E         | Playwright（Chromium + WebKit）                                    | ADR-007   |
| Lint/格式   | ESLint（TS 规则）+ Prettier                                        | ADR-007   |
| 包管理器    | npm（`--save-exact` 锁版本，提交 `package-lock.json`）             | ADR-007   |
| Schema 校验 | 手写 TS 校验器为运行时事实；`schemas/level.schema.json` 为对外工件 | ADR-012   |
| 音频        | WebAudio 程序化合成，零音频资产                                    | ADR-011   |
| 状态管理    | 无框架：纯函数领域层 + Snapshot 撤销栈                             | ADR-010   |

禁止：后端、在线服务、CDN、远程字体/音频、运行时密钥、追踪脚本（NFR-06/08）。

## 2. 目录结构（冻结）

```text
TwinfoldPaths/
├─ src/
│  ├─ domain/          # 纯逻辑：types、mapping、step、resolve、undo、score。零外部导入
│  ├─ content/         # 关卡加载与校验：levelTypes、validator、registry（导入 levels/*.json）
│  ├─ persistence/     # 存档/设置双槽（ADR-001）；仅依赖 domain 类型
│  ├─ input/           # 手势/按钮归一化 → Direction；仅依赖 domain 类型
│  ├─ audio/           # WebAudio 程序化音效（ADR-011）；叶子模块
│  ├─ telemetry/       # 开发版本地遥测（FR-11）；叶子模块
│  ├─ presentation/    # Phaser 渲染辅助（网格、角色、机关贴图生成）；只读 domain 状态
│  ├─ scenes/          # Phaser 场景：Boot、Home、ChapterSelect、LevelSelect、Game、Result、Settings
│  └─ main.ts          # 组合根：创建 Phaser.Game，装配依赖
├─ levels/             # 关卡 JSON（chapter-1..5/level-XXX.json），与代码分离
├─ schemas/            # level.schema.json（导出工件）
├─ tools/              # Node 脚本：validate-levels、solve-levels、difficulty-report（仅依赖 domain+content）
├─ tests/              # vitest 单元（镜像 src 结构）；playwright e2e（tests/e2e/）
├─ scripts/            # 工程脚本：check-deps、check-stage01、verify-dist
├─ docs/、reports/、artifacts/、.ai/
└─ dist/               # 构建产物（不入 Git 的仅产物目录策略见阶段 04）
```

### 单向依赖规则（架构不变量）

```text
domain ──► (无)                     # 禁止导入 phaser、DOM、localStorage、音频
content ──► domain
persistence ──► domain
input ──► domain
audio、telemetry ──► (无)
presentation ──► domain（只读）、phaser
scenes ──► domain、content、persistence、input、audio、telemetry、presentation
tools ──► domain、content（Node 环境；禁止 phaser/DOM）
tests ──► 与被测模块同边界
main.ts ──► 全部（唯一允许的组合点）
```

机器检查：`scripts/check-deps.mjs`（本阶段引入，阶段 04 起纳入 `check` 门禁）。规则：

1. `src/domain/**` 的 import 只能来自 `src/domain/**`（或相对同层），禁止出现 `phaser`、`localStorage`、`document`、`window`、`Audio` 等字样。
2. `tools/**` 禁止导入 `phaser` 或引用 DOM。
3. `src/persistence` 禁止导入 `phaser`。

## 3. 场景定义（Phaser Scenes）

| 场景          | 职责                                                     | 进入                     | 退出                          |
| ------------- | -------------------------------------------------------- | ------------------------ | ----------------------------- |
| Boot          | 程序化生成贴图/音频缓冲、读档（ADR-001 双槽）、进入 Home | 冷启动                   | Home                          |
| Home          | 标题、继续游戏（最高解锁关）、章节选择、设置入口         | Boot/其他                | ChapterSelect、Game、Settings |
| ChapterSelect | 5 章入口（含主题与进度摘要）                             | Home                     | LevelSelect                   |
| LevelSelect   | 章内 10 关；未解锁置灰（ADR-004）；最佳步数/星级展示     | ChapterSelect            | Game                          |
| Game          | 棋盘渲染、输入、结算、撤销/重开/提示、暂停菜单           | LevelSelect/Home（继续） | Result、LevelSelect           |
| Result        | 步数、星级、重玩/下一关/返回                             | Game（胜利）             | Game、LevelSelect             |
| Settings      | 音乐/音效/振动/弱化动画开关（FR-10）、遥测导出（开发版） | Home                     | Home                          |

场景间只传引用数据（关卡 ID），不传逻辑状态；逻辑状态由 Game 场景内持有的 `GameState` 管理（ADR-010）。

## 4. 质量命令（npm scripts，阶段 04 落地）

| 命令              | 工具                           | 预期                                                                                                                                 |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `format`          | prettier --write               | 全库格式化，退出码 0                                                                                                                 |
| `lint`            | eslint                         | 0 error（warn 须有豁免记录）                                                                                                         |
| `typecheck`       | tsc --noEmit                   | 0 错误                                                                                                                               |
| `test`            | vitest run                     | 全绿                                                                                                                                 |
| `coverage`        | vitest run --coverage          | domain 分支覆盖 ≥90%（阶段 12 强制）                                                                                                 |
| `validate:levels` | node tools/validate-levels.mjs | 全部关卡过 Schema+语义校验                                                                                                           |
| `solve:levels`    | node tools/solve-levels.mjs    | 全部关卡在预算内求解并回放至胜利                                                                                                     |
| `test:e2e`        | playwright test                | Chromium+WebKit 关键路径全绿                                                                                                         |
| `build`           | vite build（singlefile）       | 产出 `dist/index.html`，体积 ≤ 预算（阶段 13 定值）                                                                                  |
| `verify:dist`     | node scripts/verify-dist.mjs   | 无远程引用（http/https/cdn）、无密钥、可离线                                                                                         |
| `check`           | 聚合                           | format 检查 + lint + typecheck + test + validate:levels + solve:levels + build + verify:dist + check-deps；CI 与本仓库唯一"完成"门禁 |

## 5. 开发与正式构建差异

| 项            | 开发版（`npm run dev`）         | 正式版（`npm run build`）                          |
| ------------- | ------------------------------- | -------------------------------------------------- |
| 遥测          | 本地记录（可导出，匿名，FR-11） | 默认关闭，构建期以 `import.meta.env.PROD` 裁剪入口 |
| 提示/调试面板 | 可用                            | 移除                                               |
| 网络          | 无（任何版本禁止远程请求）      | 无                                                 |
| 存档          | 同正式版结构                    | 同左                                               |

## 6. P0 需求落点核对（对照 `docs/traceability-matrix.md`）

- FR-01/02/04/05：`scenes` + `input` + `domain`；FR-03：`domain`；FR-06：`levels`+`tools`；FR-07：`persistence`；FR-08：`levels` 数据 + `scenes/Game`。
- NFR-01/02/08：`build`/`verify:dist`/E2E 矩阵；NFR-07：`check` 门禁。
- R-01~~R-07、M0~~M8：`domain`（阶段 05–08）+ `tools`（阶段 09）。
- 提交材料：`dist/` + `docs/` + `reports/`（阶段 15）。
  矩阵 31/31 项映射已在阶段 01 机器校验通过，本阶段未新增需求，无孤儿。

## 7. 关键风险对策（架构层面）

- RISK-04（状态空间爆炸）：canonicalJSON+stableHash 判重、BFS 预算上限（ADR-013）。
- RISK-05（单文件体积）：程序化贴图/音频（ADR-009/011）、`verify:dist` 体积预算。
- RISK-06（浏览器差异）：Playwright WebKit 用例 + 音频手势解锁模式（ADR-011）。
- RISK-07（Windows 环境）：全部工程脚本用 Node ESM（.mjs），npm scripts 跨平台。
- RISK-11（依赖供应链）：`--save-exact` 锁版本 + `package-lock.json` 入库。
