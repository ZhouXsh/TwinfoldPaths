import { expect, test } from '@playwright/test';

test('首页健康检查可见且无控制台阻断错误', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  await expect(page.getByTestId('status')).toHaveText('健康检查 OK', { timeout: 20000 });
  expect(errors).toEqual([]);
});
