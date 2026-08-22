#!/usr/bin/env node
// 关卡校验（阶段 04 桩）：扫描 levels/ 下全部 JSON 并做解析校验。
// 完整 Schema + 语义校验器在阶段 09 实现（ADR-012），届时本文件替换为真实校验器入口。
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.cwd(), 'levels');
const files = [];

function walk(d) {
  if (!existsSync(d)) return;
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.json')) files.push(p);
  }
}
walk(dir);

let failed = 0;
for (const f of files) {
  try {
    JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    failed++;
    console.error(`JSON 解析失败: ${f}: ${e.message}`);
  }
}

console.log(`关卡文件: ${files.length} 个；解析失败: ${failed} 个`);
console.log('注：完整 Schema/语义校验在阶段 09 实现（ADR-012）。');
process.exit(failed > 0 ? 1 : 0);
