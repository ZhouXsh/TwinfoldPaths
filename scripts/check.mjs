#!/usr/bin/env node
// 聚合质量门禁：顺序执行格式、lint、类型、单测、关卡校验/求解、构建、产物校验与文档/依赖边界检查。
// 任一步失败即终止并返回非零退出码。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const CHECK_STEPS = [
  ['npm', ['run', 'format:check']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'typecheck']],
  ['npm', ['run', 'test']],
  ['npm', ['run', 'validate:levels']],
  ['npm', ['run', 'solve:levels']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'verify:dist']],
  ['node', ['scripts/check-deps.mjs']],
  ['node', ['scripts/check-stage01.mjs']]
];

export function runSteps(steps) {
  for (const [cmd, args] of steps) {
    console.log(`\n=== ${cmd} ${args.join(' ')} ===`);
    const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
    if (r.status !== 0) {
      console.error(`FAILED: ${cmd} ${args.join(' ')} (exit ${r.status})`);
      return r.status ?? 1;
    }
  }
  console.log('\nALL STEPS PASSED');
  return 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  process.exit(runSteps(CHECK_STEPS));
}
