# ADR-007：技术栈与包管理器

- 日期：2026-08-22
- 状态：accepted
- 影响需求：全部（NFR-07/08 尤甚）
- 影响阶段：03、04 及以后全部

## 背景

阶段 03 必须冻结语言、构建、渲染、测试与包管理器，使阶段 04 可直接初始化工程；yarn 在本机不可用（阶段 00 实测），包管理器不锁定会引入环境漂移（RISK-07）。

## 候选方案

1. TypeScript + Vite + Phaser 3 + Vitest + Playwright，npm 锁版本。
2. 同栈但用 pnpm（本机可用，磁盘占用小）。
3. 轻量自研 Canvas 渲染（无 Phaser）。

## 决策

方案 1。

## 理由与证据

项目技术基线（README/AGENTS）已指定该栈，方案 3 属违约且增加兼容风险；npm 与 pnpm 均满足锁版本，但 npm 随 Node 内置、对 AI 代理会话的确定性最高，且本机实测存在（pnpm 也存在但次选，避免工具链分裂）。Phaser 3.x 最新稳定版在阶段 04 `npm install --save-exact` 时锁定并写入报告。

## 后果

阶段 04 按 `docs/architecture.md` §1/§4 初始化；`package-lock.json` 入库；依赖变更走 ADR。

## 复查条件

npm 安装失败或锁版本冲突时评估 pnpm；Phaser 出现阻断性缺陷时评估 3.x 内替换版本。
