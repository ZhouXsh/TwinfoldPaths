// tmp 沙箱冒烟测试：真实 chromium 打开 demo，走通核心交互闭环（不写仓库其他目录）
// 用法: node tmp/.smoke.mjs
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, 'index.html')).href;

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

  // ---- 首页 ----
  ok(await page.isVisible('#screen-home'), '首页可见');
  ok((await page.locator('#level-grid .lv').count()) === 8, '选关列表渲染 8 关');
  ok(
    (await page.locator('#level-grid .lv').nth(1).getAttribute('disabled')) !== null,
    '第 2 关初始锁定'
  );

  // ---- 进入 1-1 并一步通关 ----
  await page.click('#btn-continue');
  ok(await page.isVisible('#screen-game'), '进入对局界面');
  ok((await page.textContent('#level-label')).includes('1-1'), 'HUD 显示 1-1');

  await page.keyboard.press('ArrowLeft');
  await page.waitForSelector('#win-overlay:not([hidden])', { timeout: 4000 });
  ok(true, '1-1 一步通关弹出结算');
  ok((await page.textContent('#win-moves')).includes('1'), '结算显示步数 1');
  ok((await page.textContent('#win-stars')).includes('★'), '结算显示星级');

  // ---- 下一关 1-2：先测撤销与同格取消，再通关 ----
  await page.click('#btn-next');
  ok((await page.textContent('#level-label')).includes('1-2'), '进入 1-2');

  await page.keyboard.press('ArrowUp');
  ok((await page.textContent('#move-count')) === '1', 'UP 后步数为 1');
  await page.waitForTimeout(300); // 输入门：动画期（约 220ms）丢弃输入，与项目 gate.ts 一致
  await page.keyboard.press('KeyZ');
  ok((await page.textContent('#move-count')) === '0', 'Z 撤销后步数回 0');

  // 同格取消：LEFT, RIGHT, RIGHT -> 第三步双方将撞入同格，整步取消不计步
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  ok((await page.textContent('#move-count')) === '2', '同格取消不消耗步数');
  ok(
    ((await page.locator('#status').getAttribute('class')) ?? '').includes('alert'),
    '取消时状态栏告警提示'
  );

  // 通关 1-2：UP UP LEFT
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowLeft');
  await page.waitForSelector('#win-overlay:not([hidden])', { timeout: 4000 });
  ok(true, '1-2 通关');

  // ---- 1-3：鼠标拖拽滑动 DOWN x4 通关（验证滑动手势） ----
  await page.click('#btn-next');
  ok((await page.textContent('#level-label')).includes('1-3'), '进入 1-3');
  const box = await page.locator('#board-wrap').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(cx, cy - 40);
    await page.mouse.down();
    await page.mouse.move(cx, cy + 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  }
  await page.waitForSelector('#win-overlay:not([hidden])', { timeout: 4000 });
  ok(true, '1-3 滑动 DOWN x4 通关');

  // ---- 重开按钮 ----
  await page.click('#btn-replay');
  ok(
    (await page.textContent('#move-count')) === '0' && !(await page.isVisible('#win-overlay')),
    '再玩一次重置对局'
  );
  await page.click('#btn-restart');
  ok((await page.textContent('#move-count')) === '0', '重开按钮可用');

  // ---- 存档持久化：刷新后进度仍在（已通 1-1/1-2/1-3 → 解锁至 1-4） ----
  await page.click('#btn-home');
  await page.reload();
  const firstStars = await page.locator('#level-grid .lv').first().textContent();
  ok(firstStars.includes('★'), '刷新后 1-1 保留星级');
  ok(
    (await page.locator('#level-grid .lv').nth(2).getAttribute('disabled')) === null,
    '刷新后 1-3 已解锁'
  );
  ok(
    (await page.locator('#level-grid .lv').nth(3).getAttribute('disabled')) === null,
    '刷新后 1-4 已解锁（通 1-3 后开放）'
  );
  ok(
    (await page.locator('#level-grid .lv').nth(4).getAttribute('disabled')) !== null,
    '刷新后 1-5 仍锁定'
  );

  ok(
    pageErrors.length === 0,
    `无页面报错${pageErrors.length ? ': ' + pageErrors.join(' | ') : ''}`
  );
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} 项冒烟失败` : '\n冒烟测试全部通过');
process.exitCode = failures ? 1 : 0;
