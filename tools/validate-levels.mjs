#!/usr/bin/env node
// 关卡校验 CLI：调用 Vite 构建的 solver bundle 执行全量验证。
// 构建由 package.json 的 build:tools 脚本在 validate:levels 前置执行。
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundlePath = resolve(__dirname, '..', 'tools-dist', 'solver.mjs');

// 尝试直接调用 bundle（如果存在）
const { existsSync } = await import('node:fs');
if (existsSync(bundlePath)) {
  const r = spawnSync('node', [bundlePath, 'validate'], { stdio: 'inherit', shell: true });
  process.exit(r.status ?? 1);
} else {
  console.error('未找到工具链构建产物。请先运行: npm run build:tools');
  process.exit(1);
}
