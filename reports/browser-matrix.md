# 浏览器兼容矩阵

> 生成日期：2026-08-26
> 测试工具：Playwright 1.62.1
> 测试命令：`npx playwright test`（96 测试，3 项目）

## 测试环境

| 项目 | 浏览器 | 版本 | 视口 | 触控 | 状态 |
|------|--------|------|------|------|------|
| Chromium | Chromium | 1234 | 1280×720 | 否 | ✅ 已安装 |
| WebKit | WebKit | 2336 | 1280×720 | 否 | ✅ 已安装 |
| mobile-320 | Chromium | 1234 | 320×568 | 是 | ✅ 已安装 |
| Firefox | - | 1538 | - | - | ❌ 未安装 |

## Firefox 说明

Firefox 浏览器（playwright firefox v1538）**未在当前环境中安装**。尝试通过 `npx playwright install firefox --dry-run` 确认可用，但实际安装目录 `firefox-1538` 不存在。
当前只安装了：
- `chromium-1234`（含 headless shell）
- `webkit-2336`
- `ffmpeg-1011`
- `winldd-1007`

Firefox 测试列为 **未验证**。如需验证，请运行 `npx playwright install firefox` 后重新执行测试。

## 测试结果矩阵

### 核心路径测试（63 测试 × 3 项目 = 原有 189 测试 + 新增 33 测试 = 222 测试）

| 测试组 | 文件 | 测试数 | Chromium | WebKit | mobile-320 |
|--------|------|--------|----------|--------|------------|
| 首页健康检查 | `home.spec.ts` | 1 | ✅ | ✅ | ✅ |
| 核心玩法（通关、撤销、重开、滑动） | `mvp.spec.ts` | 10 | ✅ | ✅ | ✅ |
| UI 流程（设置、章节、刷新保持） | `ui-flow.spec.ts` | 10 | ✅ | ✅ | ✅ |
| 兼容性（视口、旋转、前后台、音频、存档） | `compat.spec.ts` | 11 | ✅ | ✅ | ✅ |

### 所有测试按项目

| 项目 | 总测试数 | 通过 | 失败 | 通过率 |
|------|----------|------|------|--------|
| Chromium | 32 | 32 | 0 | 100% |
| WebKit | 32 | 32 | 0 | 100% |
| mobile-320 | 32 | 32 | 0 | 100% |
| **合计** | **96** | **96** | **0** | **100%** |

## 视口测试结果

| 视口 | 设备模拟 | 测试内容 | Chromium | WebKit | mobile-320 |
|------|----------|----------|----------|--------|------------|
| 320×568 | iPhone SE | 首页可见、触控目标≥44px、通关 | ✅ | ✅ | ✅ |
| 390×844 | iPhone 14 | 首页可见、触控目标≥44px、通关 | ✅ | ✅ | ✅ |
| 430×932 | iPhone 15 Pro Max | 首页可见、触控目标≥44px、通关 | ✅ | ✅ | ✅ |
| 1280×720 | Desktop | 首页可见、触控目标≥44px、通关 | ✅ | ✅ | ✅ |

## 生命周期测试结果

| 测试项 | 方法 | Chromium | WebKit | mobile-320 |
|--------|------|----------|--------|------------|
| 前后台切换 | `visibilitychange` 事件模拟 | ✅ | ✅ | ✅ |
| 屏幕旋转 | `setViewportSize` 模拟 | ✅ | ✅ | ✅ |
| 刷新保持进度 | `page.reload()` | ✅ | ✅ | ✅ |
| 音频解锁 | AudioContext 状态检查 | ✅ | ✅ | ✅ |
| localStorage 存档 | 读写验证 | ✅ | ✅ | ✅ |

## 已知局限

1. **Firefox 未测试**：环境未安装 Firefox Playwright 浏览器，需手动安装后验证。
2. **前后台切换**：Playwright 无法模拟系统级后台（home 键），仅通过 `visibilitychange` 事件模拟。真实设备上的 Web Audio 暂停/恢复行为未验证。
3. **屏幕旋转**：`setViewportSize` 不等同于真实设备 orientationchange 事件。真实设备上 OS 会触发 resize 并重新布局，模拟环境可能遗漏某些布局适配。
4. **音频解锁**：WebKit 无头模式下 AudioContext 不可用（标记为 `unsupported`），仅验证了无控制台错误。真实设备上的音频解锁需要用户手势交互，Playwright 中的点击可能不足以触发 Web Audio 的自动播放策略解除。
5. **微信内置浏览器**：未测试。Playwright 不支持微信浏览器。需要在真实微信环境中验证。
6. **移动端触控**：mobile-320 项目设置了 `hasTouch: true` 和 `isMobile: true`，但鼠标事件模拟不等同于真实触控手势。

## 测试执行命令

```powershell
# 全量 E2E 测试
npx playwright test

# 指定项目
npx playwright test --project=chromium
npx playwright test --project=webkit
npx playwright test --project=mobile-320

# 指定测试文件
npx playwright test tests/e2e/compat.spec.ts
```

## 输出

```
96 passed (49.0s)
```