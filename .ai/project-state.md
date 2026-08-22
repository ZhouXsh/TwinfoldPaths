# 《双生折线》项目状态（跨会话事实来源）

## 当前事实

- 当前版本：规则形式化规范 V1.0（`docs/domain-model.md`、`docs/turn-resolution.md`、`docs/invariants.md`、`docs/examples/rule-cases.md`）
- 当前阶段：02 已完成，下一阶段 03（技术架构与实施计划）
- 最后更新：2026-08-22
- 最近通过命令：`node scripts/check-stage01.mjs`（退出码 0，41 个 md 文件链接有效）；文档自审修正 1 处（D1 脆弱格坍塌边界措辞）
- 当前阻塞：无
- 下一步：执行 `prompts/03_技术架构与实施计划.md`，输入为 `docs/requirements.md`、`docs/domain-model.md`、`docs/turn-resolution.md`、`docs/risk-register.md`；注意处理 TD-03（`docs/adr/` 与 `docs/decision-log.md` 的 ADR 编号体系衔接，须从 ADR-007 续号）

## 阶段状态

| 阶段 | 状态 | 开始 | 完成 | 报告 | 阻塞/备注 |
|---:|---|---|---|---|---|
| 00 | completed | 2026-08-22 | 2026-08-22 | `reports/stage-00-report.md` | 总控与执行协议；基础设施已建立 |
| 01 | completed | 2026-08-22 | 2026-08-22 | `reports/stage-01-report.md` | 需求解析与范围冻结；V1.0 基线冻结，ADR-001~004 |
| 02 | completed | 2026-08-22 | 2026-08-22 | `reports/stage-02-report.md` | 规则形式化与状态模型；结算流水线 P1–P9、不变量 I1–I19、GWT 用例 49 例 |
| 03 | pending |  |  | `reports/stage-03-report.md` | 技术架构与实施计划 |
| 04 | pending |  |  | `reports/stage-04-report.md` | 仓库初始化与质量基线 |
| 05 | pending |  |  | `reports/stage-05-report.md` | 核心移动引擎 |
| 06 | pending |  |  | `reports/stage-06-report.md` | 前三关 MVP 与交互闭环 |
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

- 当前发布候选：无（尚未进入编码阶段）
- 最近决策记录：ADR-001~006（见 `docs/decision-log.md`）；阶段 02 新增 ADR-005（暂停令牌上限 1）、ADR-006（切换器蓝色优先、传送失败停留、互传交换）
- 用户提供的外部材料：无（除仓库内执行包文档外）
- 不得遗忘的限制：
  - 无后端、无账号、无在线模型、无 CDN、无远程字体/音频/追踪；发布为单文件离线 H5。
  - 领域层为纯 TypeScript，不得导入 Phaser、DOM、localStorage、音频 API。
  - 正式关卡必须通过 Schema、内容校验器和 BFS 求解器。
  - 不得伪造真人试玩、性能、浏览器测试或覆盖率数据；未验证必须标注。
  - 规则 R-01 至 R-07、机制 M0 至 M8 的任何修改必须走 `docs/decision-log.md`。

## 运行环境事实（2026-08-22 实测）

- OS：Windows（win32），PowerShell 5.1
- Node：v24.14.0；npm：11.9.0；pnpm：11.22.0；yarn：不可用
- Git：2.53.0.windows.1，分支 `main`，与 `origin/main` 同步，工作树干净
- 包管理器约定：未定，将在阶段 04 仓库初始化时锁定（默认倾向 npm，需锁版本）

## 新会话恢复指令

读取 `AGENTS.md`、本文件、`docs/decision-log.md`、最近阶段报告和下一阶段提示词，然后从“下一步”继续，不要重做已通过阶段。
