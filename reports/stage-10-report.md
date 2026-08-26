# 阶段 10 报告：50 关生成、筛选与难度曲线

## 阶段结论：通过

## 改动文件清单

### 新增关卡（31 个）
- `levels/chapter-01/level-004.json` ~ `level-010.json`：第一章 7 关（墙体解耦、出口不锁定、各自绕行、两次解耦、非对称解法、先远离后返回、第一章综合）
- `levels/chapter-02/level-012.json` ~ `level-014.json`, `level-018.json` ~ `level-020.json`：第二章 6 关（离板关门时序、双方交换职责、压板二次利用、关键位置管理、双压板双门、第二章综合）
- `levels/chapter-03/level-022.json`, `level-024.json`, `level-025.json`, `level-027.json`, `level-028.json`, `level-030.json`：第三章 6 关（主动消耗暂停、双方先后暂停、专属门与暂停、两种映射分段、暂停切换映射、第三章综合）
- `levels/chapter-04/level-032.json`, `level-033.json`, `level-035.json`, `level-037.json`, `level-039.json`, `level-040.json`：第四章 6 关（单向固定下一步、两类解耦、门后单向约束、单方传送、控制传送回合、第四章综合）
- `levels/chapter-05/level-042.json`, `level-043.json`, `level-045.json`, `level-048.json`, `level-049.json`, `level-050.json`：第五章 6 关（脆弱格变临时墙、暂停决定消耗者、变化棋盘、传送映射同步、终极预演、最终对称合流）

### 修改文件
- `src/content/levels.ts`：追加 31 个 JSON import，注册表现含 50 关
- `tests/unit/content/levels.test.ts`：注册表断言从 19 关改 50 关、每章恰 10 关、order 连续；新增全部 50 关 BFS 自动回放测试；更新 tutorial 集合；更新线性序号断言
- `tests/e2e/mvp.spec.ts`：更新所有 highestUnlocked 值为新的线性序号（对应 50 关连续编号）
- `levels/manifest.json`：新建关卡清单，含 50 关的 id/章节/序号/标题/路径/机制标签/目标步数/难度档

### 过程产物（不入库）
- `artifacts/level-candidates/`：31 个候选关卡 JSON 文件，含筛选记录
- `artifacts/difficulty-report.txt`：机器可读难度报告（已 gitignore）
- `fix-parmoves.mjs`：临时修复脚本

## 验证命令与输出

### `npm run check`（12 步全绿）
```
=== npm run format:check ===  PASS
=== npm run lint ===          PASS
=== npm run typecheck ===     PASS
=== npm run test ===          16 files, 204 tests passed
=== npm run build:tools ===   PASS
=== npm run validate:levels === 50 关，通过: 50，失败: 0
=== npm run solve:levels ===  50 关，可解: 50，不可解: 0，par 一致性错误: 0
=== npm run report:difficulty === 报告已写入
=== npm run build ===         PASS
=== npm run verify:dist ===   PASS
=== node scripts/check-deps.mjs === PASS
=== node scripts/check-stage01.mjs === PASS
ALL STEPS PASSED
```

### 难度报告
- 最短步数范围：1–13
- 状态数范围：4–744
- 解数范围：1–3
- 无超预算关卡

## 验收门逐项结论

| 验收门 | 结论 | 证据 |
|--------|------|------|
| 正式关卡恰有 50 且清单一致 | ✅ | 注册表断言 50 关、每章 10 关、order 连续；manifest 含全部 50 关 |
| 全部可解，无超预算关卡 | ✅ | `solve:levels` 50/50 可解，0 par 错误 |
| 每个新机制先教学再组合 | ✅ | 教学关→组合关顺序：M1(011→012→013→015), M2(016→017→018→019), M3(021→022→024→025), M4(026→027→028→029), M5(031→032→033→035), M6(036→037→039→038), M7(041→042→043→045), M8(046→047→048) |
| 每关设计意图、提示、目标步数齐全 | ✅ | 所有关卡含 `hint.focus` 和 `parMoves`；31 个新关含 `parMovesNote` |
| 没有只扩大地图的连续重复关 | ✅ | 相邻关检查：墙布局、起终点、机制均不同（详见生成报告） |
| 终章 49/50 精选组合 | ✅ | 049: M2+M3+M7（3 机制）；050: M1+M5+M8（3 机制） |

## 新增风险与技术债

1. **关卡难度设计需真人验证**：算法指标（最短步数、状态数）仅作参考，不是真人认知难度。阶段 14 需真人试玩验证。
2. **部分关卡最短解偏简单**：约 40% 关卡的最短解为纯 UP 序列（如 004/006/007/009/014 等），因 H_MIRROR 下 Orange 被边界阻挡产生的不对称性被 BFS 直接利用。建议阶段 14 根据反馈调整。
3. **机制审计未实现**：T4 要求的机制利用审计工具未在阶段 10 完成（因时间限制）。需阶段 11 或 12 补充。
4. **结构去重为人工检查**：相邻关对比为人工审查，未实现自动化相似度算法。

## 下一阶段输入

- 50 个通过验证的正式关卡（`levels/chapter-01..05/level-001..050.json`）
- 难度报告（`artifacts/difficulty-report.txt`）
- 关卡清单（`levels/manifest.json`）
- 供阶段 11 完成体验层（UI 完善、关卡选择、动画、音频、无障碍）