# UI 小清新重设计与错位修复报告（2026-08-27，计划外迭代）

> 用户发起，位于阶段 14（已完成）与阶段 15（pending）之间。非阶段提示词任务，不占用阶段编号。
> 执行：coder 子代理实施；主代理独立验收。本报告数据全部来自真实命令输出。

## 任务范围

- 视觉：暗色主题 → 小清新浅色主题（米白底 #F7F4F0 / 白卡片 / 柔和天蓝 #5BB8FF + 暖橙 #FFA94D 品牌双色调）。
- 布局：修复部件错位，参考 `DEMO/index.html` 的结构（flex 纵向流、safe-area、44px 触控目标、d-pad grid）。
- 约束：纯表现层；`src/domain/` 与 `DEMO/` 零改动（已用 `git diff --name-only` 验证）。

## 改动文件

| 文件 | 内容 |
|---|---|
| `index.html` | CSS 变量体系重写；浅色主题；HUD/状态/控制区分层卡片化；320px 窄视口响应式；`theme-color` 更新 |
| `src/main.ts` | Phaser 背景色 `#101418` → `#F0EBE5` |
| `src/scenes/BootScene.ts` | 全部机关纹理（瓦片/墙/双角色/出口/压板/门/暂停格/切换器/令牌/单向/传送/脆弱/脉冲）浅色化 |
| `src/scenes/HomeScene.ts` | 标题文字配色适配浅底 |
| `src/scenes/ResultScene.ts` | 结算文字配色适配浅底 |
| `artifacts/stage-08/*.png`（66 张） | E2E 视觉证据截图随主题自动更新（可再生） |

未改动：`src/domain/`、`src/scenes/dom-ui.ts`、`src/scenes/GameScene.ts`、关卡数据、测试断言（所有 `data-testid` 保持不变，E2E 无需修改）。

## 修复的错位/视觉问题

1. HUD 与棋盘、控制区与页面无视觉边界 → 卡片分层（白底 + 分隔线 + 阴影）
2. 方向预览指示器在浅底下不可见 → 半透明白色圆盘 + 阴影
3. Phaser 画布背景与 DOM 背景色不一致 → 统一为 #F0EBE5
4. 320px 窄视口 dpad 紧贴边缘 → `@media (max-width: 360px)` 缩小按钮与间隙
5. safe-area 处理复核确认（`env(safe-area-inset-*)` + `max()` 兜底）

## 验收记录（主代理独立执行）

| 命令 | 结果 |
|---|---|
| `npx prettier --write index.html src/scenes/BootScene.ts` | 修复子代理遗留的格式问题（子代理只跑了 eslint 未跑 format:check） |
| `npm run check` | ALL STEPS PASSED（12 步全过，含 build 1.29MB / verify:dist / 依赖边界 27 文件） |
| `npx playwright test --workers=4` | 96 passed（chromium + webkit + mobile-320，1.4m） |
| 布局/配色程序化校验（临时脚本，双视口 320×568 与 390×844） | 全部通过：body #F7F4F0、HUD #FFFFFF、dpad #E8F4FD、棋盘瓦片像素 #F0EBE5；棋盘水平居中偏移 0px、完全在视口内；dpad 与棋盘无重叠 |

校验脚本位于 `C:\Users\53016\AppData\Local\Temp\opencode\verify-ui.cjs`（临时目录，未入仓库）。

## 过程中发现并纠正的子代理问题

1. **prettier 未通过**：子代理报告 lint 通过但未检查格式；已修复并全量重跑 check。
2. **临时文件违规入仓库**：子代理将 `tests/screenshots.spec.ts` 写入仓库（要求写临时目录）；已移至 `C:\Users\53016\AppData\Local\Temp\opencode\`，仓库工作区已无该文件。

## 遗留风险与未验证项

- E2E 8 workers 并行存在 pre-existing flaky 失败（资源竞争超时，非本次引入）；验收基线为 4 workers 96/96。
- Firefox 未安装（与阶段 13 记录一致），未验证。
- 真人主观审美评价：未开展（截图证据在 `artifacts/stage-08/`，供用户自行查看）。
- 320×568 / 390×844 程序化校验为 chromium 单引擎；mobile-320 E2E 项目覆盖 320×568 交互，webkit 渲染由 E2E 截图测试覆盖。

## 未提交

改动留在工作区，未提交（用户未要求 commit）。
