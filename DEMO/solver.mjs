// 《双生折线》demo 关卡 BFS 求解器（仅 tmp 沙箱使用）
// 引擎语义与仓库 src/domain/engine.ts 的 M0 核心路径一致：
// R-02 蓝色原方向/橙色水平镜像；R-03 阻挡停留；R-04 同格取消、允许对穿；R-05 双出口同回合胜利。
// 用法: node tmp/solver.mjs

const DELTA = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};
const H_MIRROR = { LEFT: 'RIGHT', RIGHT: 'LEFT', UP: 'UP', DOWN: 'DOWN' };
const DIRS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

const key = (p) => `${p.x},${p.y}`;
const eq = (a, b) => a.x === b.x && a.y === b.y;
const inBounds = (grid, p) => p.x >= 0 && p.y >= 0 && p.x < grid.width && p.y < grid.height;

function propose(level, walls, from, dir) {
  const to = { x: from.x + DELTA[dir].x, y: from.y + DELTA[dir].y };
  if (!inBounds(level.grid, to) || walls.has(key(to))) {
    return { to: { ...from }, blocked: true };
  }
  return { to, blocked: false };
}

// 返回 {blue, orange} 或 null（同格取消，回合不成立）
function applyCommand(level, walls, st, input) {
  const blueStep = propose(level, walls, st.blue, input);
  const orangeStep = propose(level, walls, st.orange, H_MIRROR[input]);
  if (eq(blueStep.to, orangeStep.to)) return null;
  return { blue: blueStep.to, orange: orangeStep.to };
}

function solve(level, maxDepth = 80) {
  const walls = new Set(level.walls.map(key));
  const start = { blue: { ...level.blueStart }, orange: { ...level.orangeStart } };
  const isWin = (s) => eq(s.blue, level.blueExit) && eq(s.orange, level.orangeExit);
  if (isWin(start)) return { moves: [], note: 'start-is-win' };

  const stateKey = (s) => `${key(s.blue)}|${key(s.orange)}`;
  const seen = new Set([stateKey(start)]);
  let frontier = [{ s: start, moves: [] }];

  for (let depth = 0; depth < maxDepth; depth++) {
    const next = [];
    for (const node of frontier) {
      for (const d of DIRS) {
        const ns = applyCommand(level, walls, node.s, d);
        if (!ns) continue;
        const k = stateKey(ns);
        if (seen.has(k)) continue;
        seen.add(k);
        const moves = [...node.moves, d];
        if (isWin(ns)) return { moves, states: seen.size };
        next.push({ s: ns, moves });
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return null;
}

// 回放校验：逐步应用解法序列，最终必须恰好双出口同回合达成
function replay(level, moves) {
  const walls = new Set(level.walls.map(key));
  let st = { blue: { ...level.blueStart }, orange: { ...level.orangeStart } };
  for (const d of moves) {
    const ns = applyCommand(level, walls, st, d);
    if (!ns) return false;
    st = ns;
  }
  return eq(st.blue, level.blueExit) && eq(st.orange, level.orangeExit);
}

const P = (x, y) => ({ x, y });
const wallRow = (width, y) => Array.from({ length: width }, (_, x) => P(x, y));

// ---- 官方前三关（回放校验引擎移植正确性：期望 par = 1 / 3 / 4） ----
const OFFICIAL = [
  {
    id: 'level-001',
    grid: { width: 5, height: 3 },
    blueStart: P(1, 1),
    orangeStart: P(3, 1),
    blueExit: P(0, 1),
    orangeExit: P(3, 1),
    walls: [P(4, 1)],
    expectPar: 1
  },
  {
    id: 'level-002',
    grid: { width: 5, height: 5 },
    blueStart: P(1, 3),
    orangeStart: P(3, 3),
    blueExit: P(0, 1),
    orangeExit: P(4, 1),
    walls: [],
    expectPar: 3
  },
  {
    id: 'level-003',
    grid: { width: 5, height: 5 },
    blueStart: P(1, 0),
    orangeStart: P(3, 0),
    blueExit: P(1, 4),
    orangeExit: P(3, 2),
    walls: [P(3, 3)],
    expectPar: 4
  }
];

// ---- demo 候选关卡（第三批） ----
const CANDIDATES = [
  {
    // 对穿走廊：唯一通路，必须利用“允许对穿交换”互相穿过
    id: 'demo-corridor-swap',
    grid: { width: 7, height: 3 },
    blueStart: P(2, 1),
    orangeStart: P(3, 1),
    blueExit: P(6, 1),
    orangeExit: P(0, 1),
    walls: [...wallRow(7, 0), ...wallRow(7, 2)]
  },
  {
    // 停车让行：橙先上行入右上角口袋（下方有墙保护），蓝再独自下行
    id: 'demo-corner-park',
    grid: { width: 5, height: 5 },
    blueStart: P(1, 2),
    orangeStart: P(3, 2),
    blueExit: P(0, 4),
    orangeExit: P(4, 0),
    walls: [P(2, 1), P(2, 2), P(2, 3), P(1, 1), P(4, 1)]
  },
  {
    // 绕行：中央墙墩挡住去路，需要错开再对穿
    id: 'demo-detour',
    grid: { width: 6, height: 5 },
    blueStart: P(1, 2),
    orangeStart: P(4, 2),
    blueExit: P(5, 2),
    orangeExit: P(0, 2),
    walls: [P(2, 2), P(3, 2)]
  },
  {
    // 不对称墙：打破镜像对称，需要借墙让一方停住
    id: 'demo-asym-wall',
    grid: { width: 5, height: 5 },
    blueStart: P(0, 2),
    orangeStart: P(2, 2),
    blueExit: P(4, 2),
    orangeExit: P(1, 0),
    walls: [P(1, 2), P(2, 0), P(3, 3)]
  },
  {
    // 压轴 v4-a：对称起点 + 不对称墙
    id: 'demo-capstone-v4a',
    grid: { width: 7, height: 6 },
    blueStart: P(0, 0),
    orangeStart: P(6, 0),
    blueExit: P(6, 5),
    orangeExit: P(0, 5),
    walls: [P(2, 1), P(5, 2), P(1, 3), P(3, 3), P(4, 4)]
  },
  {
    // 压轴 v4-b：不对称起点
    id: 'demo-capstone-v4b',
    grid: { width: 7, height: 6 },
    blueStart: P(0, 0),
    orangeStart: P(5, 0),
    blueExit: P(6, 5),
    orangeExit: P(0, 5),
    walls: [P(2, 1), P(4, 2), P(1, 3), P(5, 3), P(3, 4)]
  },
  {
    // 压轴 v4-c：不对称墙墩群
    id: 'demo-capstone-v4c',
    grid: { width: 7, height: 6 },
    blueStart: P(0, 0),
    orangeStart: P(6, 0),
    blueExit: P(6, 5),
    orangeExit: P(0, 5),
    walls: [P(1, 1), P(3, 1), P(5, 2), P(2, 3), P(4, 4), P(1, 4)]
  },
  {
    // 同侧目标：两出口都在右侧，必须让橙“逆着镜像”走
    id: 'demo-same-side',
    grid: { width: 6, height: 5 },
    blueStart: P(0, 2),
    orangeStart: P(1, 2),
    blueExit: P(5, 2),
    orangeExit: P(5, 4),
    walls: [P(3, 1), P(3, 2), P(2, 4), P(4, 0)]
  }
];

function report(level) {
  const r = solve(level);
  const line = (extra = '') =>
    console.log(
      `${level.id.padEnd(24)} ${r ? `可解 par=${r.moves.length} 回放=${replay(level, r.moves) ? '通过' : '失败'} 解=${r.moves.join(' ')}` : '不可解'}${extra}`
    );
  line();
  return r;
}

console.log('== 官方关卡引擎校验 ==');
for (const level of OFFICIAL) {
  const r = report(level);
  if (!r || r.moves.length !== level.expectPar) {
    console.log(`  !! ${level.id} par 与期望 ${level.expectPar} 不符，引擎移植可能有误`);
    process.exitCode = 1;
  }
}

console.log('\n== demo 候选关卡 ==');
for (const level of CANDIDATES) report(level);
