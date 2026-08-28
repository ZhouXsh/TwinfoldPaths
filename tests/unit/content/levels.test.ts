import { describe, expect, it } from 'vitest';
import {
  FIRST_LEVEL_ID,
  LEVELS,
  getLevelById,
  levelLinearIndex,
  nextLevelId
} from '../../../src/content/levels';
import { parseLevel } from '../../../src/content/validate';
import {
  analyzeSolutionTrace,
  bfsSolve,
  replaySolution
} from '../../../tools/solver/bfs-solver';

let solvedCache: ReturnType<typeof buildSolveAll> | null = null;

function buildSolveAll() {
  return LEVELS.map((level) => ({ level, result: bfsSolve(level) }));
}

function solveAll() {
  solvedCache ??= buildSolveAll();
  return solvedCache;
}

function pointKey(p: { x: number; y: number }): string {
  return `${p.x},${p.y}`;
}

function openCells(level: (typeof LEVELS)[number]): Set<string> {
  const walls = new Set(level.walls.map(pointKey));
  const open = new Set<string>();
  for (let y = 0; y < level.grid.height; y++) {
    for (let x = 0; x < level.grid.width; x++) {
      if (!walls.has(`${x},${y}`)) open.add(`${x},${y}`);
    }
  }
  return open;
}

function openNeighbors(
  level: (typeof LEVELS)[number],
  open: Set<string>,
  p: { x: number; y: number }
): Array<{ x: number; y: number }> {
  return [
    { x: p.x + 1, y: p.y },
    { x: p.x - 1, y: p.y },
    { x: p.x, y: p.y + 1 },
    { x: p.x, y: p.y - 1 }
  ].filter(
    (q) =>
      q.x >= 0 &&
      q.y >= 0 &&
      q.x < level.grid.width &&
      q.y < level.grid.height &&
      open.has(pointKey(q))
  );
}

function canReach(
  level: (typeof LEVELS)[number],
  start: { x: number; y: number },
  target: { x: number; y: number }
): boolean {
  const open = openCells(level);
  const seen = new Set([pointKey(start)]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    if (pointKey(current) === pointKey(target)) return true;
    for (const next of openNeighbors(level, open, current)) {
      const k = pointKey(next);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push(next);
    }
  }
  return false;
}

function deadEndCount(level: (typeof LEVELS)[number]): number {
  const open = openCells(level);
  const protectedCells = new Set([
    pointKey(level.blueStart),
    pointKey(level.orangeStart),
    pointKey(level.blueExit),
    pointKey(level.orangeExit)
  ]);
  let count = 0;
  for (const cell of open) {
    if (protectedCells.has(cell)) continue;
    const [x, y] = cell.split(',').map(Number);
    if (openNeighbors(level, open, { x: x!, y: y! }).length === 1) count++;
  }
  return count;
}

function branchCount(level: (typeof LEVELS)[number]): number {
  const open = openCells(level);
  let count = 0;
  for (const cell of open) {
    const [x, y] = cell.split(',').map(Number);
    if (openNeighbors(level, open, { x: x!, y: y! }).length >= 3) count++;
  }
  return count;
}

describe('关卡注册表（levels/chapter-01..05）', () => {
  it('注册表恰有 50 关，按章节/序号排序', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(ids.length).toBe(50);
    for (let ch = 1; ch <= 5; ch++) {
      expect(LEVELS.filter((l) => l.chapter === ch).length, `第${ch}章应有 10 关`).toBe(10);
    }
    for (let i = 1; i < ids.length; i++) {
      const curr = LEVELS[i];
      const prev = LEVELS[i - 1];
      expect(curr?.order, `LEVELS[${i}] 顺序异常`).toBeGreaterThan(prev?.order ?? 0);
    }
    expect(FIRST_LEVEL_ID).toBe('level-001');
    expect(LEVELS[0]?.id).toBe('level-001');
    expect(LEVELS.at(-1)?.id).toBe('level-050');
  });

  it('全部 50 关 BFS 可解、可回放，且 parMoves 必须严格等于最优步数', () => {
    for (const { level, result } of solveAll()) {
      expect(result.solvable, `${level.id} 应可解: ${result.reason ?? ''}`).toBe(true);
      expect(result.budgetExhausted, `${level.id} 不应超预算`).toBe(false);
      expect(replaySolution(level, result.solution), `${level.id} 最短解回放应胜利`).toBe(true);
      expect(level.parMoves, `${level.id} parMoves 必须由 BFS 精确回填`).toBe(result.optimalSteps);
      expect(level.parMovesNote ?? '', `${level.id} 应记录 BFS 依据`).toMatch(/BFS/);
    }
  });

  it('九宫格探索迷雾成为 50/50 常驻核心规则，同时保留渐进变体', () => {
    for (const level of LEVELS) {
      expect(level.visibility?.mode, `${level.id} 必须常驻探索迷雾`).toBe('fog');
      expect(level.visibility?.radius, `${level.id} 必须保持九宫格半径=1`).toBe(1);
      expect(level.visibility?.shape, `${level.id} 核心视野必须保持 3x3 square`).toBe('square');
      expect(level.tags).toContain('V1-fog');
      expect(level.tags).toContain('exploration-core');
    }

    const late = LEVELS.filter((level) => level.order >= 21);
    expect(late.some((level) => level.visibility?.memory === 'none')).toBe(true);
    expect(late.some((level) => level.visibility?.memory === 'decay')).toBe(true);
    expect(late.some((level) => level.visibility?.source === 'alternating')).toBe(true);
    expect(late.some((level) => (level.visibility?.pulseEvery ?? 0) > 0)).toBe(true);
  });

  it('后 30 关继续保持长解大地图，而不是为开放地图牺牲难度', () => {
    const solved = solveAll().filter(({ level }) => level.order >= 21);
    const avg = solved.reduce((sum, x) => sum + x.result.optimalSteps, 0) / solved.length;
    expect(avg, `后30关平均最优步数=${avg.toFixed(2)}，仍然过短`).toBeGreaterThanOrEqual(18);

    const largeCount = solved.filter(
      ({ level }) => Math.max(level.grid.width, level.grid.height) >= 9
    ).length;
    expect(largeCount, '后30关至少 80% 应为 9 格以上长边的大地图').toBeGreaterThanOrEqual(24);

    for (const chapter of [3, 4, 5]) {
      const rows = solved.filter(({ level }) => level.chapter === chapter);
      const chapterAvg = rows.reduce((sum, x) => sum + x.result.optimalSteps, 0) / rows.length;
      expect(chapterAvg, `第${chapter}章平均最优步数过短`).toBeGreaterThanOrEqual(15);
    }
  });

  it('11–50 关是同一开放迷宫网络，具有分岔与死胡同，不再是两条细管', () => {
    for (const level of LEVELS.filter((item) => item.order >= 11)) {
      expect(level.tags, `${level.id} 缺 maze 标签`).toContain('maze');
      expect(level.tags, `${level.id} 缺 open-maze 标签`).toContain('open-maze');
      expect(level.tags, `${level.id} 缺 shared-maze 标签`).toContain('shared-maze');
      expect(
        canReach(level, level.blueStart, level.orangeStart),
        `${level.id} 双球区域仍然几何隔离`
      ).toBe(true);
      expect(deadEndCount(level), `${level.id} 至少应有两个非起终点死胡同`).toBeGreaterThanOrEqual(
        2
      );
      expect(branchCount(level), `${level.id} 至少应有四个三向/四向分岔`).toBeGreaterThanOrEqual(4);
    }
  });

  it('11–50 关最优解都真实利用对穿交换与共享空间，而不是靠固定独立路线', () => {
    for (const { level, result } of solveAll().filter(({ level }) => level.order >= 11)) {
      const stats = analyzeSolutionTrace(level, result.solution);
      expect(level.tags, `${level.id} 缺 pass-through-design 标签`).toContain('pass-through-design');
      expect(level.tags, `${level.id} 缺 cross-interaction 标签`).toContain('cross-interaction');
      expect(stats.passThroughSwaps, `${level.id} 最优解未出现双球对穿交换`).toBeGreaterThanOrEqual(1);
      expect(stats.sharedVisitedCells, `${level.id} 双球没有共享走过的空间`).toBeGreaterThanOrEqual(2);
      expect(
        stats.blueBlockedOrangeMoved + stats.orangeBlockedBlueMoved,
        `${level.id} 缺少单侧受阻造成的同步解耦`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('第四章保留探索章节身份，但不再独占迷雾规则', () => {
    const chapter4 = LEVELS.filter((level) => level.chapter === 4);
    expect(chapter4).toHaveLength(10);
    for (const level of chapter4) {
      expect(level.visibility?.mode).toBe('fog');
      expect(level.tags, `${level.id} 缺 exploration 标签`).toContain('exploration');
    }
    const featureTags = new Set(chapter4.flatMap((level) => level.tags));
    for (const tag of ['fog-no-memory', 'fog-decay', 'fog-alternating', 'fog-radar', 'V2-beacon']) {
      expect(featureTags.has(tag), `第四章缺少探索变体 ${tag}`).toBe(true);
    }
  });

  it('第五章完整引入 M9 相位门，且每章仍至少有一个教学关', () => {
    const chapter5 = LEVELS.filter((level) => level.chapter === 5);
    expect(chapter5.every((level) => level.tags.includes('M9'))).toBe(true);
    expect(chapter5.every((level) => level.entities.some((e) => e.type === 'phaseDoor'))).toBe(
      true
    );
    for (let chapter = 1; chapter <= 5; chapter++) {
      const rows = LEVELS.filter((level) => level.chapter === chapter);
      expect(
        rows.some((level) => level.tags.includes('tutorial')),
        `第${chapter}章缺教学关`
      ).toBe(true);
      for (const level of rows) {
        expect(level.tags).toContain(`chapter-${chapter}`);
        expect(
          level.tags.some((t) => /^M\d+$/.test(t)),
          `${level.id} 缺机制标签`
        ).toBe(true);
      }
    }
  });

  it('nextLevelId 链与关卡顺序一致，末关返回 null', () => {
    expect(nextLevelId('level-001')).toBe('level-002');
    expect(nextLevelId('level-010')).toBe('level-011');
    expect(nextLevelId('level-020')).toBe('level-021');
    expect(nextLevelId('level-030')).toBe('level-031');
    expect(nextLevelId('level-040')).toBe('level-041');
    expect(nextLevelId('level-050')).toBeNull();
    expect(nextLevelId('不存在')).toBeNull();
    expect(getLevelById('level-002')?.title).toBe('左右相反');
  });

  it('levelLinearIndex 给出 1 基全局序号（50 关连续编号）', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      expect(levelLinearIndex(LEVELS[i]!.id)).toBe(i + 1);
    }
    expect(levelLinearIndex('不存在')).toBe(-1);
  });
});

function validRaw(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'level-001',
    chapter: 1,
    order: 1,
    title: '第一次分岔',
    grid: { width: 5, height: 3 },
    blueStart: { x: 1, y: 1 },
    orangeStart: { x: 3, y: 1 },
    blueExit: { x: 0, y: 1 },
    orangeExit: { x: 3, y: 1 },
    initialMapping: 'H_MIRROR',
    walls: [{ x: 4, y: 1 }],
    entities: [],
    parMoves: 1,
    parMovesNote: 'BFS 最短步数=1',
    hint: { focus: '测试', direction: 'LEFT' },
    tags: ['chapter-1', 'tutorial', 'M0']
  };
}

describe('parseLevel 严格校验（拒绝静默修复）', () => {
  it('合法数据通过解析', () => {
    const level = parseLevel(validRaw());
    expect(level.id).toBe('level-001');
    expect(level.hint.direction).toBe('LEFT');
  });

  it('探索规则可解析且严格拒绝未知字段', () => {
    const raw = validRaw();
    raw.visibility = {
      mode: 'fog',
      radius: 1,
      shape: 'diamond',
      memory: 'decay',
      memoryTurns: 3,
      source: 'alternating',
      pulseEvery: 5,
      pulseRadius: 12
    };
    expect(parseLevel(raw).visibility?.shape).toBe('diamond');
    (raw.visibility as Record<string, unknown>).unknown = true;
    expect(() => parseLevel(raw)).toThrow(/未知字段/);
  });

  it('拒绝未知顶层字段', () => {
    const raw = validRaw();
    raw.extraField = 1;
    expect(() => parseLevel(raw)).toThrow(/未知字段/);
  });

  it('拒绝不受支持的 schemaVersion', () => {
    const raw = validRaw();
    raw.schemaVersion = 2;
    expect(() => parseLevel(raw)).toThrow(/schemaVersion/);
  });

  it('拒绝越界坐标', () => {
    const raw = validRaw();
    raw.walls = [{ x: 9, y: 1 }];
    expect(() => parseLevel(raw)).toThrow(/越界/);
  });

  it('拒绝双角色起点重合', () => {
    const raw = validRaw();
    raw.orangeStart = { x: 1, y: 1 };
    expect(() => parseLevel(raw)).toThrow(/起点重合/);
  });

  it('拒绝双出口重合', () => {
    const raw = validRaw();
    raw.orangeExit = { x: 0, y: 1 };
    expect(() => parseLevel(raw)).toThrow(/出口重合/);
  });

  it('拒绝墙压在出口上', () => {
    const raw = validRaw();
    raw.walls = [{ x: 0, y: 1 }];
    expect(() => parseLevel(raw)).toThrow(/重合/);
  });

  it('拒绝非法 parMoves 与空 tags', () => {
    const rawA = validRaw();
    rawA.parMoves = 0;
    expect(() => parseLevel(rawA)).toThrow(/parMoves/);
    const rawB = validRaw();
    rawB.tags = [];
    expect(() => parseLevel(rawB)).toThrow(/tags/);
  });

  it('拒绝未知实体类型', () => {
    const raw = validRaw();
    raw.entities = [{ type: 'mystery', x: 2, y: 1 }];
    expect(() => parseLevel(raw)).toThrow(/未知实体类型/);
  });
});
