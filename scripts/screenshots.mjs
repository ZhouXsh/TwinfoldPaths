#!/usr/bin/env node
/**
 * 多视口截图脚本（阶段 11 验收门）
 * 使用 Playwright 在 320×568、390×844、430×932、桌面视口截图。
 * 将截图保存到 artifacts/stage-11/。
 *
 * 用法：node scripts/screenshots.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ARTIFACTS_DIR = resolve('artifacts/stage-11');

const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: 'desktop', width: 1280, height: 800 }
];

async function main() {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    const page = await ctx.newPage();

    // 1. 首页截图
    await page.goto('http://localhost:4173');
    await page.waitForSelector('[data-testid="btn-start"]', { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(ARTIFACTS_DIR, `${vp.name}-home.png`)
    });
    console.log(`  ✓ ${vp.name} 首页截图`);

    // 2. 游戏关卡截图（level-001）
    await page.click('[data-testid="btn-start"]');
    await page.waitForSelector('[data-testid="move-count"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(ARTIFACTS_DIR, `${vp.name}-game-level001.png`)
    });
    console.log(`  ✓ ${vp.name} 游戏关卡截图`);

    // 3. 关卡通关截图（level-001: 按左键通关）
    await page.click('[data-testid="btn-left"]');
    await page.waitForSelector('[data-testid="result-text"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(ARTIFACTS_DIR, `${vp.name}-result.png`)
    });
    console.log(`  ✓ ${vp.name} 结算截图`);

    // 4. 章节选择截图（从结算页回首页）
    await page.click('[data-testid="btn-result-home"]');
    await page.waitForSelector('[data-testid="btn-start"]', { timeout: 5000 });
    await page.click('[data-testid="btn-chapter-select"]');
    await page.waitForSelector('[data-testid="chapter-grid"]', { timeout: 5000 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: join(ARTIFACTS_DIR, `${vp.name}-chapter-select.png`)
    });
    console.log(`  ✓ ${vp.name} 章节选择截图`);

    // 5. 关卡选择截图（点击第一章）
    const chapterCards = await page.$$('.chapter-card:not(.locked)');
    if (chapterCards.length > 0) {
      await chapterCards[0].click();
      await page.waitForSelector('[data-testid="level-grid"]', { timeout: 5000 });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: join(ARTIFACTS_DIR, `${vp.name}-level-select.png`)
      });
      console.log(`  ✓ ${vp.name} 关卡选择截图`);
    }

    // 6. 设置截图
    await page.click('[data-testid="btn-level-back"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="btn-chapter-back"]');
    await page.waitForSelector('[data-testid="btn-settings"]', { timeout: 5000 });
    await page.click('[data-testid="btn-settings"]');
    await page.waitForSelector('[data-testid="btn-settings-back"]', { timeout: 5000 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: join(ARTIFACTS_DIR, `${vp.name}-settings.png`)
    });
    console.log(`  ✓ ${vp.name} 设置截图`);

    await ctx.close();
  }

  await browser.close();
  console.log('\n所有截图完成');
}

main().catch((err) => {
  console.error('截图失败:', err);
  process.exit(1);
});
