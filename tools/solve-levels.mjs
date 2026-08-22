#!/usr/bin/env node
// 关卡求解（阶段 04 桩）：无引擎可解时仅报告关卡数量。
// BFS 求解器在阶段 09 实现（ADR-013），届时本文件替换为真实求解入口。
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.cwd(), 'levels');
let count = 0;

function walk(d) {
  if (!existsSync(d)) return;
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.json')) count++;
  }
}
walk(dir);

console.log(`关卡文件: ${count} 个`);
console.log('注：BFS 求解与回放在阶段 09 实现（ADR-013）。');
