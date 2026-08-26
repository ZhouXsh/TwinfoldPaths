#!/usr/bin/env node
/**
 * 性能测量脚本（阶段 13）
 * 自动连续通关 10 关（第 1-1 至 1-10），通过 CDP Performance.getMetrics
 * 采样每关后的 JSHeapUsedSize，验证无持续内存增长。
 *
 * 用法：
 *   node scripts/measure-perf.mjs
 * 前置条件：先运行 npm run build（脚本会检查 dist/index.html 是否存在）
 *
 * 通关驱动方式：
 * - 读取 artifacts/solve-results.json 中前 10 关的解序列
 * - 点击方向按钮（btn-up/down/left/right）执行步数
 * - 等待结算后点击 btn-next 进入下一关
 * - 每关结束后通过 CDP 采样 JSHeapUsedSize
 *
 * 内存断言标准：
 * - 后半程（第 8-10 关）平均堆内存 ≤ 前半程（第 1-3 关）平均值的 130%
 * - 不满足则非零退出
 *
 * 方法局限：
 * - 仅 Chromium 支持 CDP（WebKit 不支持）
 * - 内存数值受 GC 时机影响，使用 HeapProfiler.collectGarbage 降噪
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';

const DIST_FILE = resolve(process.cwd(), 'dist', 'index.html');
const SOLVE_RESULTS = resolve(process.cwd(), 'artifacts', 'solve-results.json');
const PORT = 9877;

// 前 10 关的解序列（从 solve-results.json 读取）
function loadLevelSolutions() {
  if (!existsSync(SOLVE_RESULTS)) {
    console.error('FAIL: artifacts/solve-results.json 不存在，请先运行 npm run solve:levels');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(SOLVE_RESULTS, 'utf8'));
  const results = data.results.filter((r) => {
    const num = parseInt(r.id.replace('level-', ''), 10);
    return num >= 1 && num <= 10;
  });
  if (results.length < 10) {
    console.error(`FAIL: solve-results.json 中前 10 关数据不足（找到 ${results.length} 关）`);
    process.exit(1);
  }
  return results.sort(
    (a, b) => parseInt(a.id.replace('level-', ''), 10) - parseInt(b.id.replace('level-', ''), 10)
  );
}

// 方向映射：解序列中的方向名 → data-testid 按钮名
const DIR_TO_BTN = {
  UP: 'btn-up',
  DOWN: 'btn-down',
  LEFT: 'btn-left',
  RIGHT: 'btn-right'
};

// 方向映射：解序列中的方向名 → 键盘键
const DIR_TO_KEY = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight'
};

async function main() {
  // 检查构建产物
  if (!existsSync(DIST_FILE)) {
    console.error('FAIL: dist/index.html 不存在，请先运行 npm run build');
    process.exit(1);
  }

  const levels = loadLevelSolutions();
  console.log('=== 性能测量：连续 10 关内存趋势 ===\n');
  console.log(`测量环境: Windows, Node v${process.version}, Playwright Chromium 无头`);
  console.log(`构建产物: ${(statSync(DIST_FILE).size / 1024 / 1024).toFixed(2)}MB\n`);

  // 启动本地静态服务器
  const distDir = resolve(process.cwd(), 'dist');
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
    const filePath = resolve(distDir, '.' + pathname);
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      const content = readFileSync(filePath);
      const ext = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  const serverUrl = `http://localhost:${PORT}`;

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();

    // 控制台错误收集
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    // === 内存采样函数 ===
    async function sampleMemory(levelName) {
      try {
        const cdpSession = await context.newCDPSession(page);
        // 启用 Performance 域
        await cdpSession.send('Performance.enable');
        // 强制 GC 以降低噪声
        await cdpSession.send('HeapProfiler.collectGarbage');
        // 获取性能指标
        const metrics = await cdpSession.send('Performance.getMetrics');
        await cdpSession.detach();

        // 查找 JSHeapUsedSize 指标
        const heapMetric = metrics.metrics.find((m) => m.name === 'JSHeapUsedSize');
        const heapTotal = metrics.metrics.find((m) => m.name === 'JSHeapTotalSize');
        const jsHeapUsed = heapMetric ? heapMetric.value : null;
        const jsHeapTotal = heapTotal ? heapTotal.value : null;

        // 也尝试通过 performance.memory 读取（备选）
        const memInfo = await page.evaluate(() => {
          if (performance.memory) {
            return {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
          }
          return null;
        });

        return {
          level: levelName,
          cdpHeapUsed: jsHeapUsed,
          cdpHeapTotal: jsHeapTotal,
          perfMemory: memInfo
        };
      } catch (e) {
        // CDP 不可用时回退到 performance.memory
        const memInfo = await page.evaluate(() => {
          if (performance.memory) {
            return {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
          }
          return null;
        });
        return {
          level: levelName,
          cdpHeapUsed: null,
          cdpHeapTotal: null,
          perfMemory: memInfo,
          error: e.message
        };
      }
    }

    // === 加载首页 ===
    console.log('加载游戏首页...');
    await page.goto(serverUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.getByTestId('status').waitFor({ state: 'visible', timeout: 15000 });
    console.log('  首页加载完成\n');

    // 初始内存采样
    const initialMem = await sampleMemory('initial');
    console.log(
      `  初始内存: CDP JSHeapUsedSize=${formatBytes(initialMem.cdpHeapUsed)}, ` +
        `performance.memory=${initialMem.perfMemory ? formatBytes(initialMem.perfMemory.usedJSHeapSize) : 'N/A'}\n`
    );

    // === 进入第 1 关 ===
    await page.getByTestId('btn-start').click();
    await page.getByTestId('move-count').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);

    // === 逐关通关 ===
    const memorySamples = [];
    const SETTLE_MS = 300;

    for (const level of levels) {
      const levelNum = parseInt(level.id.replace('level-', ''), 10);
      console.log(`--- 关卡 ${levelNum}/10: ${level.id} (${level.optimalSteps} 步) ---`);

      // 解析解序列
      const moves = level.solution.split(' ');

      // 执行每一步
      for (let i = 0; i < moves.length; i++) {
        const dir = moves[i];
        const btnTestId = DIR_TO_BTN[dir];
        const key = DIR_TO_KEY[dir];

        await page.getByTestId(btnTestId).click();
        // 等待 move-count 更新
        try {
          await page.getByTestId('move-count').waitFor({
            state: 'visible',
            timeout: 5000
          });
        } catch {
          // 可能是同格取消导致步数不变，尝试键盘输入
          await page.keyboard.press(key);
          await page.waitForTimeout(500);
        }
        await page.waitForTimeout(SETTLE_MS);
      }

      // 等待结算结果出现
      try {
        await page.getByTestId('result-text').waitFor({ state: 'visible', timeout: 5000 });
      } catch {
        console.error(`  警告: 关卡 ${level.id} 结算结果未出现，尝试继续`);
      }

      // 内存采样
      const memSample = await sampleMemory(level.id);
      memorySamples.push(memSample);

      const cdpStr = memSample.cdpHeapUsed !== null ? formatBytes(memSample.cdpHeapUsed) : 'N/A';
      const perfStr = memSample.perfMemory
        ? formatBytes(memSample.perfMemory.usedJSHeapSize)
        : 'N/A';
      console.log(`  JSHeapUsedSize: CDP=${cdpStr}, performance.memory=${perfStr}`);

      // 进入下一关（如果是最后一关则跳过）
      if (levelNum < 10) {
        try {
          await page.getByTestId('btn-next').click();
          await page.waitForTimeout(500);
          // 等待新关卡加载
          await page.getByTestId('move-count').waitFor({ state: 'visible', timeout: 5000 });
          await page.waitForTimeout(300);
        } catch (e) {
          console.error(`  警告: 进入下一关失败: ${e.message}`);
        }
      }
    }

    console.log('\n=== 内存趋势分析 ===\n');

    // 打印表格
    console.log('关卡        | CDP JSHeapUsedSize | performance.memory');
    console.log('------------|--------------------|---------------------');
    for (const s of memorySamples) {
      const cdp =
        s.cdpHeapUsed !== null ? formatBytes(s.cdpHeapUsed).padStart(12) : 'N/A'.padStart(12);
      const perf = s.perfMemory
        ? formatBytes(s.perfMemory.usedJSHeapSize).padStart(12)
        : 'N/A'.padStart(12);
      console.log(`${s.level.padEnd(11)} | ${cdp} | ${perf}`);
    }

    // 使用 CDP 数据（优先）或 performance.memory 数据做趋势分析
    const useCDP = memorySamples.every((s) => s.cdpHeapUsed !== null);
    let heapValues;
    let sourceName;

    if (useCDP) {
      heapValues = memorySamples.map((s) => s.cdpHeapUsed);
      sourceName = 'CDP JSHeapUsedSize';
    } else {
      // 回退到 performance.memory
      heapValues = memorySamples.map((s) => (s.perfMemory ? s.perfMemory.usedJSHeapSize : null));
      sourceName = 'performance.memory.usedJSHeapSize';
    }

    // 过滤掉 null 值
    const validValues = heapValues.filter((v) => v !== null);
    if (validValues.length < 3) {
      console.error('FAIL: 内存数据不足（至少需要 3 个有效采样点）');
      process.exit(1);
    }

    console.log(`\n数据来源: ${sourceName}`);

    // 前半程（第 1-3 关）平均值作为基线
    const firstHalf = validValues.slice(0, 3);
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;

    // 后半程（第 8-10 关）平均值
    const lastHalf = validValues.slice(-3);
    const lastHalfAvg = lastHalf.reduce((a, b) => a + b, 0) / lastHalf.length;

    const ratio = lastHalfAvg / firstHalfAvg;
    const threshold = 1.3;

    console.log(`\n  前半程（第 1-3 关）平均: ${formatBytes(firstHalfAvg)}`);
    console.log(`  后半程（第 8-10 关）平均: ${formatBytes(lastHalfAvg)}`);
    console.log(`  后半程/前半程 比值: ${(ratio * 100).toFixed(1)}%`);
    console.log(`  阈值: ${(threshold * 100).toFixed(0)}%`);

    // 检查是否有持续增长趋势（最后值 > 最初值 1.3x）
    if (ratio <= threshold) {
      console.log(
        `\n✅ 通过: 无持续内存增长（后半程/前半程 = ${(ratio * 100).toFixed(1)}% ≤ ${(threshold * 100).toFixed(0)}%）`
      );
    } else {
      console.log(
        `\n❌ 失败: 检测到持续内存增长（后半程/前半程 = ${(ratio * 100).toFixed(1)}% > ${(threshold * 100).toFixed(0)}%）`
      );
      process.exit(1);
    }

    // 输出每关具体数值（MB）
    console.log('\n每关堆内存（MB）:');
    for (let i = 0; i < memorySamples.length; i++) {
      const s = memorySamples[i];
      const val = useCDP ? s.cdpHeapUsed : s.perfMemory ? s.perfMemory.usedJSHeapSize : null;
      const mb = val !== null ? (val / 1024 / 1024).toFixed(3) : 'N/A';
      console.log(`  ${s.level}: ${mb} MB`);
    }

    // 报告控制台错误
    if (consoleErrors.length > 0) {
      console.log(`\n控制台错误: ${consoleErrors.length} 个`);
      for (const e of consoleErrors.slice(0, 5)) {
        console.log(`  - ${e.slice(0, 200)}`);
      }
    }

    console.log('\n=== 测量完成 ===');
  } catch (e) {
    console.error(`测量失败: ${e.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return 'N/A';
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(3)} MB`;
}

main().catch((e) => {
  console.error(`未捕获异常: ${e.message}`);
  process.exit(1);
});
