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
