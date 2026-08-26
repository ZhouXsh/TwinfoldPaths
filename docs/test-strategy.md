# 测试策略

> 阶段 12 建立：单元、集成、属性、内容、E2E 测试金字塔，覆盖全部 P0 需求。

## 测试金字塔

```
          ╱  E2E  ╲           (63 测试 × 3 项目)
        ╱  集成/属性  ╲       (54 测试)
      ╱    内容/工具    ╲     (60 测试)
    ╱      单元测试       ╲   (141 测试)
  ╱        领域层          ╲  (100% 分支覆盖)
```

## 分层说明

### 1. 单元测试（`tests/unit/domain/`）

- **范围**：纯领域层（`src/domain/`）——引擎、状态、序列化、撤销、方向映射
- **隔离**：完全无 Phaser/DOM/localStorage/音频 API
- **种子控制**：所有随机测试使用 `mulberry32` 种子化 PRNG，固定种子 `20260822`、`7`、`99`、`42`、`123`、`20260826`、`13`
- **关键文件**：
  - `core-rules.test.ts` — R-01~R-07 规则验证（24 测试）
  - `mechanics-m1m4.test.ts` — M1~M4 机关（25 测试）
  - `mechanics-m5m8.test.ts` — M5~M8 机关（37 测试）
  - `mechanics.test.ts` — M6 传送与 P4 阻挡（14 测试）
  - `mapping.test.ts` — 方向映射（13 测试）
  - `serialization.test.ts` — 序列化往返（6 测试）
  - `undo-property.test.ts` — 撤销属性（3 测试）
  - `property-tests.test.ts` — 属性测试（26 测试）

### 2. 属性测试（`tests/unit/domain/property-tests.test.ts`）

- **确定性**：同种子同序列→同结果，多次重跑哈希一致
- **状态合法**：随机序列每步后检查 I1（在界内、不站坍塌格）、I2（不同格）、I3（映射有效）、I8（history 长度）、I15（空 history 时 moveCount=0）
- **撤销往返**：任意随机序列撤销到底→逐字段等于初始状态；撤销再重放等价
- **序列化往返**：`serialize`/`deserialize` 后状态等价，哈希一致，仍可撤销
- **求解回放**：全部 50 关 BFS 求解→最短解回放至胜利，最优步数 ≤ parMoves，3 次求解结果一致
- **restart 不变性**：多次 `restart` 结果一致
- **胜利后状态不变**：WON 后所有方向输入被忽略

### 3. 集成测试（`tests/unit/domain/integration.test.ts`）

- **跨模块**：领域层 + 存档层 + 内容注册表，不依赖 Phaser/DOM
- **覆盖**：
  - 加载关卡 → 执行解法 → 胜利判定 → `recordWin` → 存档持久化与回读
  - 线性序号推进（1→2→...→50，跨章节）
  - 最佳步数不退化
  - 机关触发（M1/M3/M7/M8）→ 胜利 → 存档
  - 设置持久化（`persistSettings`/`loadSettings`）
  - v2 存档兼容读取（SAVE_VERSION=3，无 settings 字段回退默认）
  - v2→v3 升级迁移
  - 双槽损坏回退（主槽坏/备份槽坏/双槽坏）
  - `restart` 后重新通关
  - `recordWin` 不修改入参
  - 50 关全链路可通关

### 4. 内容测试（`tests/unit/content/`）

- **solver.test.ts** — BFS 求解器正确性、预算超限、50 次重复求解一致性
- **levels.test.ts** — 注册表 50 关、教学解法回放、BFS 全量可解、标签完整性
- **schema-consistency.test.ts** — Schema 与 TypeScript 类型一致性
- **semantic-validation.test.ts** — 语义校验规则（door.id 重复、portal 成对、pulseSwitch 数量等）
- **editor-roundtrip.test.ts** — 编辑器导出/导入往返等价

### 5. E2E 测试（`tests/e2e/`）

- **项目**：chromium、webkit、mobile-320（320×568 触控）
- **原有**（`mvp.spec.ts` + `home.spec.ts`，39 测试）：
  - 首页健康检查、一键进入第 1 关
  - 按钮+滑动+键盘通关前三关
  - 同格取消、撤销、重开
  - 刷新后进度恢复
  - M2/M3/M4/M5/M6/M7/M8 教学关渲染与通关
  - 映射切换同步
  - 视口遮挡与触控目标尺寸
- **新增**（`ui-flow.spec.ts`，24 测试）：
  - 首次用户前三关完整流程
  - 设置页开关切换可见且可操作（FR-10）
  - 设置页刷新后状态恢复（FR-07/FR-10）
  - 刷新后进度保持（FR-07）
  - 章节选择可见且可操作（章节→关卡→进入游戏）
  - M7 脆弱格教学关 5-41 界面可见且可通关
  - M8 脉冲门教学关 5-46 界面可见且可通关
  - 清除进度按钮可见且可操作
- **稳定性**：全部使用显式等待（`toBeVisible`/`toHaveText`），禁止固定 sleep 掩盖不稳定

## 覆盖率阈值

### 领域层（`src/domain/`）——硬指标

| 指标 | 阈值     | 当前        |
| ---- | -------- | ----------- |
| 语句 | ≥95%     | 100%        |
| 分支 | **≥90%** | **100%** ✅ |
| 函数 | ≥90%     | 100%        |
| 行   | ≥95%     | 100%        |

### 不适合用覆盖率衡量的区域

- **UI 场景层**（`src/scenes/`）：Phaser 场景生命周期依赖 DOM 和 Canvas 渲染，无法在 node 环境运行。由 E2E 测试覆盖关键用户路径。
- **音频管理**（`src/audio/`）：WebAudio 在 node 环境下不可用，由 E2E 测试中验证音效开关存在性。
- **构建工具**（`tools/`）：CLI 工具、关卡编辑器 HTML 页面，由集成测试和手动验证覆盖。
- **关卡数据**（`levels/`）：JSON 数据文件，由 validate/solve 工具链验证。

## 种子/时钟控制策略

| 模块         | 策略                                        |
| ------------ | ------------------------------------------- |
| 属性测试     | 固定种子化 PRNG（mulberry32），无随机性依赖 |
| 求解器       | BFS 确定性，无随机元素                      |
| 求解器一致性 | 50 关每关 3 次重跑结果一致                  |
| E2E          | 不依赖时钟，全部使用显式等待                |

## 不稳定测试处理流程

1. 属性测试失败 → 如果是种子特异性问题，记录种子和序列，修复后重新验证
2. E2E 失败 → 检查是否为 UI 异步问题，用显式等待替代固定 sleep
3. 不允许：简单重试掩盖、降低断言、删除失败测试
4. 记录每次不稳定测试到 `docs/decision-log.md`

## 验证命令

| 命令                      | 作用                                                |
| ------------------------- | --------------------------------------------------- |
| `npm run test`            | 运行全部单元/集成/属性/内容测试（18 文件 255 测试） |
| `npm run coverage`        | 运行测试并生成覆盖率报告                            |
| `npm run test:e2e`        | 运行 Playwright E2E 测试（63 测试 × 3 项目）        |
| `npm run validate:levels` | 校验 50 关 JSON Schema                              |
| `npm run solve:levels`    | 求解 50 关并验证全部可解                            |
| `npm run build`           | 构建生产产物                                        |
| `npm run verify:dist`     | 验证产物无外部请求、无密钥                          |
| `npm run check`           | 聚合质量门禁（12 步）                               |

## 验收门

- [x] 所有 P0 需求至少一个自动化验证或明确人工验收项
- [x] 领域层关键分支覆盖 ≥90%（当前 100%）
- [x] 50 关全部自动回放到胜利
- [x] E2E 无不稳定失败
- [x] `npm run check` 退出码 0
