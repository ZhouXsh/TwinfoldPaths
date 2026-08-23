// tmp 沙箱：真实浏览器按 BFS 最短解逐关通关全部 8 关（验证完整游玩链路）
// 用法: node tmp/.smoke-all.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, 'index.html')).href;

// 与 tmp/solver.mjs / .verify.mjs 输出的最短解一致
const SOLUTIONS = {
  'level-001': ['ArrowLeft'],
  'level-002': ['ArrowUp', 'ArrowUp', 'ArrowLeft'],
  'level-003': ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'],
  'level-004': ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight'],
  'level-005': ['ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowDown'],
  'level-006': ['ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight'],
  'level-007': [
    'ArrowLeft',
    'ArrowDown',
    'ArrowDown',
    'ArrowRight',
    'ArrowRight',
    'ArrowRight',
    'ArrowUp',
    'ArrowRight',
    'ArrowUp',
    'ArrowUp'
  ],
  'level-008': [
    'ArrowDown',
    'ArrowLeft',
    'ArrowLeft',
    'ArrowUp',
    'ArrowDown',
    'ArrowRight',
    'ArrowRight',
    'ArrowRight',
    'ArrowRight',
    'ArrowRight',
    'ArrowUp',
    'ArrowUp',
    'ArrowUp',
    'ArrowLeft',
    'ArrowLeft',
    'ArrowDown',
    'ArrowDown'
  ]
};
const KEY_BY_ORDER = Object.keys(SOLUTIONS); // order 1..8

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '通过' : '失败 !!'}  ${label}`);
  if (!cond) failures++;
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(url);
  // 预置解锁，逐关挑战（仅测试用途）
  await page.evaluate(() => {
    localStorage.setItem('twinfold-demo-save-v1', JSON.stringify({ v: 1, unlocked: 8, best: {} }));
  });
  await page.reload();

  for (let i = 0; i < KEY_BY_ORDER.length; i++) {
    const id = KEY_BY_ORDER[i];
    if (i === 0) {
      await page.locator('#level-grid .lv').nth(0).click();
      await page.waitForSelector('#screen-game:not([hidden])');
    }
    const label = await page.textContent('#level-label');
    ok(label.includes(`1-${i + 1}`), `进入 1-${i + 1}`);

    for (const key of SOLUTIONS[id]) {
      await page.waitForTimeout(260); // 输入门：动画期丢弃
      await page.keyboard.press(key);
    }
    await page.waitForSelector('#win-overlay:not([hidden])', { timeout: 5000 });
    const movesText = await page.textContent('#win-moves');
    const stars = (await page.textContent('#win-stars')).split('★').length - 1;
    ok(true, `${id} 通关（${movesText.trim()}，亮星 ${stars}）`);
    ok(stars === 3, `${id} 最短解应得 3 星`);

    if (i < KEY_BY_ORDER.length - 1) {
      await page.click('#btn-next');
      await page.waitForSelector('#win-overlay[hidden]', { timeout: 3000, state: 'attached' });
    } else {
      ok(await page.locator('#btn-next').isDisabled(), '最后一关“下一关”按钮禁用（已全部通关）');
    }
  }

  // 返回首页核对全三星存档
  await page.click('#btn-win-home');
  const cards = await page.locator('#level-grid .lv').allTextContents();
  ok(
    cards.every((c) => c.includes('最佳')),
    '选关列表显示全部最佳成绩'
  );

  ok(
    pageErrors.length === 0,
    `无页面报错${pageErrors.length ? ': ' + pageErrors.join(' | ') : ''}`
  );
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} 项失败` : '\n8 关全通链路验证通过');
process.exitCode = failures ? 1 : 0;
