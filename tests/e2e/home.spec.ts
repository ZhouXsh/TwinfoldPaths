import { expect, test } from '@playwright/test';

test('首页核心引导可见且无控制台阻断错误', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await expect(page.getByTestId('status')).toContainText('让蓝与橙同时到达', { timeout: 20000 });
  expect(errors).toEqual([]);
});

test('首页可选择并记住探索难度，教学弹窗可完整查看和关闭', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('difficulty-panel')).toBeVisible({ timeout: 20000 });

  const standard = page.getByTestId('btn-difficulty-standard');
  const easy = page.getByTestId('btn-difficulty-easy');
  await expect(standard).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('difficulty-description')).toContainText('走过与探索过的区域');

  await easy.click();
  await expect(easy).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('difficulty-description')).toContainText('全地图常亮');
  await page.reload();
  await expect(page.getByTestId('btn-difficulty-easy')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('btn-tutorial').click();
  const tutorial = page.getByTestId('tutorial-modal');
  await expect(tutorial).toBeVisible();
  await expect(tutorial).toContainText('蓝球按你输入的方向移动');
  await expect(tutorial).toContainText('压板控制门');
  await expect(tutorial).toContainText('简单：全图常亮');
  await page.getByTestId('btn-tutorial-close').click();
  await expect(tutorial).toBeHidden();
});

test('进入第11关时显示“难度飙升”提示', async ({ page }) => {
  await page.addInitScript(() => {
    const save = JSON.stringify({ version: 3, highestUnlocked: 11, bestMoves: {} });
    localStorage.setItem('twinfold-paths:save:a', save);
    localStorage.setItem('twinfold-paths:save:b', save);
  });
  await page.goto('/');
  await expect(page.getByTestId('btn-start')).toContainText('继续旅程', { timeout: 20000 });
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('level-label')).toContainText('2-11');
  await expect(page.getByTestId('status')).toContainText('难度飙升');
});
