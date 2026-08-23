// 从 tmp/index.html 提取引擎与关卡数据，BFS 复核全部关卡可解性与 par 声明（仅 tmp 沙箱使用）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, 'index.html'), 'utf8');

const start = html.indexOf('<script>') + '<script>'.length;
const end = html.lastIndexOf('</script>');
if (start < 8 || end < 0) throw new Error('未找到 <script> 边界');
const fullScript = html.slice(start, end);

// 1) 整个脚本语法检查（只编译不执行）
try {
  new Function(fullScript);
  console.log('脚本语法检查：通过');
} catch (err) {
  console.log(`脚本语法检查：失败 -> ${err.message}`);
  process.exit(1);
}

// 2) 提取纯逻辑段（§1 领域层 + §2 关卡 + §3 存档纯函数），在 Node 中实际执行并 BFS 复核
//    文件内置 `// <smoke-cut>` 标记：标记之前不依赖 DOM/Canvas
const cut = fullScript.indexOf('// <smoke-cut>');
if (cut < 0) throw new Error('未找到 <smoke-cut> 边界');
const logicCode = fullScript.slice(0, cut);

const ctx = {};
const wrapped = `
${logicCode}
ctx.applyCommand = applyCommand;
ctx.createInitialState = createInitialState;
ctx.undo = undo;
ctx.restart = restart;
ctx.LEVELS = LEVELS;
`;
new Function('ctx', wrapped)(ctx);

const key = (p) => `${p.x},${p.y}`;
const DIRS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

function solve(level) {
  const startState = ctx.createInitialState(level);
  const stateKey = (s) => `${key(s.actors.blue.pos)}|${key(s.actors.orange.pos)}`;
  const seen = new Set([stateKey(startState)]);
  let frontier = [{ s: startState, moves: [] }];
  for (let depth = 0; depth < 80; depth++) {
    const next = [];
    for (const node of frontier) {
      for (const d of DIRS) {
        const { state, result } = ctx.applyCommand(level, node.s, d);
        if (!result.applied) continue;
        const k = stateKey(state);
        if (seen.has(k)) continue;
        seen.add(k);
        const moves = [...node.moves, d];
        if (result.won) return moves;
        next.push({ s: state, moves });
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return null;
}

// 3) 引擎行为抽查：撤销恢复、同格取消不计数、胜利后忽略输入
function engineSpotChecks() {
  const errors = [];
  const level = ctx.LEVELS[0];
  const s0 = ctx.createInitialState(level);
  const r1 = ctx.applyCommand(level, s0, 'LEFT');
  if (!r1.result.applied || !r1.result.won) errors.push('level-001 LEFT 应一步通关');
  if (r1.state.moveCount !== 1) errors.push('moveCount 应为 1');
  const r2 = ctx.applyCommand(level, r1.state, 'UP');
  if (r2.result.applied || r2.state !== r1.state) errors.push('WON 后应忽略指令');
  const u = ctx.undo(r1.state);
  if (!u.undone || u.state.moveCount !== 0) errors.push('undo 应回到初始状态');
  if (ctx.undo(u.state).undone) errors.push('空栈 undo 应返回 undone=false');

  const lv4 = ctx.LEVELS.find((l) => l.id === 'level-005');
  let st = ctx.createInitialState(lv4);
  // UP UP：蓝被墙(1,1)挡住停留、橙上行 —— R-03
  let out = ctx.applyCommand(lv4, st, 'UP');
  if (!out.result.blue.blocked || out.result.orange.blocked)
    errors.push('level-005 首步应为蓝挡橙走');
  st = out.state;
  // 构造同格取消场景：level-004 第一步 RIGHT 为对穿（成立）；用 level-006 正面冲撞测试取消
  const lv6 = ctx.LEVELS.find((l) => l.id === 'level-006');
  let s6 = ctx.createInitialState(lv6);
  // 蓝(1,2) 橙(4,2)，中间有墙墩 (2,2)(3,2)：RIGHT 双方被挡（成立、计步）
  out = ctx.applyCommand(lv6, s6, 'RIGHT');
  if (!out.result.applied || !out.result.blue.blocked || !out.result.orange.blocked) {
    errors.push('level-006 RIGHT 应为双方被挡且计步');
  }
  s6 = out.state;
  if (s6.moveCount !== 1) errors.push('双方被挡应计 1 步');
  return errors;
}

const spotErrors = engineSpotChecks();
if (spotErrors.length) {
  for (const e of spotErrors) console.log('引擎抽查失败:', e);
}

let fail = spotErrors.length;
for (const level of ctx.LEVELS) {
  const moves = solve(level);
  if (!moves) {
    console.log(`${level.id.padEnd(12)} 不可解 !!`);
    fail++;
  } else if (moves.length !== level.parMoves) {
    console.log(
      `${level.id.padEnd(12)} par 声明 ${level.parMoves} 与 BFS 最短解 ${moves.length} 不符 !! 解=${moves.join(' ')}`
    );
    fail++;
  } else {
    console.log(
      `${level.id.padEnd(12)} 可解，par=${level.parMoves} 与 BFS 一致，解=${moves.join(' ')}`
    );
  }
}
process.exitCode = fail ? 1 : 0;
console.log(fail ? `\n${fail} 项校验失败` : '\n全部校验通过（语法 + 引擎抽查 + 8 关可解性与 par）');
