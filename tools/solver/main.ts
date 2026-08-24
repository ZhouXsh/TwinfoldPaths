import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { bfsSolve, parseLevelFromJson, replaySolution } from './bfs-solver';
import { validateLevelSemantics } from '../../src/content/validate';
import type { Direction, LevelDef } from '../../src/domain/types';

function loadLevel(filePath: string): LevelDef {
  const json = readFileSync(filePath, 'utf-8');
  return parseLevelFromJson(json);
}

function findLevelFiles(): string[] {
  const dir = resolve(process.cwd(), 'levels');
  const files: string[] = [];
  function walk(d: string) {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.json')) files.push(p);
    }
  }
  walk(dir);
  return files.sort();
}

function formatDirection(dirs: Direction[]): string {
  return dirs.join(' ');
}

function formatResult(
  levelId: string,
  result: ReturnType<typeof bfsSolve>,
  filePath: string
): string {
  const lines: string[] = [];
  lines.push(`关卡: ${levelId}`);
  lines.push(`文件: ${filePath}`);
  lines.push(`可解: ${result.solvable}`);
  if (result.solvable) {
    lines.push(`最短步数: ${result.optimalSteps}`);
    lines.push(`解序列: ${formatDirection(result.solution)}`);
    lines.push(`最短解数量: ${result.solutionCount}`);
    lines.push(`访问状态数: ${result.statesVisited}`);
  } else {
    lines.push(`原因: ${result.reason ?? '未知'}`);
    lines.push(`访问状态数: ${result.statesVisited}`);
    lines.push(`到达深度: ${result.reachedDepth}`);
  }
  lines.push(`耗时: ${result.elapsedMs}ms`);
  return lines.join('\n');
}

/**
 * 验证一个关卡文件
 */
function validateFile(filePath: string): { valid: boolean; error?: string } {
  try {
    const json = readFileSync(filePath, 'utf-8');
    // 先检查 JSON 语法
    try {
      JSON.parse(json);
    } catch (e) {
      return { valid: false, error: `JSON 解析失败: ${(e as Error).message}` };
    }
    // 用 parseLevel 做结构与语义校验
    const level = parseLevelFromJson(json);
    const semanticErrors = validateLevelSemantics(level);
    if (semanticErrors.length > 0) {
      const details = semanticErrors.map((e) => `${e.path}: ${e.message}`).join('; ');
      return { valid: false, error: `语义校验失败: ${details}` };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}

/**
 * 验证所有关卡
 */
function validateAll(): {
  total: number;
  passed: number;
  failed: { file: string; error: string }[];
} {
  const files = findLevelFiles();
  const failed: { file: string; error: string }[] = [];
  let passed = 0;
  for (const f of files) {
    const result = validateFile(f);
    if (result.valid) {
      passed++;
    } else {
      failed.push({ file: f, error: result.error ?? '未知错误' });
    }
  }
  return { total: files.length, passed, failed };
}

/**
 * 求解单个关卡
 */
function solveLevel(levelPath: string): {
  levelId: string;
  result: ReturnType<typeof bfsSolve>;
  filePath: string;
} {
  const level = loadLevel(levelPath);
  const result = bfsSolve(level);
  // 回放校验
  if (result.solvable) {
    const replayOk = replaySolution(level, result.solution);
    if (!replayOk) {
      throw new Error(`回放失败: ${level.id} 解序列不能到达胜利状态`);
    }
  }
  return { levelId: level.id, result, filePath: levelPath };
}

/**
 * 求解所有关卡，含 parMoves 一致性检查
 */
function solveAllLevels(): {
  results: {
    levelId: string;
    result: ReturnType<typeof bfsSolve>;
    filePath: string;
    parMoves: number;
    parMovesNote?: string;
    chapter: number;
  }[];
  parErrors: { levelId: string; message: string }[];
  total: number;
  solvable: number;
  unsolvable: number;
} {
  const files = findLevelFiles();
  const results: {
    levelId: string;
    result: ReturnType<typeof bfsSolve>;
    filePath: string;
    parMoves: number;
    parMovesNote?: string;
    chapter: number;
  }[] = [];
  const parErrors: { levelId: string; message: string }[] = [];

  for (const f of files) {
    try {
      const level = loadLevel(f);
      const result = bfsSolve(level);
      if (result.solvable) {
        const replayOk = replaySolution(level, result.solution);
        if (!replayOk) {
          parErrors.push({ levelId: level.id, message: `回放失败: 解序列不能到达胜利状态` });
        }
        // parMoves 一致性检查（ADR-003）
        if (level.parMoves < result.optimalSteps) {
          parErrors.push({
            levelId: level.id,
            message: `parMoves (${level.parMoves}) < 最短步数 (${result.optimalSteps})：par 不可达`
          });
        }
        if (level.parMoves > result.optimalSteps && !level.parMovesNote) {
          parErrors.push({
            levelId: level.id,
            message: `parMoves (${level.parMoves}) > 最短步数 (${result.optimalSteps}) 但缺少 parMovesNote`
          });
        }
      }
      results.push({
        levelId: level.id,
        result,
        filePath: f,
        parMoves: level.parMoves,
        parMovesNote: level.parMovesNote,
        chapter: level.chapter
      });
    } catch (e) {
      parErrors.push({
        levelId: f,
        message: `加载/求解失败: ${(e as Error).message}`
      });
    }
  }

  const solvable = results.filter((r) => r.result.solvable).length;
  const unsolvable = results.filter((r) => !r.result.solvable).length;
  return { results, parErrors, total: files.length, solvable, unsolvable };
}

/**
 * 难度报告
 */
function generateDifficultyReport(): string {
  const { results, parErrors, total, solvable, unsolvable } = solveAllLevels();
  const chapters = new Map<number, typeof results>();

  for (const r of results) {
    const chapter = r.chapter;
    const list = chapters.get(chapter);
    if (list) {
      list.push(r);
    } else {
      chapters.set(chapter, [r]);
    }
  }

  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push('《双生折线》关卡难度报告');
  lines.push(`生成时间: ${new Date().toISOString()}`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`总关卡数: ${total}`);
  lines.push(`可解: ${solvable}`);
  lines.push(`不可解: ${unsolvable}`);
  lines.push(`par 一致性错误: ${parErrors.length}`);
  lines.push('');

  for (const [chapter, chResults] of [...chapters.entries()].sort(([a], [b]) => a - b)) {
    lines.push(`--- 第 ${chapter} 章 ---`);
    for (const r of chResults.sort((a, b) => a.levelId.localeCompare(b.levelId))) {
      const status = r.result.solvable
        ? `可解 par=${r.result.optimalSteps} (目标=${r.parMoves}) 解数=${r.result.solutionCount} 状态数=${r.result.statesVisited} 耗时=${r.result.elapsedMs}ms`
        : `不可解 (${r.result.reason ?? '未知'}) 状态数=${r.result.statesVisited}`;
      lines.push(`  ${r.levelId}: ${status}`);
    }
    lines.push('');
  }

  if (parErrors.length > 0) {
    lines.push('--- par 一致性错误 ---');
    for (const err of parErrors) {
      lines.push(`  ${err.levelId}: ${err.message}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));
  return lines.join('\n');
}

// ===== CLI 入口 =====
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

if (command === 'validate') {
  // 全量验证
  const result = validateAll();
  for (const f of result.failed) {
    console.error(`失败: ${f.file}`);
    console.error(`  原因: ${f.error}`);
  }
  console.log(`\n总关卡: ${result.total}，通过: ${result.passed}，失败: ${result.failed.length}`);
  process.exit(result.failed.length > 0 ? 1 : 0);
} else if (command === 'validate-file') {
  // 验证单个文件
  const filePath = args[1];
  if (!filePath) {
    console.error('用法: solver.mjs validate-file <文件路径>');
    process.exit(1);
  }
  const result = validateFile(filePath);
  if (result.valid) {
    console.log(`通过: ${filePath}`);
    process.exit(0);
  } else {
    console.error(`失败: ${filePath}`);
    console.error(`  原因: ${result.error}`);
    process.exit(1);
  }
} else if (command === 'solve') {
  // 求解单个关卡
  const levelIdOrPath = args[1];
  if (!levelIdOrPath) {
    console.error('用法: solver.mjs solve <关卡ID或文件路径>');
    process.exit(1);
  }
  let filePath: string;
  if (levelIdOrPath.endsWith('.json')) {
    filePath = levelIdOrPath;
  } else {
    // 按 ID 查找
    const files = findLevelFiles();
    const found = files.find(
      (f) => f.includes(`/${levelIdOrPath}.json`) || f.includes(`\\${levelIdOrPath}.json`)
    );
    if (!found) {
      console.error(`未找到关卡: ${levelIdOrPath}`);
      process.exit(1);
    }
    filePath = found;
  }
  try {
    const { levelId, result } = solveLevel(filePath);
    console.log(formatResult(levelId, result, filePath));
    process.exit(0);
  } catch (e) {
    console.error(`求解失败: ${(e as Error).message}`);
    process.exit(1);
  }
} else if (command === 'solve-all') {
  // 求解所有关卡
  const { results, parErrors, total, solvable, unsolvable } = solveAllLevels();
  for (const r of results) {
    console.log(formatResult(r.levelId, r.result, r.filePath));
    console.log('');
  }
  console.log(`总关卡: ${total}，可解: ${solvable}，不可解: ${unsolvable}`);
  if (parErrors.length > 0) {
    console.error('\npar 一致性错误:');
    for (const err of parErrors) {
      console.error(`  ${err.levelId}: ${err.message}`);
    }
  }
  process.exit(parErrors.length > 0 ? 1 : 0);
} else if (command === 'report') {
  // 难度报告
  const report = generateDifficultyReport();
  const artifactsDir = resolve(process.cwd(), 'artifacts');
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
  }
  const reportPath = join(artifactsDir, 'difficulty-report.txt');
  writeFileSync(reportPath, report, 'utf-8');
  console.log(report);
  console.log(`\n报告已写入: ${reportPath}`);
  process.exit(0);
} else {
  console.log('用法:');
  console.log('  solver.mjs validate                      全量验证关卡');
  console.log('  solver.mjs validate-file <路径>           验证单个关卡文件');
  console.log('  solver.mjs solve <ID或路径>               求解单个关卡');
  console.log('  solver.mjs solve-all                     求解所有关卡');
  console.log('  solver.mjs report                        生成难度报告');
  process.exit(1);
}
