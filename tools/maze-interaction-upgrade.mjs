import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bfsSolve } from '../tools-dist/solverApi.mjs';

const ROOT = process.cwd();
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

const key = (p) => `${p.x},${p.y}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => a.x === b.x && a.y === b.y;

function inBounds(level, p) {
  return p.x >= 0 && p.y >= 0 && p.x < level.grid.width && p.y < level.grid.height;
}

function allOpen(level) {
  const walls = new Set(level.walls.map(key));
  const open = new Set();
  for (let y = 0; y < level.grid.height; y++) {
    for (let x = 0; x < level.grid.width; x++) {
      if (!walls.has(`${x},${y}`)) open.add(`${x},${y}`);
    }
  }
  return open;
}

function neighbors(level, p) {
  const out = [];
  for (const [dx, dy] of DIRS) {
    const q = { x: p.x + dx, y: p.y + dy };
    if (inBounds(level, q)) out.push(q);
  }
  return out;
}

function shortestPath(level, open, start, goal) {
  const goalKey = key(goal);
  const queue = [start];
  const prev = new Map([[key(start), null]]);
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    if (key(p) === goalKey) break;
    for (const q of neighbors(level, p)) {
      const qk = key(q);
      if (!open.has(qk) || prev.has(qk)) continue;
      prev.set(qk, p);
      queue.push(q);
    }
  }
  if (!prev.has(goalKey)) return null;
  const path = [];
  let cur = goal;
  while (cur) {
    path.push(cur);
    cur = prev.get(key(cur));
  }
  path.reverse();
  return path;
}

function reachable(level, open, start) {
  const seen = new Set([key(start)]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    for (const q of neighbors(level, p)) {
      const qk = key(q);
      if (!open.has(qk) || seen.has(qk)) continue;
      seen.add(qk);
      queue.push(q);
    }
  }
  return seen;
}

function pathCandidate(a, b, horizontalFirst) {
  const out = [{ ...a }];
  let x = a.x;
  let y = a.y;
  if (horizontalFirst) {
    while (x !== b.x) {
      x += Math.sign(b.x - x);
      out.push({ x, y });
    }
    while (y !== b.y) {
      y += Math.sign(b.y - y);
      out.push({ x, y });
    }
  } else {
    while (y !== b.y) {
      y += Math.sign(b.y - y);
      out.push({ x, y });
    }
    while (x !== b.x) {
      x += Math.sign(b.x - x);
      out.push({ x, y });
    }
  }
  return out;
}

function chooseBridge(level, open, blueComp, orangeComp) {
  const toPoint = (s) => {
    const [x, y] = s.split(',').map(Number);
    return { x, y };
  };
  const blueCells = [...blueComp].map(toPoint);
  const orangeCells = [...orangeComp].map(toPoint);
  let best = null;
  for (const a of blueCells) {
    for (const b of orangeCells) {
      const manhattan = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (manhattan < 2) continue;
      for (const horizontalFirst of [true, false]) {
        const cells = pathCandidate(a, b, horizontalFirst);
        let existingInterior = 0;
        let adjacencyPenalty = 0;
        for (let i = 1; i < cells.length - 1; i++) {
          const c = cells[i];
          if (open.has(key(c))) existingInterior++;
          for (const n of neighbors(level, c)) {
            if (open.has(key(n)) && !same(n, cells[i - 1]) && !same(n, cells[i + 1])) {
              adjacencyPenalty++;
            }
          }
        }
        const score = existingInterior * 1000 + adjacencyPenalty * 20 + manhattan;
        if (!best || score < best.score) best = { score, cells };
      }
    }
  }
  return best?.cells ?? null;
}

function carveBridge(level, open) {
  const blueComp = reachable(level, open, level.blueStart);
  if (blueComp.has(key(level.orangeStart))) return { open, carved: 0 };
  const orangeComp = reachable(level, open, level.orangeStart);
  const bridge = chooseBridge(level, open, blueComp, orangeComp);
  if (!bridge) throw new Error(`${level.id}: 无法找到共享迷宫连接走廊`);
  let carved = 0;
  for (const cell of bridge) {
    const k = key(cell);
    if (!open.has(k)) {
      open.add(k);
      carved++;
    }
  }
  if (!reachable(level, open, level.blueStart).has(key(level.orangeStart))) {
    throw new Error(`${level.id}: 共享走廊未连通双球区域`);
  }
  return { open, carved };
}

function protectedCells(level) {
  return new Set([
    key(level.blueStart),
    key(level.orangeStart),
    key(level.blueExit),
    key(level.orangeExit),
    ...level.entities.map(key)
  ]);
}

function addDeadEnds(level, open, desired) {
  const protectedSet = protectedCells(level);
  const origins = [...open]
    .map((s) => {
      const [x, y] = s.split(',').map(Number);
      return { x, y };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
  let made = 0;
  for (const origin of origins) {
    if (made >= desired) break;
    if (protectedSet.has(key(origin))) continue;
    const originDegree = neighbors(level, origin).filter((p) => open.has(key(p))).length;
    if (originDegree < 2 || originDegree > 3) continue;
    for (let d = 0; d < DIRS.length && made < desired; d++) {
      const [dx, dy] = DIRS[(d + level.order + made) % DIRS.length];
      const length = 2 + ((level.order + made) % 3);
      const branch = [];
      let prev = origin;
      let valid = true;
      const temp = new Set(open);
      for (let step = 1; step <= length; step++) {
        const cell = { x: origin.x + dx * step, y: origin.y + dy * step };
        if (!inBounds(level, cell) || protectedSet.has(key(cell)) || temp.has(key(cell))) {
          valid = false;
          break;
        }
        const openNeighbors = neighbors(level, cell).filter((p) => temp.has(key(p)));
        if (openNeighbors.length !== 1 || !same(openNeighbors[0], prev)) {
          valid = false;
          break;
        }
        branch.push(cell);
        temp.add(key(cell));
        prev = cell;
      }
      if (!valid || branch.length < 2) continue;
      for (const cell of branch) open.add(key(cell));
      made++;
    }
  }
  return made;
}

function countDeadEnds(level, open) {
  const protectedSet = new Set([
    key(level.blueStart),
    key(level.orangeStart),
    key(level.blueExit),
    key(level.orangeExit)
  ]);
  let count = 0;
  for (const s of open) {
    if (protectedSet.has(s)) continue;
    const [x, y] = s.split(',').map(Number);
    const degree = neighbors(level, { x, y }).filter((p) => open.has(key(p))).length;
    if (degree === 1) count++;
  }
  return count;
}

function ensureLeafDeadEnds(level, open, minCount) {
  const protectedSet = protectedCells(level);
  let added = 0;
  while (countDeadEnds(level, open) < minCount) {
    let chosen = null;
    for (let y = 0; y < level.grid.height && !chosen; y++) {
      for (let x = 0; x < level.grid.width; x++) {
        const cell = { x, y };
        const k = key(cell);
        if (open.has(k) || protectedSet.has(k)) continue;
        const linked = neighbors(level, cell).filter((p) => open.has(key(p)));
        if (linked.length === 1) {
          chosen = cell;
          break;
        }
      }
    }
    if (!chosen) break;
    open.add(key(chosen));
    added++;
  }
  return added;
}

function setWallsFromOpen(level, open) {
  const walls = [];
  for (let y = 0; y < level.grid.height; y++) {
    for (let x = 0; x < level.grid.width; x++) {
      if (!open.has(`${x},${y}`)) walls.push({ x, y });
    }
  }
  level.walls = walls;
}

function progressiveFog(order) {
  const base = { mode: 'fog', radius: 1, shape: 'square', memory: 'persistent', source: 'both' };
  if (order <= 20) return base;
  const index = (order - 21) % 10;
  const variants = [
    {},
    { memory: 'decay', memoryTurns: 5 },
    { memory: 'persistent', source: 'alternating' },
    { memory: 'decay', memoryTurns: 4 },
    { memory: 'none' },
    { memory: 'persistent', pulseEvery: 7, pulseRadius: 12 },
    { memory: 'decay', memoryTurns: 3, source: 'alternating' },
    { memory: 'persistent', pulseEvery: 6, pulseRadius: 16 },
    { memory: 'decay', memoryTurns: 2 },
    { memory: 'none', pulseEvery: 5, pulseRadius: 20 }
  ];
  return { ...base, ...variants[index] };
}

function normalizeExploration(level) {
  // “九宫格探索”是固定底座；已有章节的记忆、交替视野、雷达等差异化规则继续保留。
  const previous = level.visibility;
  const fallback = progressiveFog(level.order);
  level.visibility = {
    ...(previous ?? fallback),
    mode: 'fog',
    radius: 1,
    shape: 'square',
    memory: previous?.memory ?? fallback.memory ?? 'persistent',
    source: previous?.source ?? fallback.source ?? 'both'
  };

  // 旧的菱形/十字视野不再改变基础 3x3 形状，改用机关与记忆规则形成区分度。
  const remove = new Set(['fog-diamond', 'fog-cross']);
  level.tags = level.tags.filter((tag) => !remove.has(tag));
  for (const tag of ['V1-fog', 'exploration-core']) {
    if (!level.tags.includes(tag)) level.tags.push(tag);
  }

  if (level.id === 'level-035') {
    level.title = '暗门择路';
    level.hint.focus = '九宫格视野保持不变；单向格和专属门藏在岔路中，先探索再决定哪条路值得深入。';
  }
  if (level.id === 'level-036') {
    level.title = '互锁探路';
    level.hint.focus = '九宫格视野保持不变；压板门要求两球互相提供通路，先找压板，再判断另一侧的门。';
  }
}

function pathOnBase(level, baseOpen, start, exit) {
  const path = shortestPath(level, baseOpen, start, exit);
  if (!path || path.length < 5) throw new Error(`${level.id}: 原始主路径不足，无法放置跨球门锁`);
  return path;
}

function occupiedEntityKeys(level) {
  return new Set(level.entities.map(key));
}

function crossGateEntities(level, bluePath, orangePath, ratio, gateNo) {
  const occupied = occupiedEntityKeys(level);
  const maxIndex = Math.min(bluePath.length, orangePath.length) - 2;
  const center = Math.max(1, Math.min(maxIndex, Math.floor(maxIndex * ratio)));
  const offsets = [0, 1, -1, 2, -2, 3, -3];
  for (const offset of offsets) {
    const i = center + offset;
    if (i < 1 || i > maxIndex) continue;
    const bp = bluePath[i];
    const bd = bluePath[i + 1];
    const op = orangePath[i];
    const od = orangePath[i + 1];
    const cells = [bp, bd, op, od];
    if (new Set(cells.map(key)).size !== 4) continue;
    if (cells.some((p) => occupied.has(key(p)))) continue;
    const prefix = `${level.id}-cross-${gateNo}`;
    return [
      { type: 'plate', id: `${prefix}-bp`, x: bp.x, y: bp.y, doorId: `${prefix}-od` },
      { type: 'door', id: `${prefix}-od`, x: od.x, y: od.y },
      { type: 'plate', id: `${prefix}-op`, x: op.x, y: op.y, doorId: `${prefix}-bd` },
      { type: 'door', id: `${prefix}-bd`, x: bd.x, y: bd.y }
    ];
  }
  return null;
}

function tryAddCrossGate(level, bluePath, orangePath, ratio, gateNo, minSteps) {
  const gate = crossGateEntities(level, bluePath, orangePath, ratio, gateNo);
  if (!gate) return false;
  const original = clone(level.entities);
  level.entities.push(...gate);
  const result = bfsSolve(level, { maxNodes: 700_000, maxDepth: 120 });
  if (!result.solvable || result.budgetExhausted || result.optimalSteps < minSteps) {
    level.entities = original;
    return false;
  }
  return true;
}

function upgradeLate(level) {
  const originalPar = level.parMoves;
  const baseOpen = allOpen(level);
  const bluePath = pathOnBase(level, baseOpen, level.blueStart, level.blueExit);
  const orangePath = pathOnBase(level, baseOpen, level.orangeStart, level.orangeExit);
  const open = new Set(baseOpen);
  const bridge = carveBridge(level, open);
  const desiredDeadEnds = Math.min(3 + Math.floor((level.order - 21) / 5), 8);
  const addedLongDeadEnds = addDeadEnds(level, open, desiredDeadEnds);
  const addedLeafDeadEnds = ensureLeafDeadEnds(level, open, Math.max(3, desiredDeadEnds));
  const addedDeadEnds = addedLongDeadEnds + addedLeafDeadEnds;
  setWallsFromOpen(level, open);

  for (const tag of ['maze', 'shared-maze']) {
    if (!level.tags.includes(tag)) level.tags.push(tag);
  }

  const minSteps = Math.max(10, originalPar - 1);
  let crossGates = 0;
  if (level.order >= 23) {
    for (const ratio of [0.22, 0.32, 0.42, 0.56, 0.68]) {
      if (tryAddCrossGate(level, bluePath, orangePath, ratio, 1, minSteps)) {
        crossGates = 1;
        break;
      }
    }
    if (crossGates === 0) throw new Error(`${level.id}: 无法加入可解的跨球互锁门`);
    if (!level.tags.includes('cross-interaction')) level.tags.push('cross-interaction');
  }

  if (level.order >= 41) {
    for (const ratio of [0.62, 0.72, 0.78]) {
      if (tryAddCrossGate(level, bluePath, orangePath, ratio, 2, minSteps)) {
        crossGates = 2;
        break;
      }
    }
  }

  const result = bfsSolve(level, { maxNodes: 900_000, maxDepth: 140 });
  if (!result.solvable || result.budgetExhausted) {
    throw new Error(`${level.id}: 迷宫/互动升级后不可解`);
  }
  level.parMoves = result.optimalSteps;
  level.parMovesNote = `BFS 最短步数=${result.optimalSteps}；全局九宫格迷雾 + 共享迷宫 + 跨球互锁后自动回填`;
  return {
    id: level.id,
    order: level.order,
    optimalSteps: result.optimalSteps,
    originalPar,
    bridgeCells: bridge.carved,
    addedDeadEnds,
    deadEnds: countDeadEnds(level, allOpen(level)),
    crossGates,
    shared: reachable(level, allOpen(level), level.blueStart).has(key(level.orangeStart))
  };
}

function loadLevel(order) {
  const chapter = Math.ceil(order / 10);
  const id = `level-${String(order).padStart(3, '0')}`;
  const path = resolve(ROOT, 'levels', `chapter-${String(chapter).padStart(2, '0')}`, `${id}.json`);
  return { path, level: JSON.parse(readFileSync(path, 'utf8')) };
}

const report = [];
for (let order = 1; order <= 50; order++) {
  const { path, level } = loadLevel(order);
  normalizeExploration(level);
  let row = { id: level.id, order, optimalSteps: level.parMoves, globalFog: true };
  if (order >= 21) row = { ...row, ...upgradeLate(level) };
  writeFileSync(path, `${JSON.stringify(level, null, 2)}\n`, 'utf8');
  report.push(row);
}

const late = report.filter((row) => row.order >= 21);
const avg = late.reduce((sum, row) => sum + row.optimalSteps, 0) / late.length;
if (avg < 18) throw new Error(`后 30 关平均最优解下降过多: ${avg.toFixed(2)} < 18`);
if (!late.every((row) => row.shared)) throw new Error('后 30 关仍存在双路径不连通关卡');
if (!late.filter((row) => row.order >= 23).every((row) => row.crossGates >= 1)) {
  throw new Error('23–50 关存在缺少跨球互锁的关卡');
}
if (!late.every((row) => row.deadEnds >= 2)) {
  const bad = late.filter((row) => row.deadEnds < 2).map((row) => `${row.id}:${row.deadEnds}`);
  throw new Error(`后 30 关存在死胡同不足的关卡: ${bad.join(', ')}`);
}

const summary = {
  generatedAt: new Date().toISOString(),
  averageLate: avg,
  allLevelsFog: true,
  lateSharedMazeCount: late.filter((row) => row.shared).length,
  lateCrossInteractionCount: late.filter((row) => row.crossGates >= 1).length,
  levels: report
};
writeFileSync(
  resolve(ROOT, 'reports', 'global-fog-maze-interaction-summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
  'utf8'
);

const markdown = [
  '# 全局九宫格迷雾 / 迷宫化 / 双球互动升级验收',
  '',
  '- 50/50 关启用九宫格探索迷雾（square radius=1）。',
  '- 既有无痕、衰减记忆、交替视野、周期雷达、信标等差异化规则继续保留，基础视野统一为九宫格。',
  '- 21–50 关双球起点处于同一连通迷宫网络，不再是两条完全分离的固定通道。',
  '- 23–50 关加入跨球互锁压板门：一侧角色的站位会直接决定另一侧能否通过。',
  '- 21–50 关加入多格与叶节点死胡同，保留误入、回退与路线判断空间。',
  `- 后 30 关 BFS 平均最优步数：${avg.toFixed(2)}。`,
  '',
  '| 关卡 | 最优步数 | 新增死胡同 | 死胡同总数 | 共享走廊开格 | 跨球门组 |',
  '|---|---:|---:|---:|---:|---:|',
  ...late.map(
    (row) =>
      `| ${row.id} | ${row.optimalSteps} | ${row.addedDeadEnds} | ${row.deadEnds} | ${row.bridgeCells} | ${row.crossGates} |`
  ),
  ''
].join('\n');
writeFileSync(resolve(ROOT, 'reports', 'global-fog-maze-interaction-summary.md'), markdown, 'utf8');

console.log(
  `global fog=50/50; late avg=${avg.toFixed(2)}; shared=${late.length}/30; cross=${late.filter((x) => x.crossGates >= 1).length}/30`
);
