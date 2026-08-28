/**
 * E2E 测试：首次用户流程、设置页、刷新恢复、章节解锁，以及重制后的后期章节。
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { LevelRecord } from '../../src/content/validate';
import { bfsSolve } from '../../tools/solver/bfs-solver';

type Guard = { errors: string[]; assertClean: () => void };
type UiDir = 'up' | 'down' | 'left' | 'right';

const levelCache = new Map<number, LevelRecord>();

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

function levelByOrder(order: number): LevelRecord {
  const cached = levelCache.get(order);
  if (cached) return cached;
  const chapter = Math.ceil(order / 10);
  const path = resolve(
    process.cwd(),
    `levels/chapter-${String(chapter).padStart(2, '0')}/level-${String(order).padStart(3, '0')}.json`
  );
  const level = JSON.parse(readFileSync(path, 'utf8')) as LevelRecord;
  levelCache.set(order, level);
  return level;
}

function levelLabel(order: number): string {
  const level = levelByOrder(order);
  return `${level.chapter}-${level.order} ${level.title}`;
}

function uiSolution(order: number): UiDir[] {
  const result = bfsSolve(levelByOrder(order), { maxNodes: 700_000, maxDepth: 120 });
  if (!result.solvable) throw new Error(`第 ${order} 关 BFS 不可解: ${result.reason ?? ''}`);
  return result.solution.map((dir) => dir.toLowerCase() as UiDir);
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

async function expectResult(page: Page, moves: number): Promise<void> {
  await expect(page.getByTestId('result-text')).toContainText(`步数 ${moves}`, { timeout: 5000 });
}

async function unlockAndStart(page: Page, unlock: number, label = levelLabel(unlock)): Promise<void> {
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

test('首次用户前三关完整流程（FR-01/FR-02/FR-04）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  await expect(page.getByTestId('status')).toContainText('让蓝与橙同时到达');
  await expect(page.getByTestId('home-continue')).toContainText('第 1 / 50 关');

  await startGame(page);
  await expect(page.getByTestId('level-label')).toHaveText('1-1 第一次分岔');
  await expect(page.getByTestId('target-count')).toHaveText('1');
  await expect(page.getByTestId('btn-hint')).toBeVisible();
  await pressMove(page, 'left', 1);
  await expectResult(page, 1);

  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-2 左右相反');
  await pressMove(page, 'up', 1);
  await pressMove(page, 'up', 2);
  await pressMove(page, 'left', 3);
  await expectResult(page, 3);

  await page.getByTestId('btn-next').click();
  await expect(page.getByTestId('level-label')).toHaveText('1-3 同步双出口');
  await pressMove(page, 'down', 1);
  await pressMove(page, 'down', 2);
  await pressMove(page, 'down', 3);
  await pressMove(page, 'down', 4);
  await expectResult(page, 4);
  g.assertClean();
});

test('设置页：开关切换可见且可操作（FR-10）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('bar-settings')).toBeVisible({ timeout: 5000 });
  for (const id of ['toggle-music', 'toggle-sfx', 'toggle-vibration', 'toggle-reducedAnim']) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await page.getByTestId('toggle-music').click();
  await page.getByTestId('btn-settings-back').click();
  await expect(page.getByTestId('bar-settings')).not.toBeVisible();
  g.assertClean();
});

test('设置页刷新后状态恢复（FR-07/FR-10）', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  await page.getByTestId('btn-settings').click();
  await page.getByTestId('toggle-music').click();
  await page.getByTestId('btn-settings-back').click();
  await page.reload();
  await expect(page.getByTestId('btn-start')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('toggle-music')).toBeVisible();
  g.assertClean();
});

test('刷新后进度保持（FR-07）', async ({ page }) => {
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

test('章节选择展示新的后半程章节身份', async ({ page }) => {
  const g = guard(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'twinfold-paths:save:a',
      JSON.stringify({ version: 2, highestUnlocked: 50, bestMoves: {} })
    );
  });
  await openHome(page);
  await page.getByTestId('btn-chapter-select').click();
  await expect(page.getByTestId('chapter-grid')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('chapter-3')).toContainText('扩域迷阵');
  await expect(page.getByTestId('chapter-4')).toContainText('暗域探索');
  await expect(page.getByTestId('chapter-5')).toContainText('时相终局');
  g.assertClean();
});

test('第四章从 4-31 起仍是探索迷雾，但地图已经换成开放共享迷宫', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const g = guard(page);
  const level = levelByOrder(31);
  await unlockAndStart(page, 31);
  await expect(page.getByTestId('target-count')).toHaveText(String(level.parMoves));
  await expect(page.getByTestId('status')).toContainText('本章全程探索迷雾');
  const prefix = uiSolution(31).slice(0, 4);
  for (let i = 0; i < prefix.length; i++) await pressMove(page, prefix[i]!, i + 1);
  g.assertClean();
  await ctx.close();
});

test('第五章 M9 相位门与开放迷宫组合后仍可完整求解', async ({ browser }) => {
  test.setTimeout(60_000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const g = guard(page);
  const level = levelByOrder(41);
  expect(level.entities.some((entity) => entity.type === 'phaseDoor')).toBe(true);
  await unlockAndStart(page, 41);
  const solution = uiSolution(41);
  for (let i = 0; i < solution.length; i++) await pressMove(page, solution[i]!, i + 1);
  await expectResult(page, level.parMoves);
  g.assertClean();
  await ctx.close();
});

test('清除进度按钮可见且可操作', async ({ page }) => {
  const g = guard(page);
  await openHome(page);
  await expect(page.getByTestId('btn-clear-progress')).toBeVisible();
  await expect(page.getByTestId('btn-chapter-select')).toBeVisible();
  await expect(page.getByTestId('btn-settings')).toBeVisible();
  g.assertClean();
});
