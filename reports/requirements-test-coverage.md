# 需求→测试覆盖映射

> 逐条标注 R-01~R-07、M0~M8、撤销、存档、错误恢复的覆盖情况。
> 证据：测试文件、用例名、命令输出。

## 核心规则 R-01~R-07

| 需求 | 测试文件 | 用例 | 证据来源 | 类型 |
|------|----------|------|----------|------|
| R-01 正交网格，每次输入上/下/左/右之一 | `core-rules.test.ts` | GWT-R01-1、GWT-R01-2 | 单元测试通过 | 已有 |
| R-02 蓝原方向；橙默认水平镜像 | `core-rules.test.ts` | GWT-R02-1~GWT-R02-4 | 单元测试通过 | 已有 |
| R-02 方向映射表 | `mapping.test.ts` | applyMapping 12 用例 | 单元测试通过 | 已有 |
| R-03 单方受阻则停留，另一方仍移动 | `core-rules.test.ts` | GWT-R03-1~GWT-R03-3 | 单元测试通过 | 已有 |
| R-04 结算后同格则整步取消；对穿交换 | `core-rules.test.ts` | GWT-R04-1~GWT-R04-3 | 单元测试通过 | 已有 |
| R-05 出口不锁定；双出口同回合判胜 | `core-rules.test.ts` | GWT-R05-1~GWT-R05-4 | 单元测试通过 | 已有 |
| R-06 无限撤销，恢复全部动态状态 | `core-rules.test.ts` | GWT-R06-1~GWT-R06-3 | 单元测试通过 | 已有 |
| R-06 撤销属性（随机序列） | `undo-property.test.ts` | 随机执行后完全撤销 | 属性测试通过 | 已有 |
| R-06 撤销往返（新） | `property-tests.test.ts` | 完全撤销后===初始状态、撤销再重放等价 | 属性测试通过 | 新增 |
| R-07 目标步数仅评价 | `core-rules.test.ts` | 超出 parMoves 仍可通关 | 单元测试通过 | 已有 |

## 机制 M0~M8

| 需求 | 测试文件 | 用例 | 证据来源 | 类型 |
|------|----------|------|----------|------|
| M0 墙与边界 | `core-rules.test.ts` | GWT-M0-2、墙不可从任何方向进入 | 单元测试通过 | 已有 |
| M1 压板与门 | `mechanics-m1m4.test.ts` | 7 用例（时序、开门、关门、撤销） | 单元测试通过 | 已有 |
| M2 角色专属门 | `mechanics-m1m4.test.ts` | 3 用例（蓝门、橙门、镜像布局） | 单元测试通过 | 已有 |
| M3 暂停格 | `mechanics-m1m4.test.ts` | 6 用例（令牌授予、消耗、停留不重授、取消恢复、双方消耗、撤销） | 单元测试通过 | 已有 |
| M4 映射切换器 | `mechanics-m1m4.test.ts` | 6 用例（站上切换、V_MIRROR/ROTATE_CW、蓝色优先、离开保持、撤销恢复） | 单元测试通过 | 已有 |
| M5 单向格 | `mechanics-m5m8.test.ts` | 5 用例（逆箭头离开、P4 优先级、边界/坍塌、M5+M4、顺箭头连续穿越） | 单元测试通过 | 已有 |
| | `mechanics.test.ts` | M5 进出单向格 | 单元测试通过 | 已有 |
| M6 传送 | `mechanics-m5m8.test.ts` | 16 用例（基础传送、目标格被占、互传、不二次传送、同目标格、门口碰撞、传送落点触发动态结算） | 单元测试通过 | 已有 |
| | `mechanics.test.ts` | 8 用例（传送基础、失败、互传、不二次、同格、精化分支） | 单元测试通过 | 已有 |
| M7 脆弱格 | `mechanics-m5m8.test.ts` | 12 用例（进入不坍塌、离开坍塌、阻挡不坍塌、暂停不坍塌、双坍塌、同格取消不坍塌、传送离开坍塌、对穿不坍塌、传送落点占位、撤销恢复、重开清空、序列化往返） | 单元测试通过 | 已有 |
| M8 同步脉冲 | `mechanics-m5m8.test.ts` | 6 用例（错回合不闩锁、一方驻留+另一方抵达闩锁、闩锁不回溯、多配对独立、撤销还原） | 单元测试通过 | 已有 |
| | `mechanics.test.ts` | 2 用例（未激活阻挡、配对后通过） | 单元测试通过 | 已有 |

## 组合与集成

| 需求 | 测试文件 | 用例 | 证据来源 | 类型 |
|------|----------|------|----------|------|
| M1+M3 组合 | `mechanics-m1m4.test.ts` | 组合 M1+M3 通关 | 单元测试通过 | 已有 |
| M1+M4 组合 | `mechanics-m1m4.test.ts` | 组合 M1+M4 通关 | 单元测试通过 | 已有 |
| M5+M4 组合 | `mechanics-m5m8.test.ts` | V_MIRROR 下单向格 | 单元测试通过 | 已有 |
| M5+M6 组合 | `mechanics-m5m8.test.ts` | 传送落点为单向格 | 单元测试通过 | 已有 |
| 全机关随机序列 | `mechanics-m5m8.test.ts` | 多机制随机序列保持 I1/I2 | 单元测试通过 | 已有 |
| 加载关卡→执行→胜利→存档→解锁 | `integration.test.ts` | 25 测试（跨模块全链路） | 集成测试通过 | 新增 |
| 机关触发→胜利→存档 | `integration.test.ts` | M1/M3/M7/M8 关卡通关后存档 | 集成测试通过 | 新增 |

## 存档

| 需求 | 测试文件 | 用例 | 证据来源 | 类型 |
|------|----------|------|----------|------|
| 双槽写入与回读 | `save-store.test.ts` | 写入后两槽一致且可回读 | 单元测试通过 | 已有 |
| 主槽损坏→备份槽回退 | `save-store.test.ts` | 主槽损坏回退备份槽 | 单元测试通过 | 已有 |
| 双槽损坏→默认值 | `save-store.test.ts` | 双槽损坏回退默认 | 单元测试通过 | 已有 |
| 空存档→默认值 | `save-store.test.ts` | 空存档回退默认 | 单元测试通过 | 已有 |
| parseSave 校验 | `save-store.test.ts` | 拒绝非法 JSON、v1、坏结构 | 单元测试通过 | 已有 |
| recordWin 推进解锁 | `save-store.test.ts` | 最佳步数、线性序号、不修改入参 | 单元测试通过 | 已有 |
| ~~v2 兼容读取~~ | `integration.test.ts` | parseSave 读 v2，返回 v3 版本 | 集成测试通过 | 新增 |
| ~~v2 无 settings 字段容错~~ | `integration.test.ts` | v2 无 settings 时 loadSettings 返回默认 | 集成测试通过 | 新增 |
| ~~v2→v3 升级~~ | `integration.test.ts` | v2 存档写入后版本升级为 3 | 集成测试通过 | 新增 |
| 设置持久化 | `integration.test.ts` | persistSettings/loadSettings 往返 | 集成测试通过 | 新增 |
| 设置独立键 | `integration.test.ts` | 存档设置键与独立设置键一致 | 集成测试通过 | 新增 |
| 损坏回退集成 | `integration.test.ts` | 主槽坏/备份槽坏/双槽坏 | 集成测试通过 | 新增 |
| 刷新后进度保持 | E2E `ui-flow.spec.ts` | 刷新后继续：第 2 关 | E2E 通过 | 新增 |
| 刷新后设置恢复 | E2E `ui-flow.spec.ts` | 设置页刷新后状态恢复 | E2E 通过 | 新增 |

## 错误恢复

| 需求 | 测试文件 | 用例 | 证据来源 | 类型 |
|------|----------|------|----------|------|
| 存档损坏回退 | `save-store.test.ts` + `integration.test.ts` | 双槽损坏回退 | 单元/集成通过 | 已有+新增 |
| WON 后忽略输入 | `core-rules.test.ts` | WON 后 MOVE 忽略 | 单元测试通过 | 已有 |
| 胜利后状态不变（属性） | `property-tests.test.ts` | WON 后所有方向被忽略 | 属性测试通过 | 新增 |
| 非法方向拒绝 | `core-rules.test.ts` | GWT-R01-2 非法方向被拒绝 | 单元测试通过 | 已有 |
| 空栈 UNDO 为 no-op | `core-rules.test.ts` | GWT-R06-2 | 单元测试通过 | 已有 |
| 同格取消回合恢复令牌 | `core-rules.test.ts` | GWT-R04-3 | 单元测试通过 | 已有 |
| 取消回合不坍塌 | `mechanics-m5m8.test.ts` | 同格取消不坍塌 | 单元测试通过 | 已有 |

## 50 关内容验证

| 需求 | 测试文件/命令 | 证据 | 类型 |
|------|--------------|------|------|
| 注册表恰 50 关 | `levels.test.ts` | LEVELS.length=50, 每章 10 关 | 已有 |
| 每关 Schema 有效 | `validate:levels` | 50 关 50 通过 | 已有 |
| 每关 BFS 可解 | `solve:levels` | 50 关全部可解 | 已有 |
| 全部 50 关 BFS 回放至胜利 | `levels.test.ts` + `property-tests.test.ts` | 50 关每关回放胜利 | 已有+新增 |
| 求解器结果稳定 | `property-tests.test.ts` | 每关 3 次重跑结果一致 | 新增 |
| 每关最优步数 ≤ parMoves | `property-tests.test.ts` | 全部 50 关 | 新增 |
| 教学关解法回放 | `levels.test.ts` | 教学解法回放至胜利 | 已有 |
| 标签完整性 | `levels.test.ts` | 每关有章节标签和机制标签 | 已有 |
| nextLevelId 链 | `levels.test.ts` | 序号连续，末关 null | 已有 |
| levelLinearIndex | `levels.test.ts` | 1-50 基序号 | 已有 |
| 全链路通关+存档 | `integration.test.ts` | 50 关每关求解→回放→recordWin | 新增 |

## E2E 覆盖

| 场景 | 测试文件 | 项目 | 类型 |
|------|----------|------|------|
| 首页健康检查 | `home.spec.ts` | 3 项目 | 已有 |
| 首页一键进入第 1 关 | `mvp.spec.ts` | 3 项目 | 已有 |
| 三输入方式通关前三关 | `mvp.spec.ts` | 3 项目 | 已有 |
| 同格取消/撤销/重开 | `mvp.spec.ts` | 3 项目 | 已有 |
| 刷新后进度恢复 | `mvp.spec.ts` | 3 项目 | 已有 |
| M2/M3/M4 渲染 | `mvp.spec.ts` | 3 项目 | 已有 |
| M4 映射同步 | `mvp.spec.ts` | 3 项目 | 已有 |
| M5 单向格通关 | `mvp.spec.ts` | 3 项目 | 已有 |
| M6 传送通关 | `mvp.spec.ts` | 3 项目 | 已有 |
| M7 脆弱格坍塌与撤销 | `mvp.spec.ts` | 3 项目 | 已有 |
| M8 脉冲门通关 | `mvp.spec.ts` | 3 项目 | 已有 |
| 视口遮挡与触控尺寸 | `mvp.spec.ts` | 3 项目 | 已有 |
| 首次用户前三关流程 | `ui-flow.spec.ts` | 3 项目 | 新增 |
| 设置页开关切换 | `ui-flow.spec.ts` | 3 项目 | 新增 |
| 设置页刷新恢复 | `ui-flow.spec.ts` | 3 项目 | 新增 |
| 刷新后进度保持 | `ui-flow.spec.ts` | 3 项目 | 新增 |
| 章节选择→关卡选择→游戏 | `ui-flow.spec.ts` | 3 项目 | 新增 |
| M7 界面可见且可通关 | `ui-flow.spec.ts` | 3 项目 | 新增 |
| M8 界面可见且可通关 | `ui-flow.spec.ts` | 3 项目 | 新增 |
| 清除进度按钮可见 | `ui-flow.spec.ts` | 3 项目 | 新增 |

## 人工验收项

以下需求目前无自动化测试，需人工验收：

| 需求 | 原因 | 验收方法 |
|------|------|----------|
| FR-08 局内教学与提示 | 提示文本依赖 UI 渲染，在 node 环境不可测 | 人工查看关卡提示 |
| FR-11 开发版本地遥测 | 属开发期工具，正式版默认关闭 | 人工检查 |
| NFR-01 性能（60 FPS） | 需要真实设备测量 | 阶段 13 验证 |
| NFR-05 可访问性（屏幕阅读器） | 需要真实屏幕阅读器 | 人工验收 |
| NFR-08 离线 | 需要断网真实环境 | 阶段 13 验证 |
| 振动 API | 未集成到 GameScene 反馈（见决策记录） | 列入技术债 |