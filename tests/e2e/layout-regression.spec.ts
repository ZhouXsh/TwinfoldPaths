import { expect, test, type Locator, type Page } from '@playwright/test';

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value!;
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

async function openFirstResult(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('move-count')).toHaveText('0');
  await page.getByTestId('btn-left').click();
  await expect(page.getByTestId('result-text')).toContainText('步数 1', { timeout: 5000 });
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 }
]) {
  test(`通关页在 ${viewport.width}x${viewport.height} 不发生 DOM 元素重叠`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openFirstResult(page);

    const result = page.locator('#bar-result');
    const title = await box(result.locator('.screen-title'));
    const stars = await box(page.locator('#result-stars'));
    const summary = await box(page.getByTestId('result-text'));
    const actions = await box(result.locator('.bar'));

    expect(overlaps(title, stars)).toBe(false);
    expect(overlaps(stars, summary)).toBe(false);
    expect(overlaps(summary, actions)).toBe(false);

    for (const id of ['btn-replay', 'btn-next', 'btn-result-home']) {
      const target = await box(page.locator(`#${id}`));
      expect(target.width).toBeGreaterThanOrEqual(40);
      expect(target.height).toBeGreaterThanOrEqual(40);
    }
  });
}
