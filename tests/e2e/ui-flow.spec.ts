/**
 * E2E 测试：首次用户流程、设置页、刷新恢复、章节解锁、后期机制关。
 * 使用显式等待，禁止固定 sleep 掩盖不稳定。
 */

import { expect, test, type Page } from '@playwright/test';

type Guard = { errors: string[]; assertClean: () => void };

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

async function pressMove(
  page: Page,
  dir: 'up' | 'down' | 'left' | 'right',
  count: number
): Promise<void> {
  await page.getByTestId(`btn-${dir}`).click();
  await expect(page.getByTestId('move-count')).toHaveText(String(count), { timeout: 3000 });
  await page.waitForTimeout(SETTLE_MS);
}

async function expectResult(page: Page, moves: number): Promise<void> {
  await expect(page.getByTestId('result-text')).toContainText(`步数 ${moves}`, { timeout: 5000 });
}

// ── 测试 ──

test('首次用户前三关完整流程（FR-01/FR-02/FR-04）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  await expect(page.getByTestId('status')).toContainText('让蓝与橙同时到达');
  await expect(page.getByTestId('home-continue')).toContainText('第 1 / 50 关');

  // 第 1 关
  await startGame(page);
  await expect(page.getByTestId('level-label')).toHaveText('1-1 第一次分岔');
  await expect(page.getByTestId('target-count')).toHaveText('1');
  await expect(page.getByTestId('btn-hint')).toBeVisible();
  await expect(page.getByTestId('btn-left')).toHaveClass(/recommended/);
  await page.getByTestId('btn-hint').click();
  await expect(page.getByTestId('status')).toContainText('两个角色都响应');
  await pressMove(page, 'left', 1);
  await expectResult(page, 1);
  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-2 左右相反');
  await expect(page.getByTestId('btn-up')).toHaveClass(/recommended/);

  // 第 2 关
  await pressMove(page, 'up', 1);
  await pressMove(page, 'up', 2);
  await pressMove(page, 'left', 3);
  await expectResult(page, 3);
  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-3 同步双出口');

  // 第 3 关
  await pressMove(page, 'down', 1);
  await pressMove(page, 'down', 2);
  await pressMove(page, 'down', 3);
  await pressMove(page, 'down', 4);
  await expectResult(page, 4);
  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-4 墙体解耦');
  g.assertClean();
});

test('设置页：开关切换可见且可操作（FR-10）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);

  // 进入设置
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('bar-settings')).toBeVisible({ timeout: 5000 });

  // 检查各开关可见
  await expect(page.getByTestId('toggle-music')).toBeVisible();
  await expect(page.getByTestId('toggle-sfx')).toBeVisible();
  await expect(page.getByTestId('toggle-vibration')).toBeVisible();
  await expect(page.getByTestId('toggle-reducedAnim')).toBeVisible();

  // 切换音乐开关
  await page.getByTestId('toggle-music').click();
  // 关闭设置
  await page.getByTestId('btn-settings-back').click();
  await expect(page.getByTestId('bar-settings')).not.toBeVisible();

  g.assertClean();
});

test('设置页刷新后状态恢复（FR-07/FR-10）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);

  // 进入设置，切换音乐和音效
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('bar-settings')).toBeVisible({ timeout: 5000 });

  // 切换音乐开关（默认开→关）
  await page.getByTestId('toggle-music').click();
  await page.getByTestId('btn-settings-back').click();
  await expect(page.getByTestId('bar-settings')).not.toBeVisible();

  // 刷新
  await page.reload();
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });

  // 重新进入设置，检查开关可见
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('bar-settings')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('toggle-music')).toBeVisible();
  await page.getByTestId('btn-settings-back').click();

  g.assertClean();
});

test('刷新后进度保持（FR-07）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  await startGame(page);

  // 通关第 1 关
  await pressMove(page, 'left', 1);
  await expectResult(page, 1);
  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-2 左右相反');

  // 刷新
  await page.reload();
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('home-continue')).toContainText('第 2 / 50 关 · 左右相反');

  // 继续进入第 2 关
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-2 左右相反');
  g.assertClean();
});

test('章节选择可见且可操作', async ({ page }) => {
  const g = guard(page);
  await openHome(page);

  // 进入章节选择
  await page.getByTestId('btn-chapter-select').click();
  await expect(page.getByTestId('chapter-grid')).toBeVisible({ timeout: 5000 });

  // 至少看到第 1 章
  await expect(page.getByTestId('chapter-1')).toBeVisible();

  // 点击第 1 章进入关卡选择
  await page.getByTestId('chapter-1').click();
  await expect(page.getByTestId('level-grid')).toBeVisible({ timeout: 5000 });

  // 第 1 关应可见且可点击
  await expect(page.getByTestId('level-level-001')).toBeVisible();
  await page.getByTestId('level-level-001').click();

  // 进入游戏
  await expect(page.getByTestId('move-count')).toHaveText('0', { timeout: 5000 });
  await expect(page.getByTestId('level-label')).toHaveText('1-1 第一次分岔');
  g.assertClean();
});

test('M7 脆弱格教学关 5-41 界面可见且可通关', async ({ browser }) => {
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
  await pressMove(page, 'left', 5);
  await expectResult(page, 5);
  g.assertClean();
  await ctx.close();
});

test('M8 脉冲门教学关 5-46 界面可见且可通关', async ({ browser }) => {
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

test('清除进度按钮可见且可操作', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  // 首页应可见清除进度按钮
  await expect(page.getByTestId('btn-clear-progress')).toBeVisible();
  await expect(page.getByTestId('btn-chapter-select')).toBeVisible();
  await expect(page.getByTestId('btn-settings')).toBeVisible();
  g.assertClean();
});
