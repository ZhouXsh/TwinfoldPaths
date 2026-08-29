import { expect, test, type Page } from '@playwright/test';

interface NormalizedRegion {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

async function sampleCanvasRegionMinRed(page: Page, region: NormalizedRegion): Promise<number> {
  const screenshot = await page.locator('#game canvas').screenshot();
  const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`;
  return page.evaluate(
    async ({ source, bounds }) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('无法创建截图采样画布');
      context.drawImage(image, 0, 0);

      let minRed = 255;
      const samplesPerAxis = 9;
      for (let yi = 0; yi < samplesPerAxis; yi++) {
        const yRatio = yi / (samplesPerAxis - 1);
        const normalizedY = bounds.yMin + (bounds.yMax - bounds.yMin) * yRatio;
        const y = Math.min(
          canvas.height - 1,
          Math.max(0, Math.round(normalizedY * (canvas.height - 1)))
        );
        for (let xi = 0; xi < samplesPerAxis; xi++) {
          const xRatio = xi / (samplesPerAxis - 1);
          const normalizedX = bounds.xMin + (bounds.xMax - bounds.xMin) * xRatio;
          const x = Math.min(
            canvas.width - 1,
            Math.max(0, Math.round(normalizedX * (canvas.width - 1)))
          );
          const red = context.getImageData(x, y, 1, 1).data[0]!;
          minRed = Math.min(minRed, red);
        }
      }
      return minRed;
    },
    { source: dataUrl, bounds: region }
  );
}

async function seedUnlockedLevels(page: Page, highestUnlocked = 11): Promise<void> {
  await page.addInitScript((unlocked) => {
    const save = JSON.stringify({ version: 3, highestUnlocked: unlocked, bestMoves: {} });
    localStorage.setItem('twinfold-paths:save:a', save);
    localStorage.setItem('twinfold-paths:save:b', save);
  }, highestUnlocked);
}

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

test('简单难度经“选关卡”和“选章节”进入游戏仍保持全图常亮', async ({ page }) => {
  await seedUnlockedLevels(page);
  await page.goto('/');
  await expect(page.getByTestId('difficulty-panel')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('btn-difficulty-easy').click();

  // 直接“选关卡”进入 1-10：扫描不在初始九宫格内的墙体内部，避免缩放/抗锯齿导致单像素误判。
  await page.getByTestId('btn-level-select').click();
  await page.getByTestId('level-level-010').click();
  await expect(page.getByTestId('level-label')).toContainText('1-10');
  const directLevelWallMinRed = await sampleCanvasRegionMinRed(page, {
    xMin: 27 / 360,
    xMax: 77 / 360,
    yMin: 155 / 360,
    yMax: 205 / 360
  });
  expect(directLevelWallMinRed).toBeLessThan(225);

  // 返回首页后再走“选章节 → 第2章 → 2-11”，同样必须保持简单难度。
  await page.getByTestId('btn-home').click();
  await page.getByTestId('btn-chapter-select').click();
  await page.getByTestId('chapter-2').click();
  await page.getByTestId('level-level-011').click();
  await expect(page.getByTestId('level-label')).toContainText('2-11');
  const chapterLevelWallMinRed = await sampleCanvasRegionMinRed(page, {
    xMin: 56 / 360,
    xMax: 89 / 360,
    yMin: 292 / 360,
    yMax: 325 / 360
  });
  expect(chapterLevelWallMinRed).toBeLessThan(225);
});

test('标准难度走过的探索区域完全点亮，不再保留半透明雾层', async ({ page }) => {
  await seedUnlockedLevels(page);
  await page.goto('/');
  await expect(page.getByTestId('difficulty-panel')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('btn-difficulty-standard').click();
  await page.getByTestId('btn-chapter-select').click();
  await page.getByTestId('chapter-2').click();
  await page.getByTestId('level-level-011').click();
  await expect(page.getByTestId('level-label')).toContainText('2-11');

  // 1,2 墙体初始被蓝球九宫格看到；连续向上后它离开当前九宫格，只能依赖 persistent 记忆。
  await page.getByTestId('btn-up').click();
  await page.waitForTimeout(260);
  await page.getByTestId('btn-up').click();
  await page.waitForTimeout(260);
  await page.getByTestId('btn-up').click();
  await page.waitForTimeout(260);

  const exploredWallMinRed = await sampleCanvasRegionMinRed(page, {
    xMin: 56 / 360,
    xMax: 89 / 360,
    yMin: 120 / 360,
    yMax: 153 / 360
  });
  // 原来的 0.58 alpha 半雾会把墙体暗纹抬到约 205；完全点亮应明显低于 200。
  expect(exploredWallMinRed).toBeLessThan(200);
});

test('进入第11关时显示“难度飙升”提示', async ({ page }) => {
  await seedUnlockedLevels(page);
  await page.goto('/');
  await expect(page.getByTestId('btn-start')).toContainText('继续旅程', { timeout: 20000 });
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('level-label')).toContainText('2-11');
  await expect(page.getByTestId('status')).toContainText('难度飙升');
});
