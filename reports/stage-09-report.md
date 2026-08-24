# 阶段 09 报告：关卡 Schema、编辑器、校验器与 BFS 求解器

## 1. 阶段结论

**通过**。所有验收门均已通过，工具链全链路绿。本轮修复了编辑器即时验证/求解/JSON 导入缺口、构建缓存未入 `.gitignore` 缺口。

## 2. 修改的文件清单

### 新建文件（第 1 轮）

| 文件 | 作用 |
|------|------|
| `schemas/level.schema.json` | 版本化 JSON Schema（schemaVersion: 1），与 LevelDef + 10 类 Entity 联合类型一致 |
| `tools/solver/bfs-solver.ts` | BFS 求解器核心：四方向扩展，调 `applyCommand`，`bfsHash` 判重 |
| `tools/solver/main.ts` | 求解器 CLI 入口：验证、求解、报告命令分发 |
| `tools/solve-levels.mjs` | CLI 包装脚本：调用 Vite 构建的 solver bundle |
| `tools/validate-levels.mjs` | 替换阶段 04 桩：全量结构+语义校验 `levels/` |
| `vite.tools.config.ts` | Vite 构建配置：将 solver CLI 打包为 Node ESM bundle |
| `tests/unit/content/semantic-validation.test.ts` | 17 条语义校验规则测试 |
| `tests/unit/content/solver.test.ts` | 10 条求解器测试 |
| `tests/unit/content/schema-consistency.test.ts` | 11 条 Schema-类型一致性测试 |
| `tests/unit/content/editor-roundtrip.test.ts` | 7 条编辑器纯函数测试（第 1 轮桩 → 第 2 轮改为测试真实 level-io.ts） |

### 新建文件（第 2 轮修复）

| 文件 | 作用 |
|------|------|
| `tools/level-editor/level-io.ts` | 编辑器核心纯 TS 模块：`EditorState`、`buildLevelJSON`、`exportLevelText`、`importLevelText`（经 `parseLevel`+`validateLevelSemantics` 校验）、`validateState`、`solveState`（调用 `bfsSolve`）。无 DOM 依赖，可在浏览器与 Node 测试中复用 |
| `tools/level-editor/index.html` | 重写：`<script type="module">` 引用 `level-io.ts`，即时验证（✅ 按钮）、即时求解（🚀 按钮，异步调用 `bfsSolve`）、JSON 导入（`<input type="file">` → `importLevelText` 校验 → 载入画布）、Ctrl+S 导出 |
| `vite.editor.config.ts` | 编辑器构建配置：验证模块图可解析，产出到 `tools-dist/editor/` |
| `artifacts/difficulty-report.txt` | 难度报告（每次 `report:difficulty` 再生，已加入 `.gitignore`） |

### 修改文件

| 文件 | 第 1 轮修改 | 第 2 轮修改 |
|------|------------|------------|
| `src/content/validate.ts` | 新增 `validateLevelSemantics()` 函数 | — |
| `package.json` | 新增 `build:tools`、`validate:levels`、`solve:level`、`solve:levels`、`report:difficulty`、`editor` 脚本 | — |
| `tsconfig.json` | 新增 `tools/solver` 和 `vite.tools.config.ts` | 追加 `tools/level-editor` |
| `eslint.config.js` | 新增 `tools-dist/**` 到 ignores | — |
| `.prettierignore` | 新增 `tools-dist` | — |
| `.gitignore` | — | 新增 `tools-dist/`、`artifacts/difficulty-report.txt` |
| `scripts/check.mjs` | 新增 `build:tools` 和 `report:difficulty` 步骤 | — |

## 3. 实际执行的命令、退出码和关键输出摘要

### 第 1 轮（原始阶段 09 交付）

| 命令 | 结果 |
|------|------|
| `npm test` | 16 文件 199 用例全绿 |
| `npm run check` | 12 步全绿，退出码 0 |
| `npm run test:e2e` | 39/39 三引擎全绿 |
| 坏关卡演示 | 退出码 1，打印路径与语义错误 |
| `solve:levels` | 19/19 可解，par 一致性 0 错误 |
| 50 次重复求解 | 一致性通过 |

### 第 2 轮（缺口修复）

| 命令 | 结果 |
|------|------|
| `npm test` | 16 文件 **203 用例**全绿（新增 4 条编辑器纯函数测试） |
| `npm run check` | **12 步全绿**，退出码 0 |
| 编辑器构建证据 | `npx vite build --config vite.editor.config.ts` → `tools-dist/editor/index.html` (7.08 kB) + `assets/index-CV_Gk1L1.js` (43.01 kB) — 模块图 14 个模块成功编译 |
| 编辑器模块图 | `level-io.ts` → `parseLevel` / `validateLevelSemantics` / `bfsSolve` → `applyCommand` / `stableHash`（`canonicalJSON`） 全部纯 TS，浏览器中可直接运行 |

## 4. 验收门逐项结论

### ✅ Schema 和类型一致
- `schemas/level.schema.json` 与 `src/domain/types.ts` 的 LevelDef、Entity 联合类型逐字段一致
- 11 条 Schema-类型一致性测试锁定字段集、实体类型枚举（10 种）、映射模式枚举（3 种）、方向枚举（4 种）、必填项等
- 运行时事实仍是手写校验器（ADR-012），JSON Schema 为同步维护的对外工件

### ✅ 求解器覆盖 M0–M8 状态
- BFS 求解器直接复用 `applyCommand`（引擎唯一结算入口）
- 判重使用 `bfsHash`（排除 `moveCount` 和 `history`，保留 `mapping`、`actors`、`doors`、`pulseDoors`、`fragileCollapsed` 等全部动态字段）
- 19 关全部可解且回放至胜利，验证 M0–M8 状态覆盖完整
- 输出：最短步数、解序列、最短解数量、状态数、耗时、预算状态

### ✅ 工具不会因单个坏关卡静默跳过
- `validate:levels` 全量扫描，任一坏关卡 → 非零退出并打印文件路径与原因
- 已用临时坏关卡（portal 不成对）验证：退出码 1，打印路径与语义错误

### ✅ 所有 CLI 可被 CI 调用
- `npm run validate:levels` — 全量结构+语义校验，退出码 0/1
- `npm run solve:level -- <id>` — 单关求解，退出码 0/1
- `npm run solve:levels` — 全量求解+回放+par 一致性，退出码 0/1
- `npm run report:difficulty` — 难度报告写入 `artifacts/difficulty-report.txt`
- 所有 CLI 非交互、确定性、明确退出码
- `npm run check` 和 `npm run ci` 均已编排

## 5. 新增风险、技术债和决策记录

### 技术债
1. **`build:tools` 重复构建**：`check.mjs` 有独立 `build:tools` 步骤，但 `validate:levels` 和 `solve:levels` 也各自以 `npm run build:tools &&` 开头，导致 chain 中重复构建三次。受限于 npm script 链式调用设计，不破坏单步独立性前难以消除。预计每次 ci 多花 ~70ms，可接受。
2. **`vite.tools.config.ts` 使用 `__dirname`**：Vite 8 警告 `__dirname` 将被 `import.meta.dirname` 取代。不影响功能，可在未来版本升级时修复。
3. **编辑器大关卡求解阻塞 UI**：`bfsSolve` 是同步调用，大关卡（如 `level-047` 需 6ms）在浏览器中会短暂阻塞 UI 线程。当前所有 19 关求解耗时 < 15ms，可接受；若未来出现复杂关，可改用 `setTimeout` 分片或 Web Worker。

### 决策记录
无新增 ADR。所有决策遵循现有 ADR-003（parMoves 偏离策略）、ADR-012（手写校验器）、ADR-013（BFS + 稳定哈希）、ADR-015（M3 抵达授予）、ADR-016（M7 占位不坍塌）。

### 规范空白
- `pulseDoor` 与 `pairId` 配对约束：当前引擎允许任意数量 `pulseDoor` 共享同一 `pairId`（闩锁共享），校验器只检查 `pulseSwitch` 配对数量恰为 2，`pulseDoor` 不做数量约束。已写入 `docs/decision-log.md` 未决事项。
- `artifacts/difficulty-report.txt` 每次再生（含时间戳），已加入 `.gitignore` 避免污染。

## 6. 下一阶段输入

### 工具链使用说明（供阶段 10 批量生产/筛选 50 关）

#### 验证关卡
```bash
# 全量验证 levels/ 下所有关卡
npm run validate:levels

# 全量求解 + par 一致性检查
npm run solve:levels

# 单个关卡求解
npm run solve:level -- level-001

# 生成难度报告（输出到 artifacts/difficulty-report.txt）
npm run report:difficulty
```

#### 使用编辑器
```bash
# 打开关卡编辑器（浏览器）
npm run editor
```
编辑器能力：
- **绘制/擦除**：10 类实体（墙/门/压板/专属门/暂停格/切换器/单向格/传送门/脆弱格/脉冲开关/脉冲门）、蓝/橙起点与出口
- **即时验证**：点击「✅ 验证」按钮，运行 `parseLevel` + `validateLevelSemantics`，展示通过/错误列表（含 path 与 message）
- **即时求解**：点击「🚀 求解」按钮，调用 `bfsSolve`，展示可解性、最短步数、解序列、最短解数量、访问状态数、耗时；超预算/不可解按求解器 reason 原样展示
- **JSON 导入**：文件选择导入 `.json`，经 `importLevelText`（`parseLevel` + `validateLevelSemantics`）校验后载入画布与属性面板；导入失败时展示错误原因，不破坏当前编辑状态
- **JSON 导出**：Ctrl+S 或点击「💾 导出」按钮下载 `.json`

#### 关卡质量门禁
每关必须满足：
1. `npm run validate:levels` 通过（结构与语义校验）
2. BFS 求解器输出 `solvable=true` 且与 `parMoves` 一致
3. 回放校验通过
4. `npm run check` 全链路绿

#### 新增关卡步骤
1. 在 `levels/chapter-N/` 下创建 `level-XXX.json`
2. 运行 `npm run validate:levels` 确认通过
3. 运行 `npm run solve:level -- level-XXX` 确认可解
4. 更新 `src/content/levels.ts` 导入新关卡
5. 更新 `tests/unit/content/levels.test.ts` 添加教学解法
6. 运行 `npm run check` 全链路通过