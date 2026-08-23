# 《双生折线》项目状态（跨会话事实来源）

## 当前事实

- 当前版本：MVP V0.1（领域引擎 V1.0 + 表现层 MVP；前三关可玩闭环；单文件产物 1.17MB）
- 当前阶段：06 已完成，下一阶段 07（基础机关 M1–M4）
- 最后更新：2026-08-23
- 最近通过命令：`npm run check`（10 步全过，退出码 0）；`npm run test:e2e`（18/18，chromium+webkit+mobile-320，连跑两轮）；`npm test`（10 文件 94 用例）
- 当前阻塞：无
- 下一步：执行 `prompts/07_基础机关M1–M4.md`；引擎已含 M1–M4 结算路径，阶段 07 职责为逐机关用例、教学关与渲染反馈；出入口=`npm run check` + `npm run test:e2e` 全绿

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
| 07 | pending |  |  | `reports/stage-07-report.md` | 基础机关 M1–M4 |
| 08 | pending |  |  | `reports/stage-08-report.md` | 高级机关 M5–M8 |
| 09 | pending |  |  | `reports/stage-09-report.md` | 关卡 Schema、编辑器、求解器 |
| 10 | pending |  |  | `reports/stage-10-report.md` | 50 关生产与难度曲线 |
| 11 | pending |  |  | `reports/stage-11-report.md` | 完整 UI、视觉、音频、无障碍 |
| 12 | pending |  |  | `reports/stage-12-report.md` | 自动化测试体系 |
| 13 | pending |  |  | `reports/stage-13-report.md` | 浏览器兼容、性能、离线 |
| 14 | pending |  |  | `reports/stage-14-report.md` | 试玩测试与 AI 迭代 |
| 15 | pending |  |  | `reports/stage-15-report.md` | 发布候选与参赛材料 |
| 16 | pending |  |  | `reports/stage-16-report.md` | 独立最终验收与缺陷清零 |
| 17 | pending |  |  | `reports/stage-17-report.md` | 交付归档与维护手册 |

状态仅允许：`pending`、`in_progress`、`blocked`、`completed`。没有报告和验收证据不得标记 completed。

## 关键路径与决策

- 当前发布候选：无（MVP 可玩，未进入 RC）
- 最近决策记录：ADR-001~006（需求/规则类，全文在 `docs/decision-log.md`）；ADR-007~013（架构类，全文在 `docs/adr/`）；ADR-014（MVP 表现层 UI 形态与动画期输入策略，`docs/adr/ADR-014-mvp-ui-and-input-gate.md`）
- 用户提供的外部材料：无（除仓库内执行包文档外）；并行会话遗留沙箱已更名 `DEMO/`（原 `tmp/`，曾误删并从 opencode 快照库逐字节完整恢复）：**受保护目录，任何代理不得删除/覆盖/移动**，仅排除于门禁（eslint/prettier/gitignore），阶段 09 可参考其 BFS 思路；`test-results/` 为可再生 scratch 已删除
- 不得遗忘的限制：
  - 无后端、无账号、无在线模型、无 CDN、无远程字体/音频/追踪；发布为单文件离线 H5。
  - 领域层为纯 TypeScript，不得导入 Phaser、DOM、localStorage、音频 API。
  - 正式关卡必须通过 Schema、内容校验器和 BFS 求解器。
  - 不得伪造真人试玩、性能、浏览器测试或覆盖率数据；未验证必须标注。
  - 规则 R-01 至 R-07、机制 M0 至 M8 的任何修改必须走 `docs/decision-log.md`。

## 运行环境事实（2026-08-22 实测）

- OS：Windows（win32），PowerShell 5.1
- Node：v24.14.0；npm：11.9.0；pnpm：11.22.0；yarn：不可用
- Git：2.53.0.windows.1，分支 `main`，与 `origin/main` 同步
- 包管理器：npm（ADR-007 冻结），`--save-exact` 锁版本，`package-lock.json` 入库；`npm ci` 干净安装验证通过
- 依赖锁定版本（2026-08-22）：phaser 3.90.0（注意：npm latest 已是 4.2.1，本项目按基线锁 3.x）；typescript 6.0.3；vite 8.2.2；vitest 4.1.11；@vitest/coverage-v8 4.1.11；vite-plugin-singlefile 2.3.3；@playwright/test 1.62.1；eslint 10.9.0；@eslint/js 10.0.1；typescript-eslint 8.67.0；eslint-config-prettier 10.1.8；prettier 3.9.6；globals 17.11.0；@types/node 26.2.0
- Playwright 浏览器：chromium-1234 + webkit-2336 已安装（2026-08-23 重装，匹配 @playwright/test 1.62.1）；E2E 三项目：chromium、webkit、mobile-320（320×568 触控）

## 新会话恢复指令

读取 `AGENTS.md`、本文件、`docs/decision-log.md`、最近阶段报告和下一阶段提示词，然后从“下一步”继续，不要重做已通过阶段。
