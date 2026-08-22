# ADR-012：关卡数据格式与校验器

- 日期：2026-08-22
- 状态：accepted
- 影响需求：FR-06、CONTENT-01~05、NFR-07、`reference/关卡JSON_Schema.md`
- 影响阶段：03、09、10

## 背景

关卡数据必须与代码分离并机器可校验。需要确定：运行时校验器用现成 Schema 库（ajv/zod）还是手写；JSON Schema 文件的角色；编辑器形态。

## 候选方案

1. 运行时事实=手写 TS 校验器（`src/content/validator`），`schemas/level.schema.json` 为导出的对外工件（供外部工具/文档）；编辑器阶段 09 决定。
2. 运行时用 ajv 加载 JSON Schema 做唯一事实。
3. 运行时用 zod 定义 schema，运行时校验+类型推导一体。

## 决策

方案 1；编辑器选"手写 JSON + 校验器 + 求解器即时反馈"的轻量流程，可视化编辑器仅列为可选增强（不阻塞 50 关生产）。

## 理由与证据

手写校验器可与领域规则深度联动（如传送成对、门/压板引用存在、parMoves 与求解关系等语义约束，见 Schema 基线），ajv 仅做结构校验仍需手写语义层，等于双份维护；zod 引入运行时依赖但语义校验仍需手写，收益不足。此选择符合"避免为少量功能引入大依赖"（AGENTS.md）。JSON Schema 工件保留以便未来工具互操作。

## 后果

阶段 09 实现 `tools/validate-levels.mjs`（复用 `src/content/validator`）；加载器拒绝未知字段与坏关卡（不静默修复）；`schemaVersion` 变更须迁移或显式拒绝。

## 复查条件

若 50 关生产中手写校验器成为瓶颈（误报/漏报反复），评估引入 zod 重构校验层。
