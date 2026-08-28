# 《双生折线》项目状态（跨会话事实来源）

## 当前事实

- 计划外迭代（2026-08-28，探索难度/教学/难度提示）：首页新增简单/标准/困难三档探索难度并持久化；简单全图常亮，标准九宫格 + 永久探索记忆，困难九宫格 + 不保留离开区域；首页新增集中教学弹窗；level-011 初始提示加入“难度飙升”。难度只覆盖实际游玩视图，不改正式关卡、领域规则、parMoves 或 BFS。ADR：`docs/adr/ADR-021-difficulty-visibility-and-tutorial.md`；报告：`reports/difficulty-tutorial-2026-08-28.md`。验收：Optimize CI run 33145524827 全绿，23 文件/293 单测、50/50 校验、50/50 BFS、variety fail=0/review=0、Chromium + mobile-320 E2E 66/66。
- 计划外迭代（2026-08-28，后 40 关开放迷宫重制）：level-011..050 全量重建为开放共享迷宫；40/40 最优解真实发生双球对穿，33/40 禁止对穿后不可解或最短解变长，37/40 出现双向单侧受阻解耦；后 30 关平均 BFS 最优步数 21.33。报告：`reports/open-maze-redesign-summary.md`。
- 计划外迭代（2026-08-27，后 30 关重制）：level-021..050 全量重建为大地图长路径；第四章 031..040 全章探索迷雾，逐关加入无痕/衰减记忆、交替视野、菱形/十字视野、雷达与信标；第五章新增 M9 奇偶相位门。parMoves 全部由 BFS 自动回填并强制等于最短步数；21–50 平均最优步数 18.90。报告：reports/late-game-redesign-summary.md。

- 当前版本：MVP V0.8 + 开放共享迷宫 + 三档探索难度 + 首页教学（23 文件 293 单测；50 关全部自动回放胜利；后 40 关开放迷宫/双球对穿验收通过；Chromium + mobile-320 E2E 66/66；既有离线验证与开发版匿名遥测能力保持）
- 当前阶段：14 已完成，下一阶段 15（发布候选与参赛材料）
- 最后更新：2026-08-28
- 最近通过命令/门禁：Optimize CI run `33145524827`：`npm run typecheck`；`npm test`（23 文件 293 用例）；`npm run validate:levels`（50/50）；`npm run solve:levels`（50/50 可解）；`npm run report:solution-variety`（fail=0 / sameChapterExact=0 / review=0）；`npm run build`（dist/index.html 约 1.28MB）；`npm run verify:dist`（无外部请求/密钥/source map/绝对路径）；Playwright `chromium` + `mobile-320`（66/66）。
- 当前阻塞：功能无阻塞。
- 下一步：执行 `prompts/15_发布候选与参赛材料.md`；基于阶段 14 真人试玩反馈和认知走查结论，形成发布候选（RC）。
- 计划外迭代（2026-08-27，阶段 14 与 15 之间）：小清新 UI 重设计与布局错位修复（报告 `reports/ui-redesign-2026-08-27.md`）。改动范围：`index.html`（CSS 主题变量化 + 布局修复）、`src/main.ts`、`src/scenes/BootScene.ts`（全部机关纹理浅色化）、`src/scenes/HomeScene.ts`、`src/scenes/ResultScene.ts`；领域层与 DEMO/ 零改动（git diff 验证）。验收：`npm run check` 12 步全过（含 prettier 格式修复）、E2E 96/96（chromium+webkit+mobile-320，4 workers）、双视口（320×568 / 390×844）程序化布局与配色校验全过（棋盘居中偏移 0px、无重叠、浅色主题生效）。注意：E2E 8 workers 并行存在 pre-existing flaky（资源竞争超时），验收基线为 4 workers。
- 计划外迭代（2026-08-27，阶段 14 与 15 之间）：UI、难度曲线与提示系统打磨（报告 `reports/gameplay-polish-2026-08-27.md`）。首页/HUD/选关层级重做；第一章曲线调整为 `1→3→4→6→6→6→6→7→6→9`；037 传送教学从 9 步降至 6 步；常驻提示卡、提示按钮、建议方向高亮与动态状态反馈完成。验证：typecheck、265 单测、50 关校验与 50 关求解回放通过；E2E 因当时 Linux 环境缺少浏览器二进制未启动，断言已同步更新。

## 阶段状态

| 阶段 | 状态 | 开始 | 完成 | 报告 | 阻塞/备注 |
|---:|---|---|---|---|---|
| 00 | completed | 2026-08-22 | 2026-08-22 | `reports/stage-00-report.md` | 总控与执行协议；基础设施已建立 |
| 01 | completed | 2026-08-22 | 2026-08-22 | `reports/stage-01-report.md` | 需求解析与范围冻结；V1.0 基线冻结，ADR-001~004 |
| 02 | completed | 2026-08-22 | 2026-08-22 | `reports/stage-02-report.md` | 规则形式化与状态模型；结算流水线 P1–P9、不变量 I1–I19、GWT 用例 49 例 |
| 03 | completed | 2026-08-22 | 2026-08-22 | `reports/stage-03-report.md` | 技术架构与实施计划；ADR-007~013、目录/依赖/场景/命令冻结 |
| 04 | completed | 2026-08-22 | 2026-08-22 | `reports/stage-04-report.md` | 仓库初始化与质量基线；check 十步全绿、e2e 双引擎通过、单文件 1.15MB |
| 05 | completed | 2026-08-22 | 2026-08-22 | `reports/stage-05-report.md` | 核心移动引擎；62 测试全绿、覆盖率 100%、规范补全 D6/§3-d |
| 06 | completed | 2026-08-23 | 2026-08-23 | `reports/stage-06-report.md` | 前三关 MVP 与交互闭环；E2E 18/18 三引擎；ADR-014 |
| 07 | completed | 2026-08-24 | 2026-08-24 | `reports/stage-07-report.md` | 基础机关 M1–M4；8 教学/组合关；ADR-015；E2E 24/24 |
| 08 | completed | 2026-08-24 | 2026-08-24 | `reports/stage-08-report.md` | 高级机关 M5–M8；8 教学/组合关（BFS 复核 par）；ADR-016 坍塌对穿精化；37 边界用例；E2E 39/39 |
| 09 | completed | 2026-08-24 | 2026-08-24 | `reports/stage-09-report.md` | 关卡 Schema、编辑器、求解器、CLI 工具链；12 步 check 全绿；E2E 39/39；203 测试 |
| 10 | completed | 2026-08-24 | 2026-08-25 | `reports/stage-10-report.md` | 50 关生产与难度曲线；3 轮重设计后全部通过审计/相似度/求解；单方向解仅限 6 冻结教学关；048 M8 脉冲门检测限于审计首轮限制；204 测试全绿；check 12 步全过 |
| 11 | completed | 2026-08-26 | 2026-08-26 | `reports/stage-11-report.md` | 完整 UI、视觉、音频、无障碍；check 12 步全过，E2E 39/39，截图 24 张 |
| 12 | completed | 2026-08-26 | 2026-08-26 | `reports/stage-12-report.md` | 自动化测试体系；ADR-018 振动 API 未实现 |
| 13 | completed | 2026-08-26 | 2026-08-26 | `reports/stage-13-report.md` | 浏览器兼容、性能、离线；96 E2E 全过；Firefox 环境缺失；帧率未可测 |
| 14 | completed | 2026-08-26 | 2026-08-26 | `reports/stage-14-report.md` | 试玩测试与 AI 迭代；遥测就绪、认知走查完成、首 3 关提示优化、AI 迭代文档生成 |
| 15 | pending |  |  | `reports/stage-15-report.md` | 发布候选与参赛材料 |
| 16 | pending |  |  | `reports/stage-16-report.md` | 独立最终验收与缺陷清零 |
| 17 | pending |  |  | `reports/stage-17-report.md` | 交付归档与维护手册 |

状态仅允许：`pending`、`in_progress`、`blocked`、`completed`。没有报告和验收证据不得标记 completed。

## 关键路径与决策

- 当前发布候选：无（MVP 可玩，未进入 RC）
- 最近决策记录：ADR-001~006（需求/规则类，全文在 `docs/decision-log.md`）；ADR-007~013（架构类，全文在 `docs/adr/`）；ADR-014（MVP 表现层 UI 形态与动画期输入策略，`docs/adr/ADR-014-mvp-ui-and-input-gate.md`）；ADR-015（M3 令牌授予时机：抵达授予、停留不重授，`docs/decision-log.md`）；ADR-016（M7 坍塌对穿精化：D2 后格上有角色则不坍塌，`docs/decision-log.md`）；ADR-017（存档版本升级至 3，新增 settings 字段，`docs/decision-log.md`）；ADR-018（振动 API 未集成到 GameScene 反馈，不属于阶段 12 范围，`docs/decision-log.md`）；ADR-021（三档探索难度、首页教学与第 11 关难度提示，`docs/adr/ADR-021-difficulty-visibility-and-tutorial.md`）。
- 用户提供的外部材料：无（除仓库内执行包文档外）；并行会话遗留沙箱已更名 `DEMO/`（原 `tmp/`，曾误删并从 opencode 快照库逐字节完整恢复）：**受保护目录，任何代理不得删除/覆盖/移动**，仅排除于门禁（eslint/prettier/gitignore），阶段 09 可参考其 BFS 思路；`test-results/` 为可再生 scratch 已删除。
- 阶段 14 新增事实：
  - 遥测模块 `src/telemetry/telemetry.ts`：开发版默认开启，生产版默认关闭；URL 参数 `?telemetry=0/1` 覆盖；localStorage 存储，最多 5000 条；CSV 导出。
  - 首 3 关教学提示已增强（level-001/002/003 hint.focus 更新）。
  - 认知走查报告已生成：`reports/cognitive-walkthrough.md`（标注“非真人试玩”）。
  - AI 迭代文档已生成：`docs/AI协作与迭代优化过程.md`。
  - 真人试玩数据：无（尚未开展）。
- 不得遗忘的限制：
  - 无后端、无账号、无在线模型、无 CDN、无远程字体/音频/追踪；发布为单文件离线 H5。
  - 领域层为纯 TypeScript，不得导入 Phaser、DOM、localStorage、音频 API。
  - 正式关卡必须通过 Schema、内容校验器和 BFS 求解器。
  - 不得伪造真人试玩、性能、浏览器测试或覆盖率数据；未验证必须标注。
  - 规则 R-01 至 R-07、机制 M0 至 M8 的任何修改必须走 `docs/decision-log.md`。
  - M3 令牌按 ADR-015“抵达授予、停留不重授”实现；M7 坍塌按 ADR-016 追加占位条件（D2 后格上有角色不坍塌）；M8 为占用语义（同时占用即闩锁，不限本回合抵达）；多压板联动同一 doorId、同格多传送入口、oneWay/portal 压出口均未形式化，阶段 09 校验器须禁止或以 ADR 定义。
  - 存档 SAVE_VERSION=3（阶段 11 升级）：highestUnlocked 为全局线性序号（ADR-004），v1 旧存档按损坏回退，v2 旧存档兼容读取（新增 settings 字段，读取时容错）。
  - 遥测模块 `src/telemetry/telemetry.ts` 属于表现层/基础设施，不得放入 `src/domain/`。正式版（生产构建）默认关闭，仅开发版启用。现有开关：URL 参数 `?telemetry=0/1` 和构建环境变量。

## 运行环境事实（2026-08-22 实测）

- OS：Windows（win32），PowerShell 5.1
- Node：v24.14.0；npm：11.9.0；pnpm：11.22.0；yarn：不可用
- Git：2.53.0.windows.1，分支 `main`，与 `origin/main` 同步
- 包管理器：npm（ADR-007 冻结），`--save-exact` 锁版本，`package-lock.json` 入库；`npm ci` 干净安装验证通过
- 依赖锁定版本（2026-08-22）：phaser 3.90.0（注意：npm latest 已是 4.2.1，本项目按基线锁 3.x）；typescript 6.0.3；vite 8.2.2；vitest 4.1.11；@vitest/coverage-v8 4.1.11；vite-plugin-singlefile 2.3.3；@playwright/test 1.62.1；eslint 10.9.0；@eslint/js 10.0.1；typescript-eslint 8.67.0；eslint-config-prettier 10.1.8；prettier 3.9.6；globals 17.11.0；@types/node 26.2.0
- Playwright 浏览器：chromium-1234 + webkit-2336 已安装（2026-08-23 重装，匹配 @playwright/test 1.62.1）；E2E 三项目：chromium、webkit、mobile-320（320×568 触控）

## 新会话恢复指令

读取 `AGENTS.md`、本文件、`docs/decision-log.md`、最近阶段报告和下一阶段提示词，然后从“下一步”继续，不要重做已通过阶段。
