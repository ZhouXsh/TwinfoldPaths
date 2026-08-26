# 离线验证报告

> 生成日期：2026-08-26
> 测试工具：`npm run build` + `npm run verify:dist` + Playwright 请求拦截

## 验证方法

### 1. 构建产物扫描

`scripts/verify-dist.mjs` 对 `dist/index.html` 进行静态扫描：

- **外部资源标签**：`<script src>`, `<link href>`, `<img src>`, `<iframe src>`, `<audio src>`, `<video src>`, `<source src>`
- **CSS url() 外部引用**
- **fetch() 外部调用**
- **XHR 外部请求**（XMLHttpRequest 和 sendBeacon）
- **硬编码密钥**（API key, secret key, access token, private key, Google AIza）
- **sourceMappingURL** 引用
- **.map 文件残留**
- **绝对路径引用**（如 `/assets/`）
- **动态 import() 调用**

### 2. 请求拦截验证

在 Playwright E2E 测试中，`guard()` 函数为每个页面注册 `request` 事件监听器，拦截所有非 `localhost:4173`、非 `data:`、非 `blob:` 的请求并记录为违规。

### 3. 离线启动验证

基础启动检查（默认执行，通过 `--no-startup` 跳过）：
- 启动本地静态文件服务器服务于 `dist/` 目录
- 使用 Playwright 无头 Chromium 加载页面，拦截所有请求
- 验证零外部请求、零控制台错误、canvas 出现、健康检查通过

## 验证结果

### 构建产物扫描

```
$ npm run verify:dist

dist/index.html 体积: 1.23MB (1292222 bytes)
PASS: 无外部请求、无密钥、无 source map、无绝对路径、体积在预算内
```

详细扫描结果：

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 外部资源标签 | 0 个 | 全内联，无外部 URL |
| CSS url() 外部引用 | 0 个 | 无 CSS 外部引用 |
| fetch() 外部调用 | 0 个 | 无远程 fetch 调用 |
| XHR 外部请求 | 0 个 | 无 XMLHttpRequest 外部 URL |
| sendBeacon | 0 个 | 无 |
| 硬编码密钥 | 0 个 | 无 API 密钥泄露 |
| sourceMappingURL | 0 个 | 无 source map 泄露 |
| .map 文件 | 0 个 | dist/ 无 .map 文件 |
| 绝对路径引用 | 0 个 | 所有路径为相对路径或内联 |
| 动态 import() | 0 个 | 无动态 import |
| 体积 | 1.23MB | 在预算 3MB 内 |

### E2E 请求拦截

96 个 E2E 测试全部通过，零外部请求记录。每个测试的 `guard()` 函数在 `assertClean()` 时断言 `errors` 数组为空。

### 断网运行验证

**核心验证**：`dist/index.html` 是自包含单文件。
- 所有 JS 代码已通过 `vite-plugin-singlefile` 内联到 HTML 中
- 所有贴图通过 Phaser Graphics API 程序化生成（零图片文件）
- 所有音效通过 WebAudio API 程序化合成（零音频文件）
- 关卡数据内联在 JS 中（JSON 数据，非外部文件）

**结论**：`dist/index.html` 可以在断网环境下直接运行，无需任何外部资源。

## 离线运行方法

```bash
# 方式一：直接打开（断网可用）
# 用浏览器打开 dist/index.html 即可

# 方式二：通过静态服务器（推荐用于测试）
npm run build
npx serve dist/  # 或任何静态文件服务器
```

## 外部引用白名单

以下引用出现在构建产物中，均为内联/本地引用，不构成外部依赖：

| 引用类型 | 内容 | 说明 |
|----------|------|------|
| SVG namespace | `xmlns="http://www.w3.org/2000/svg"` | XML 命名空间声明，非网络请求 |
| XHTML namespace | `xmlns="http://www.w3.org/1999/xhtml"` | XML 命名空间声明，非网络请求 |
| data: URI | `data:image/png;base64,...` | 内联图片数据 |
| blob: URI | 仅在 WebAudio 合成中使用 | 内存中音频数据 |

## 验证命令摘要

```powershell
# 构建
npm run build

# 产物扫描
npm run verify:dist

# 基础启动检查（默认执行，需要 Playwright；跳过用 --no-startup）
npm run verify:dist

# E2E 测试（含请求拦截）
npm run test:e2e
```

## 结论

**离线启动成功** ✅

- `dist/index.html` 是自包含单文件，无任何外部网络依赖
- 零外部资源引用、零密钥泄露、零 source map 泄露
- 所有 E2E 测试通过请求拦截验证，零外部请求
- 可在断网环境下直接运行