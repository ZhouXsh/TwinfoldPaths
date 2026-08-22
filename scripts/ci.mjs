#!/usr/bin/env node
// 本地 CI：与未来平台 CI 保持一致的完整流水线 = check 全部门禁 + Playwright E2E。
import { CHECK_STEPS, runSteps } from './check.mjs';

const steps = [...CHECK_STEPS, ['npm', ['run', 'test:e2e']]];
process.exit(runSteps(steps));
