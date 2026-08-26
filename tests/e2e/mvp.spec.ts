import { expect, test, type Page, type TestInfo } from '@playwright/test';

type Guard = { errors: string[]; assertClean: () => void };

/** 全程监听：控制台错误、页面异常、非本机请求一律记为违规（NFR-06/08）。 */
function guard(page: Page): Guard {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('request', (req) => {
    const url = req.url();
    if (
      !url.startsWith('http://localhost:4173') &&
      !url.startsWith('data:') &&
      !url.startsWith('blob:')
    ) {
      errors.push(`外部请求: ${url}`);
    }
  });
  return { errors, assertClean: () => expect(errors).toEqual([]) };
}

async function openHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
}

async function startGame(page: Page): Promise<void> {
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('move-count')).toHaveText('0', { timeout: 5000 });
}

/** 动画 180ms + 输入门：每步结算后等待，确保下一条输入不被锁输入策略丢弃。 */
const SETTLE_MS = 260;

async function pressMove(
  page: Page,
  dir: 'up' | 'down' | 'left' | 'right',
  count: number
): Promise<void> {
  await page.getByTestId(`btn-${dir}`).click();
  await expect(page.getByTestId('move-count')).toHaveText(String(count), { timeout: 3000 });
  await page.waitForTimeout(SETTLE_MS);
}

async function keyMove(page: Page, key: string, count: number): Promise<void> {
  await page.keyboard.press(key);
  await expect(page.getByTestId('move-count')).toHaveText(String(count), { timeout: 3000 });
  await page.waitForTimeout(SETTLE_MS);
}

async function dispatchSwipe(page: Page, dir: 'up' | 'down' | 'left' | 'right'): Promise<void> {
  const box = await page.getByTestId('board').boundingBox();
  if (!box) throw new Error('棋盘不可见');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const vec: Record<'up' | 'down' | 'left' | 'right', [number, number]> = {
    up: [0, -90],
    down: [0, 90],
    left: [-90, 0],
    right: [90, 0]
  };
  const [dx, dy] = vec[dir];
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(40);
  await page.mouse.move(cx + dx, cy + dy, { steps: 6 });
  await page.waitForTimeout(40);
  await page.mouse.up();
}

/** 触控模拟下手势偶发被布局过渡吞掉：允许重试，但终态步数必须精确匹配。 */
async function swipeMove(
  page: Page,
  dir: 'up' | 'down' | 'left' | 'right',
  count: number
): Promise<void> {
  await page.waitForTimeout(100);
  for (let attempt = 1; attempt <= 3; attempt++) {
    await dispatchSwipe(page, dir);
    try {
      await expect(page.getByTestId('move-count')).toHaveText(String(count), { timeout: 900 });
      await page.waitForTimeout(SETTLE_MS);
      return;
    } catch (err) {
      if (attempt === 3) throw err;
    }
  }
}

async function expectResult(page: Page, moves: number): Promise<void> {
  await expect(page.getByTestId('result-text')).toContainText(`步数 ${moves}`, { timeout: 5000 });
}

async function shot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({ path: `artifacts/stage-08/${testInfo.project.name}-${name}.png` });
}

test('首页一键进入第1关（FR-01）', async ({ page }, testInfo) => {
  const g = guard(page);
  await openHome(page);
  await expect(page.getByTestId('status')).toHaveText('健康检查 OK');
  await expect(page.getByTestId('home-continue')).toHaveText('继续：第 1 关');
  await shot(page, testInfo, 'home');
  await startGame(page);
  await expect(page.getByTestId('level-label')).toHaveText('1-1 第一次分岔');
  await shot(page, testInfo, 'level-001');
  g.assertClean();
});

test('按钮+滑动+键盘通关前三关并进入下一关（FR-02/FR-04）', async ({ page }, testInfo) => {
  const g = guard(page);
  await openHome(page);
  await startGame(page);

  await pressMove(page, 'left', 1);
  await expectResult(page, 1);
  await shot(page, testInfo, 'level-001-result');
  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-2 左右相反');

  await swipeMove(page, 'up', 1);
  await swipeMove(page, 'up', 2);
  await pressMove(page, 'left', 3);
  await expectResult(page, 3);
  await shot(page, testInfo, 'level-002-result');
  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-3 同步双出口');

  await keyMove(page, 'ArrowDown', 1);
  await keyMove(page, 'ArrowDown', 2);
  await keyMove(page, 'ArrowDown', 3);
  await keyMove(page, 'ArrowDown', 4);
  await expectResult(page, 4);
  await shot(page, testInfo, 'level-003-result');

  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-4 墙体解耦');
  await page.getByTestId('btn-home').click();
  await expect(page.getByTestId('btn-start')).toBeVisible();
  g.assertClean();
});

test('同格取消、撤销、重开与领域状态一致（R-04/R-06/FR-05）', async ({ page }, testInfo) => {
  const g = guard(page);
  await openHome(page);
  await startGame(page);

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(350);
  await expect(page.getByTestId('move-count')).toHaveText('0');

  await keyMove(page, 'ArrowUp', 1);
  await page.getByTestId('btn-undo').click();
  await expect(page.getByTestId('move-count')).toHaveText('0');

  await keyMove(page, 'ArrowUp', 1);
  await page.getByTestId('btn-restart').click();
  await expect(page.getByTestId('move-count')).toHaveText('0');

  await pressMove(page, 'left', 1);
  await expectResult(page, 1);
  await shot(page, testInfo, 'level-001-after-restart');
  g.assertClean();
});

test('刷新后从最高解锁关继续（FR-07）', async ({ page }, testInfo) => {
  const g = guard(page);
  await openHome(page);
  await startGame(page);
  await pressMove(page, 'left', 1);
  await expectResult(page, 1);
  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-2 左右相反');

  await page.reload();
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('home-continue')).toHaveText('继续：第 2 关');
  await shot(page, testInfo, 'home-continue-after-reload');
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-2 左右相反');
  g.assertClean();
  g.assertClean();
});

test('M2/M3/M4 机关渲染可见且映射标签实时切换（视觉证据）', async ({ browser }, testInfo) => {
  const cases: Array<{ unlock: number; label: string; name: string }> = [
    { unlock: 16, label: '2-16 角色专属门', name: 'm2-colordoor' },
    { unlock: 21, label: '3-21 暂停令牌', name: 'm3-pausetile' },
    { unlock: 26, label: '3-26 垂直镜像切换', name: 'm4-switcher' },
    { unlock: 29, label: '3-29 映射决定开门', name: 'm4-plate-switcher' }
  ];
  for (const c of cases) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const g = guard(page);
    await page.addInitScript((unlock: number) => {
      localStorage.setItem(
        'twinfold-paths:save:a',
        JSON.stringify({ version: 2, highestUnlocked: unlock, bestMoves: {} })
      );
    }, c.unlock);
    await page.goto('/');
    await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('btn-start').click();
    await expect(page.getByTestId('level-label')).toHaveText(c.label);
    await expect(page.getByTestId('mapping-label')).toHaveText('映射：水平镜像');
    await page.screenshot({
      path: `artifacts/stage-08/${testInfo.project.name}-render-${c.name}.png`
    });
    g.assertClean();
    await ctx.close();
  }
});

test('M4 映射切换后界面标签同步更新（M4 验收门）', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const g = guard(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'twinfold-paths:save:a',
      JSON.stringify({ version: 2, highestUnlocked: 26, bestMoves: {} })
    );
  });
  await page.goto('/');
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('level-label')).toHaveText('3-26 垂直镜像切换');
  await expect(page.getByTestId('mapping-label')).toHaveText('映射：水平镜像');
  await keyMove(page, 'ArrowUp', 1);
  await expect(page.getByTestId('mapping-label')).toHaveText('映射：垂直镜像');
  await page.getByTestId('btn-undo').click();
  await expect(page.getByTestId('mapping-label')).toHaveText('映射：水平镜像');
  g.assertClean();
  await ctx.close();
});

test('M5–M8 教学关渲染可见（视觉证据）', async ({ browser }, testInfo) => {
  const cases: Array<{ unlock: number; label: string; name: string }> = [
    { unlock: 31, label: '4-31 顺箭而行', name: 'm5-oneway' },
    { unlock: 34, label: '4-34 映射与离向', name: 'm4m5-switcher-oneway' },
    { unlock: 36, label: '4-36 穿墙之门', name: 'm6-portal' },
    { unlock: 38, label: '4-38 传送接单向', name: 'm5m6-portal-oneway' },
    { unlock: 41, label: '5-41 脆弱之桥', name: 'm7-fragile' },
    { unlock: 44, label: '5-44 不可回头路', name: 'm5m7-noreturn' },
    { unlock: 46, label: '5-46 同步脉冲', name: 'm8-pulse' },
    { unlock: 47, label: '5-47 暂停调节同步', name: 'm3m8-pausesync' }
  ];
  for (const c of cases) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const g = guard(page);
    await page.addInitScript((unlock: number) => {
      localStorage.setItem(
        'twinfold-paths:save:a',
        JSON.stringify({ version: 2, highestUnlocked: unlock, bestMoves: {} })
      );
    }, c.unlock);
    await page.goto('/');
    await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('btn-start').click();
    await expect(page.getByTestId('level-label')).toHaveText(c.label);
    await page.screenshot({
      path: `artifacts/stage-08/${testInfo.project.name}-render-${c.name}.png`
    });
    g.assertClean();
    await ctx.close();
  }
});

test('M5 单向格教学关 4-31：阻挡反馈区分于墙且可通关（M5 验收门）', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const g = guard(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'twinfold-paths:save:a',
      JSON.stringify({ version: 2, highestUnlocked: 31, bestMoves: {} })
    );
  });
  await page.goto('/');
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('level-label')).toHaveText('4-31 顺箭而行');
  await pressMove(page, 'up', 1);
  await pressMove(page, 'right', 2);
  await pressMove(page, 'up', 3);
  // 此刻蓝在 oneWay(RIGHT)、橙在 oneWay(LEFT)；输入 LEFT 对双方都是逆箭头离开
  await pressMove(page, 'left', 4);
  await expect(page.getByTestId('status')).toHaveText(/单向/);
  await page.getByTestId('btn-undo').click();
  await expect(page.getByTestId('move-count')).toHaveText('3');
  await pressMove(page, 'right', 4);
  await pressMove(page, 'up', 5);
  await pressMove(page, 'left', 6);
  await pressMove(page, 'left', 7);
  await expectResult(page, 7);
  g.assertClean();
  await ctx.close();
});

test('M6 传送教学关 4-36 通关且传送状态行可见（M6 验收门）', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const g = guard(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'twinfold-paths:save:a',
      JSON.stringify({ version: 2, highestUnlocked: 36, bestMoves: {} })
    );
  });
  await page.goto('/');
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('level-label')).toHaveText('4-36 穿墙之门');
  await pressMove(page, 'up', 1);
  await pressMove(page, 'right', 2);
  await expect(page.getByTestId('status')).toHaveText(/传送/);
  await pressMove(page, 'left', 3);
  await expectResult(page, 3);
  g.assertClean();
  await ctx.close();
});

test('M7 脆弱格教学关 5-41：坍塌与撤销恢复（M7 验收门）', async ({ browser }, testInfo) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const g = guard(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'twinfold-paths:save:a',
      JSON.stringify({ version: 2, highestUnlocked: 41, bestMoves: {} })
    );
  });
  await page.goto('/');
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('level-label')).toHaveText('5-41 脆弱之桥');
  await pressMove(page, 'right', 1);
  await pressMove(page, 'up', 2);
  await pressMove(page, 'up', 3);
  await pressMove(page, 'up', 4);
  await expect(page.getByTestId('status')).toHaveText(/坍塌/);
  await shot(page, testInfo, 'level-041-collapsed');
  await page.getByTestId('btn-undo').click();
  await expect(page.getByTestId('move-count')).toHaveText('3');
  await shot(page, testInfo, 'level-041-undo-restored');
  await pressMove(page, 'up', 4);
  await pressMove(page, 'left', 5);
  await expectResult(page, 5);
  g.assertClean();
  await ctx.close();
});

test('M8 同步脉冲教学关 4-46 通关（闩锁开启脉冲门）', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const g = guard(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'twinfold-paths:save:a',
      JSON.stringify({ version: 2, highestUnlocked: 46, bestMoves: {} })
    );
  });
  await page.goto('/');
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('level-label')).toHaveText('5-46 同步脉冲');
  await pressMove(page, 'up', 1);
  await pressMove(page, 'right', 2);
  await expect(page.getByTestId('status')).toHaveText(/同步脉冲/);
  await pressMove(page, 'up', 3);
  await pressMove(page, 'up', 4);
  await pressMove(page, 'up', 5);
  await pressMove(page, 'left', 6);
  await expectResult(page, 6);
  g.assertClean();
  await ctx.close();
});

test('视口内无关键遮挡且触控目标≥44px（NFR-02/NFR-04）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  await startGame(page);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (!viewport) return;

  const visibleIds = [
    'btn-home',
    'btn-undo',
    'btn-restart',
    'move-count',
    'board',
    'btn-up',
    'btn-down',
    'btn-left',
    'btn-right'
  ];
  for (const id of visibleIds) {
    const el = page.getByTestId(id);
    await expect(el, `#${id} 应可见`).toBeVisible();
    const box = await el.boundingBox();
    expect(box, `#${id} 应有盒模型`).not.toBeNull();
    if (!box) continue;
    expect(box.x, `#${id} 左缘越界`).toBeGreaterThanOrEqual(0);
    expect(box.y, `#${id} 上缘越界`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `#${id} 右缘越界`).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, `#${id} 下缘越界`).toBeLessThanOrEqual(viewport.height);
  }

  for (const id of [
    'btn-up',
    'btn-down',
    'btn-left',
    'btn-right',
    'btn-undo',
    'btn-restart',
    'btn-home'
  ]) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, `#${id} 应有盒模型`).not.toBeNull();
    if (!box) continue;
    expect(box.width, `#${id} 触控宽度`).toBeGreaterThanOrEqual(44);
    expect(box.height, `#${id} 触控高度`).toBeGreaterThanOrEqual(44);
  }
  g.assertClean();
});
