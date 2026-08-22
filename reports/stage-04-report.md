# Stage 04 Report：仓库初始化与质量基线

## 结论

- 状态：通过
- 构建版本：0.1.0（`dist/index.html` 单文件 1.15MB / gzip 320KB）
- 日期：2026-08-22

## 输入与目标

- 读取基线：`prompts/04_仓库初始化与质量基线.md`、`AGENTS.md`、`docs/architecture.md`、`docs/implementation-plan.md`、`docs/adr/ADR-007~013`。
- 上一阶段出口：`reports/stage-03-report.md`（架构冻结，11 条质量命令定义，check-deps 就绪）。
- 本阶段目标：可重复安装、可构建、可测试的最小仓库；空功能基线全绿；浏览器冒烟不跳过。

## 实际变更

| 文件 | 变更 | 原因 |
|---|---|---|
| `package.json` | 新建 | 名称/描述/engines(node>=20)/16 条 scripts（dev、preview、format、format:check、lint、typecheck、test、coverage、validate:levels、solve:levels、test:e2e、build、verify:dist、check、ci） |
| `package-lock.json` | 新建 | `--save-exact` 锁定全部依赖；`npm ci` 验证可复现 |
| `tsconfig.json` | 新建 | strict + noUncheckedIndexedAccess + noImplicitOverride；types: vite/client、node |
| `vite.config.ts` | 新建 | vite-plugin-singlefile、base:'./'、vitest test 配置（node 环境，tests/unit） |
| `eslint.config.js` | 新建 | flat config：js.recommended + typescript-eslint + prettier；禁 any/非空断言；node globals 覆盖脚本 |
| `.prettierrc.json`、`.prettierignore` | 新建 | 代码与我们文档统一风格；排除用户提供文档（prompts/reference/templates/README/AGENTS 等） |
| `.editorconfig`、`.gitignore` | 新建 | 编辑器统一；忽略 node_modules/dist/coverage/测试产物 |
| `index.html` | 新建 | 竖屏 viewport、`#game` 容器、`#status` 健康检查 DOM 行 |
| `src/main.ts` | 新建 | Phaser.Game 组合根（390×720 FIT） |
| `src/scenes/BootScene.ts`、`src/scenes/HomeScene.ts` | 新建 | 最小场景：标题 + “健康检查 OK”（画布内文本 + DOM 状态行） |
| `src/domain/types.ts` | 新建 | Direction/Point/MappingMode/ActorColor/GameStatus 纯类型（领域层第一块） |
| `scripts/check.mjs` | 新建 | 聚合门禁：10 步顺序执行、失败即停 |
| `scripts/ci.mjs` | 新建 | 本地 CI = check + test:e2e（平台 CI 未知，按提示词以本地脚本兜底） |
| `scripts/verify-dist.mjs` | 新建 | 产物校验：无外部引用、无密钥启发式、体积 ≤3MB |
| `tools/validate-levels.mjs`、`tools/solve-levels.mjs` | 新建（桩） | 阶段 09 前的占位：扫描 levels/ JSON 并解析；文件内注明替换计划（ADR-012/013） |
| `tests/unit/smoke.test.ts` | 新建 | vitest 冒烟：方向域恰 4 向且无重复 |
| `tests/e2e/home.spec.ts`、`playwright.config.ts` | 新建 | 首页健康检查可见 + 控制台零错误；chromium+webkit 双项目，webServer=vite preview |

## 命令与证据

| 命令 | 退出码 | 关键结果 |
|---|---:|---|
| `npm install --save-exact phaser@3` 等 | 0 | 依赖 163 包，0 漏洞；phaser 锁定 3.90.0 |
| `npm run format` → `format:check` | 0 | 全部文件符合 Prettier 风格 |
| `npm run lint` | 0 | 修复 1 处 `no-useless-escape` 后零错误 |
| `npm run typecheck` | 0 | tsc --noEmit 零错误 |
| `npm test`（vitest） | 0 | 1 文件 2 用例通过 |
| `npm run validate:levels` / `solve:levels` | 0 | 0 关卡（桩，阶段 09 替换） |
| `npm run build` | 0 | `dist/index.html` 1,200.90 kB（gzip 320.57 kB） |
| `npm run verify:dist` | 0 | 1.15MB，无外部请求、无密钥 |
| `npm run test:e2e` | 0 | chromium 507ms、webkit 1.3s，2/2 通过，控制台零错误 |
| `npm run check` | 0 | 10 步全过：ALL STEPS PASSED |
| `npm ci` | 0 | 干净安装 6s，锁文件一致 |

过程中的处置（全部如实记录）：

1. npm 首次解析 `phaser` 得到 4.2.1（社区新版），与基线“Phaser 3”冲突 → 改装 `phaser@3` 锁定 3.90.0；不改架构、不改需求（基线优先）。
2. Prettier 首次运行改写了用户提供的 `README.md`/`AGENTS.md` → `git checkout` 还原，并加入 `.prettierignore`，防止再次触碰。
3. `vite.config.ts` 中 `inlineDynamicImports` 与 vite 8 的 `codeSplitting:false` 冗余告警 → 删除冗余配置。
4. `verify-dist.mjs` 正则无用转义（lint 报错）→ 修复字符类写法。

## 验收门

- [x] 所有命令退出码为 0：上表 11 组命令全部退出码 0。
- [x] 锁文件存在且无无关依赖：`package-lock.json` 入库；依赖=1 运行时（phaser）+ 13 开发依赖，逐项有明确用途（构建/类型/测试/质量/浏览器），0 漏洞；`npm ci` 复现通过。
- [x] 首页可见且控制台无错误：Playwright chromium+webkit 断言“健康检查 OK”可见且 `console error`/`pageerror` 为空。
- [x] CI 与本地命令一致：`scripts/ci.mjs` 顺序执行与本地 `check` 完全相同的步骤加 `test:e2e`；未使用平台专属特性，任何 CI 可直接 `node scripts/ci.mjs`。

## 缺陷、风险和技术债

- 缺陷（已修复）：上述处置 2–4；处置 1 为供应链版本漂移，已按冻结基线纠正。
- 技术债 TD-04（低）：`tools/validate-levels.mjs`、`tools/solve-levels.mjs` 为桩，阶段 09 必须替换为真实校验器/求解器（文件内已注明）。
- 技术债 TD-05（低）：`coverage` 命令已配置但尚未设置阈值，阶段 12 按 architecture §4 落地 domain 分支覆盖 ≥90%。
- 风险新增：RISK-13（依赖大版本较新：TS 6 / Vite 8 / ESLint 10 / Vitest 4），缓解=锁版本+每阶段 check 复验；已写入 `docs/risk-register.md`。
- 备注：Playwright 浏览器安装于本机缓存（`%LOCALAPPDATA%\ms-playwright`），新环境需 `npx playwright install chromium webkit`（已写入下一阶段输入）。

## 下一阶段输入

1. 执行 `prompts/05_核心移动引擎.md`。
2. 工程基线：`npm ci && npm run check` 为每阶段出入口；新环境先 `npx playwright install chromium webkit`。
3. 实现依据：`docs/domain-model.md`（类型与序列化）、`docs/turn-resolution.md`（P1–P9 流水线）、`docs/invariants.md`（I1–I19 测试来源）、`docs/examples/rule-cases.md`（GWT 用例转测试）。
4. 边界约束：`src/domain` 零外部导入（check-deps 机器强制）；动画/渲染不得进入本阶段。
5. 完成后更新 `.ai/project-state.md`（05 → completed）并继续阶段 06。
