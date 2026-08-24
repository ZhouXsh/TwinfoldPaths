#!/usr/bin/env node
// 关卡求解 CLI：调用 Vite 构建的 solver bundle 执行求解。
// 构建由 package.json 的 solve:level/solve:levels 脚本前置执行。
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundlePath = resolve(__dirname, '..', 'tools-dist', 'solver.mjs');

const { existsSync } = await import('node:fs');
if (!existsSync(bundlePath)) {
  console.error('未找到工具链构建产物。请先运行: npm run build:tools');
  process.exit(1);
}

// 获取除命令本身外的所有参数
const args = process.argv.slice(2);
const r = spawnSync('node', [bundlePath, ...args], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
