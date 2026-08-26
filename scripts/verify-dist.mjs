#!/usr/bin/env node
/**
 * 构建产物全面校验：
 * 1. 单文件存在性
 * 2. 外部资源引用（http/https 标签、css url()、fetch）
 * 3. 硬编码密钥
 * 4. 体积预算（ADR-009：>3MB 触发复查）
 * 5. sourceMappingURL 扫描
 * 6. .map 文件残留
 * 7. 绝对路径引用（如 /assets/）
 * 8. 动态 import() 调用
 * 9. 基础启动检查（默认执行，设 --no-startup 跳过）
 *    使用 Playwright 无头加载本地 dist/index.html，验证 canvas 出现且无外部请求。
 *    若 playwright 不可用，给出明确提示后继续（不阻断 check 流程）。
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
const file = resolve(process.cwd(), 'dist', 'index.html');
const errors = [];

const skipStartup = process.argv.includes('--no-startup');

// === 1. 存在性检查 ===
if (!existsSync(file)) {
  console.error('FAIL: dist/index.html 不存在，请先运行 npm run build');
  process.exit(1);
}

const html = readFileSync(file, 'utf8');
const bytes = statSync(file).size;
const mb = bytes / 1024 / 1024;

// === 2. 外部资源引用 ===
const tagRefs = [
  ...html.matchAll(
    /<(script|link|img|iframe|audio|video|source)[^>]*(?:src|href)=["']([^"']+)["']/gi
  )
];
for (const m of tagRefs) {
  const url = m[2];
  if (/^(https?:)?\/\//i.test(url)) errors.push(`外部资源引用: <${m[1]}> -> ${url}`);
}
for (const m of html.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)/gi)) {
  errors.push(`css url() 外部引用: ${m[1]}`);
}
for (const m of html.matchAll(/fetch\(\s*["'](https?:\/\/[^"']+)["']/g)) {
  errors.push(`fetch 外部请求: ${m[1]}`);
}
// 检查 XMLHttpRequest 与 window.open 中的外部 URL
for (const m of html.matchAll(/XMLHttpRequest\(\s*["'](https?:\/\/[^"']+)["']/g)) {
  errors.push(`XHR 外部请求: ${m[1]}`);
}
// 检查 navigator.sendBeacon 外部 URL
for (const m of html.matchAll(/sendBeacon\(\s*["'](https?:\/\/[^"']+)["']/g)) {
  errors.push(`sendBeacon 外部请求: ${m[1]}`);
}

// === 3. 密钥扫描 ===
const keyLike = html.match(
  /["']?(api[_-]?key|secret[_-]?key|access[_-]?token|private[_-]?key)["']?\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i
);
if (keyLike) errors.push(`疑似硬编码密钥: ${keyLike[0].slice(0, 40)}...`);

// 检查 AIza 模式（Google API key）
const aiKey = html.match(/AIza[0-9A-Za-z_-]{35}/);
if (aiKey) errors.push(`疑似 Google API 密钥: ${aiKey[0].slice(0, 20)}...`);

// === 4. 体积检查 ===
if (mb > 3) errors.push(`单文件体积 ${mb.toFixed(2)}MB 超出预算 3MB（ADR-009 复查条件）`);

// === 5. sourceMappingURL 扫描 ===
const sourceMapRefs = [...html.matchAll(/\/\/#\s*sourceMappingURL=/g)];
if (sourceMapRefs.length > 0) errors.push(`发现 ${sourceMapRefs.length} 处 sourceMappingURL 引用`);

// === 6. .map 文件残留 ===
const distDir = resolve(process.cwd(), 'dist');
const mapFiles = [];
if (existsSync(distDir)) {
  const { readdirSync } = await import('node:fs');
  const entries = readdirSync(distDir);
  for (const entry of entries) {
    if (entry.endsWith('.map')) mapFiles.push(entry);
  }
}
if (mapFiles.length > 0) errors.push(`dist/ 目录残留 .map 文件: ${mapFiles.join(', ')}`);

// === 7. 绝对路径引用 ===
// 排除 data: 和 blob: 和 javascript: 和 # 开头的引用
const absPathRefs = [
  ...html.matchAll(/<(script|link|img|iframe)[^>]*(?:src|href)=["'](\/[^"']+)["']/gi)
];
for (const m of absPathRefs) {
  const url = m[2];
  // 排除合法的相对路径（以 ./ 开头的会被前面的匹配到，但这里只匹配 / 开头的绝对路径）
  if (url.startsWith('/') && !url.startsWith('//')) {
    errors.push(`绝对路径引用: <${m[1]}> -> ${url}`);
  }
}

// === 8. 动态 import() 检查 ===
const dynamicImportMatches = [...html.matchAll(/\bimport\s*\(\s*["'`]/g)];
if (dynamicImportMatches.length > 0) {
  errors.push(`发现 ${dynamicImportMatches.length} 处动态 import() 调用`);
}

const gzipEstimate = (bytes * 0.27).toFixed(0);
console.log(
  `dist/index.html 体积: ${mb.toFixed(2)}MB (${bytes} bytes)  gzip 估计: ${gzipEstimate} bytes`
);

// === 9. 基础启动检查（默认执行） ===
if (!skipStartup) {
  console.log('运行基础启动检查（Playwright 无头模式）...');
  // 启动一个静态文件服务
  const { createServer } = await import('node:http');
  const { readFileSync: readDist } = await import('node:fs');
  const { extname } = await import('node:path');

  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.map': 'application/json'
  };

  const server = createServer((req, res) => {
    let pathname = req.url;
    if (pathname === '/' || pathname === '') pathname = '/index.html';
    // 仅允许 dist/ 下的文件
    const filePath = resolve(distDir, '.' + pathname);
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      const content = readDist(filePath);
      const ext = extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  const PORT = 9876;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const serverUrl = `http://localhost:${PORT}`;

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const externalRequests = [];
    const consoleErrors = [];

    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith(serverUrl) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url);
      }
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto(serverUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // 等待 canvas 出现（Phaser 创建）
    const canvasAppeared = await page
      .waitForSelector('canvas', { timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    // 检查健康检查状态
    let healthOk = false;
    try {
      const statusText = await page.getByTestId('status').textContent({ timeout: 10000 });
      healthOk = statusText.includes('健康检查');
    } catch {
      // ignore
    }

    await browser.close();

    if (externalRequests.length > 0) {
      errors.push(
        `启动检查: 发现 ${externalRequests.length} 个非本地请求: ${externalRequests.join(', ')}`
      );
    } else {
      console.log('  启动检查: ✓ 零外部请求');
    }

    if (consoleErrors.length > 0) {
      errors.push(`启动检查: 发现 ${consoleErrors.length} 个控制台错误`);
      for (const e of consoleErrors.slice(0, 5)) {
        errors.push(`  - ${e.slice(0, 200)}`);
      }
    } else {
      console.log('  启动检查: ✓ 无控制台错误');
    }

    if (!canvasAppeared) {
      errors.push('启动检查: canvas 元素未出现，游戏可能未正常启动');
    } else {
      console.log('  启动检查: ✓ canvas 已出现');
    }

    if (healthOk) {
      console.log('  启动检查: ✓ 健康检查通过');
    }

    console.log(
      `  启动检查: ${canvasAppeared && externalRequests.length === 0 && consoleErrors.length === 0 ? '通过' : '发现问题'}`
    );
  } catch (e) {
    const msg = e.message;
    // playwright 缺失不阻断，给出提示
    if (msg.includes('Cannot find module') || msg.includes('playwright')) {
      console.error(
        `  启动检查跳过: playwright 模块不可用 (${msg.slice(0, 80)}). 安装: npx playwright install chromium`
      );
    } else {
      errors.push(`启动检查失败: ${msg}`);
      console.error(`  启动检查异常: ${msg}`);
    }
  } finally {
    server.close();
  }
}

// === 输出 ===
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} 个问题`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log('PASS: 无外部请求、无密钥、无 source map、无绝对路径、体积在预算内');
