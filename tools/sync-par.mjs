import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bfsSolve } from '../tools-dist/solver.mjs';

const ROOT = process.cwd();
let changed = 0;
const rows = [];

for (let n = 1; n <= 50; n++) {
  const chapter = Math.floor((n - 1) / 10) + 1;
  const id = `level-${String(n).padStart(3, '0')}`;
  const path = resolve(
    ROOT,
    'levels',
    `chapter-${String(chapter).padStart(2, '0')}`,
    `${id}.json`
  );
  const level = JSON.parse(readFileSync(path, 'utf8'));
  const result = bfsSolve(level, { maxNodes: 500_000, maxDepth: 100 });
  if (!result.solvable || result.budgetExhausted) {
    throw new Error(`${id} 无法同步 par: ${result.reason ?? 'unknown'}`);
  }
  const before = level.parMoves;
  level.parMoves = result.optimalSteps;
  level.parMovesNote = `BFS 最短步数=${result.optimalSteps}；parMoves 与求解器严格一致`;
  if (before !== level.parMoves) changed++;
  rows.push({ id, before, after: level.parMoves, changed: before !== level.parMoves });
  writeFileSync(path, `${JSON.stringify(level, null, 2)}\n`, 'utf8');
}

console.log(`synced parMoves for 50 levels; corrected=${changed}`);
for (const row of rows.filter((row) => row.changed)) {
  console.log(`${row.id}: ${row.before} -> ${row.after}`);
}
