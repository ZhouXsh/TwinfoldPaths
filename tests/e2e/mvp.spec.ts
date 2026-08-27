import { expect, test, type Page, type TestInfo } from '@playwright/test';

type Guard = { errors: string[]; assertClean: () => void };

type UiDir = 'up' | 'down' | 'left' | 'right';

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

const SETTLE_MS = 260;

async function pressMove(page: Page, dir: UiDir, count: number): Promise<void> {
  await page.getByTestId(`btn-${dir}`).click();
  await expect(page.getByTestId('move-count')).toHaveText(String(count), { timeout: 3000 });
  await page.waitForTimeout(SETTLE_MS);
}

async function keyMove(page: Page, key: string, count: number): Promise<void> {
  await page.keyboard.press(key);
  await expect(page.getByTestId('move-count')).toHaveText(String(count), { timeout: 3000 });
  await page.waitForTimeout(SETTLE_MS);
}

async function dispatchSwipe(page: Page, dir: UiDir): Promise<void> {
  const box = await page.getByTestId('board').boundingBox();
  if (!box) throw new Error('棋盘不可见');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const vec: Record<UiDir, [number, number]> = {
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

async function swipeMove(page: Page, dir: UiDir, count: number): Promise<void> {
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

async function unlockAndStart(page: Page, unlock: number, label: string): Promise<void> {
  await page.addInitScript((highestUnlocked: number) => {
    localStorage.setItem(
      'twinfold-paths:save:a',
      JSON.stringify({ version: 2, highestUnlocked, bestMoves: {} })
    );
  }, unlock);
  await openHome(page);
  await startGame(page);
  await expect(page.getByTestId('level-label')).toHaveText(label);
}

async function play(page: Page, sequence: readonly UiDir[]): Promise<void> {
  for (let i = 0; i < sequence.length; i++) await pressMove(page, sequence[i]!, i + 1);
}

test('首页一键进入第1关（FR-01）', async ({ page }, testInfo) => {
  const g = guard(page);
  await openHome(page);
  await expect(page.getByTestId('status')).toContainText('让蓝与橙同时到达');
  await expect(page.getByTestId('home-continue')).toContainText('第 1 / 50 关');
  await shot(page, testInfo, 'home');
  await startGame(page);
  await expect(page.getByTestId('level-label')).toHaveText('1-1 第一次分岔');
  g.assertClean();
});

test('按钮+滑动+键盘通关前三关（FR-02/FR-04）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  await startGame(page);
  await pressMove(page, 'left', 1);
  await expectResult(page, 1);
  await page.getByTestId('btn-next').click();

  await swipeMove(page, 'up', 1);
  await swipeMove(page, 'up', 2);
  await pressMove(page, 'left', 3);
  await expectResult(page, 3);
  await page.getByTestId('btn-next').click();

  await keyMove(page, 'ArrowDown', 1);
  await keyMove(page, 'ArrowDown', 2);
  await keyMove(page, 'ArrowDown', 3);
  await keyMove(page, 'ArrowDown', 4);
  await expectResult(page, 4);
  g.assertClean();
});

test('同格取消、撤销、重开与领域状态一致（R-04/R-06/FR-05）', async ({ page }) => {
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
  g.assertClean();
});

test('刷新后从最高解锁关继续（FR-07）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  await startGame(page);
  await pressMove(page, 'left', 1);
  await expectResult(page, 1);
  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-2 左右相反');
  await page.reload();
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('home-continue')).toContainText('第 2 / 50 关 · 左右相反');
  g.assertClean();
});

test('后30关代表关卡以大地图和长目标步数呈现', async ({ browser }, testInfo) => {
  const cases = [
    { unlock: 21, label: '3-21 扩域起步', par: '13', name: 'large-ch3' },
    { unlock: 31, label: '4-31 九宫初探', par: '13', name: 'fog-ch4' },
    { unlock: 41, label: '5-41 奇相之门', par: '19', name: 'phase-ch5' },
    { unlock: 50, label: '5-50 双生终极折线', par: '24', name: 'final-50' }
  ];
  for (const c of cases) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const g = guard(page);
    await unlockAndStart(page, c.unlock, c.label);
    await expect(page.getByTestId('target-count')).toHaveText(c.par);
    await shot(page, testInfo, c.name);
    g.assertClean();
    await ctx.close();
  }
});

test('第四章是连续探索章节，并能看到不同探索规则提示', async ({ browser }, testInfo) => {
  test.setTimeout(60_000);
  const cases = [
    { unlock: 31, label: '4-31 九宫初探', hint: '九宫格', name: 'fog-square' },
    { unlock: 32, label: '4-32 无痕暗域', hint: '无痕迷雾', name: 'fog-no-memory' },
    { unlock: 33, label: '4-33 衰减记忆', hint: '三回合', name: 'fog-decay' },
    { unlock: 34, label: '4-34 双生交替', hint: '交替', name: 'fog-alternating' },
    { unlock: 35, label: '4-35 暗门择路', hint: '九宫格', name: 'fog-branching' },
    { unlock: 36, label: '4-36 互锁探路', hint: '压板门', name: 'fog-crosslock' },
    { unlock: 37, label: '4-37 周期雷达', hint: '雷达', name: 'fog-radar' },
    { unlock: 38, label: '4-38 点亮信标', hint: '信标', name: 'fog-beacon' },
    { unlock: 39, label: '4-39 一明一暗', hint: '信标', name: 'fog-hybrid' },
    { unlock: 40, label: '4-40 暗域全景', hint: '最终暗域', name: 'fog-finale' }
  ];
  for (const c of cases) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const g = guard(page);
    await unlockAndStart(page, c.unlock, c.label);
    await expect(page.getByTestId('status')).toContainText(c.hint);
    await shot(page, testInfo, c.name);
    g.assertClean();
    await ctx.close();
  }
});

test('周期雷达在第5个有效回合触发全局扫描反馈', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const g = guard(page);
  await unlockAndStart(page, 37, '4-37 周期雷达');
  await play(page, ['right', 'right', 'right', 'right', 'down']);
  await expect(page.getByTestId('status')).toContainText('雷达脉冲');
  g.assertClean();
  await ctx.close();
});

test('M9 奇相门：错误奇偶会阻挡，下一回合可重新校相并最终通关', async ({ browser }) => {
  test.setTimeout(60_000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const g = guard(page);
  await unlockAndStart(page, 41, '5-41 奇相之门');

  // 沿几何最短路前进，不提前空等：第8回合进入 ODD 门时正好是 EVEN 相位。
  await play(page, ['right', 'right', 'right', 'down', 'down', 'left', 'left', 'left']);
  await expect(page.getByTestId('status')).toContainText('相位不匹配');

  // 同方向再试一次，奇偶已经翻转，此时穿门。
  await pressMove(page, 'left', 9);
  const suffix: UiDir[] = [
    'down',
    'down',
    'right',
    'right',
    'right',
    'down',
    'down',
    'left',
    'left',
    'left'
  ];
  for (let i = 0; i < suffix.length; i++) await pressMove(page, suffix[i]!, 10 + i);
  await expectResult(page, 19);
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
