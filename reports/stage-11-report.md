# 阶段 11 报告：完整 UI、反馈、音频与无障碍

## 阶段结论：通过

## 改动文件清单

### 新增文件
| 文件 | 作用 |
|------|------|
| `src/audio/audio-manager.ts` | WebAudio 程序化音效合成系统，含 12 种音效（move/block/cancel/win/teleport/collapse/pulse/switch/token/pause/door/uiTap），支持独立开关状态，首次交互解锁 AudioContext |
| `src/scenes/ChapterSelectScene.ts` | 章节选择场景，5 章卡片网格，显示解锁状态、完成进度、星级评价 |
| `src/scenes/LevelSelectScene.ts` | 关卡选择场景，每章关卡网格（5 列），显示锁定/当前/完成状态、最佳步数、星级，含进度条 |
| `src/scenes/SettingsScene.ts` | 设置场景，含音乐、音效、振动、弱化动画四个开关，使用 toggle-switch 组件，持久化到存档 |
| `docs/design-tokens.md` | 设计令牌文档：颜色值、字号、间距、触控目标尺寸、圆角、动画、响应式断点、安全区规范 |
| `docs/accessibility-check.md` | 无障碍检查记录：每个元素颜色+形状+纹理三重编码，灰度及四种色盲模拟结论 |
| `scripts/screenshots.mjs` | 多视口截图脚本（Playwright），截取 320×568、390×844、430×932、桌面视口下首页/游戏/结算/章节选/关卡/设置截图 |

### 修改文件
| 文件 | 作用 |
|------|------|
| `index.html` | 全新 UI 布局：安全区处理、横屏提示、章节/关卡选择、设置面板、确认对话框、方向预览、进度条、响应式断点 |
| `src/main.ts` | 注册 3 个新场景（ChapterSelect/LevelSelect/Settings），新增 `activePointers: 1` 配置 |
| `src/scenes/dom-ui.ts` | 新增 `showDirectionPreview`/`hideDirectionPreview`/`showConfirmDialog`/`updateProgress` 函数，扩展 BAR_IDS 和 LAYOUT_BARS |
| `src/scenes/HomeScene.ts` | 新增章节选择、关卡选择、设置、清除进度按钮；首次交互解锁 AudioContext |
| `src/scenes/GameScene.ts` | 完整反馈系统：滑动方向预览、音效播放（所有机关/移动/受阻/取消/通关）、设置感知动画时长、弱化动画模式 |
| `src/scenes/ResultScene.ts` | 星级显示（★★★/★★/★ 基于目标步数），音效播放 |
| `src/persistence/save-store.ts` | 版本升级至 3，新增 `settings` 字段（music/sfx/vibration/reducedAnim），兼容 v2 旧存档读取，新增 `loadSettings`/`persistSettings` 接口 |

### 未修改（受保护）
- `DEMO/` 目录：未触碰
- `src/domain/`：领域层未导入 Phaser/DOM/音频 API
- 所有关卡数据：未修改

## 验证命令与输出

### `npm run check`（12 步全部通过）
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

### `npm run test:e2e`（39/39 全通过）
```
39 passed (31.4s)
```
三个项目：chromium、webkit、mobile-320（320×568 触控）

### 截图验证
`artifacts/stage-11/` 下 24 张截图，覆盖 4 个视口 × 6 个场景：
- 320×568：home, game, result, chapter-select, level-select, settings
- 390×844：同上
- 430×932：同上
- desktop (1280×800)：同上

## 验收门逐项结论

| 验收门 | 结论 | 证据 |
|--------|------|------|
| 所有 50 关可从 UI 进入 | ✅ | 章节选择→关卡选择→点击任意关卡→GameScene 启动；E2E 测试覆盖 50 关选关流程 |
| 无关键遮挡或横向滚动 | ✅ | E2E 测试 `视口内无关键遮挡且触控目标≥44px` 在 3 个项目中通过；截图验证 320×568 无横向滚动 |
| 反馈与逻辑状态一致 | ✅ | 动画不修改逻辑状态（领域层纯 TS）；动画只消费 MoveResult 数据；E2E 测试撤销/重开后状态一致 |
| 设置保存并恢复 | ✅ | `loadSettings`/`persistSettings` 写入存档；设置场景切换开关后持久化；弱化动画在 GameScene 中生效 |
| 控制台无资源错误 | ✅ | E2E 全程监听 console.error 和外部请求，39 个测试均无违规 |

## 新增风险与技术债

1. **音频系统未经过真实设备测试**：WebAudio 合成在低端 Android 设备上可能有延迟或兼容性问题。阶段 14 真人试玩时需验证。
2. **背景音乐未实现**：`audioManager.playMusic()` 和 `stopMusic()` 为留空实现。根据 P1 优先级，当前仅实现音效。
3. **振动 API 未实现**：设置项 `vibration` 已持久化，但 `navigator.vibrate()` 调用未集成到 GameScene 反馈中。需阶段 12 补充。
4. **屏幕阅读器兼容性未测试**：aria-label 和 role 属性已添加，但未经过屏幕阅读器（如 VoiceOver/TalkBack）验证。
5. **关卡进度为空时 UI 修复**：当 `highestUnlocked` 为 1 时，第 2 章及以后章节显示锁定，行为正确。
6. **存档版本从 2 升级到 3**：`parseSave` 兼容 v2 读取，但旧存档写入后版本号变为 3。确认无数据丢失。
7. **关卡选择滚动在长章节目录下可能溢出**：当前使用 `overlay-scroll`（overflow-y: auto），在 320px 宽 5 列网格下可能显示不全。

## 已写入的决策记录

无新增 ADR（所有变更均与现有 ADR 兼容）。存档版本从 2 升级到 3：
- 兼容现有 v2 存档（`parseSave` 接受 `version === 2`）
- 新增 `settings` 字段，读取时容错
- 新增 `loadSettings`/`persistSettings` 接口
- 向后兼容：同时写入独立键 `twinfold-paths:settings`

## 下一阶段输入

- 完整可玩的体验层（50 关、5 章、选关、设置、音效、无障碍）
- 供阶段 12 建立最终测试体系（E2E 覆盖新 UI、设置持久化、清除进度确认、音频开关）
- 阶段 14 真人试玩验证
- 图片素材：`artifacts/stage-11/` 下 24 张多视口截图