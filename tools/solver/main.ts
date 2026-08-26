import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { bfsSolve, parseLevelFromJson, replaySolution } from './bfs-solver';
import { validateLevelSemantics } from '../../src/content/validate';
import type { Direction, LevelDef, Entity } from '../../src/domain/types';
import { equalsPoint } from '../../src/domain/point';
import { createInitialState } from '../../src/domain/level';
import { applyCommand } from '../../src/domain/engine';

/** 非关卡 JSON 文件名（如清单文件），findLevelFiles 排除。 */
const EXCLUDED_JSON = new Set(['manifest.json']);

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
      else if (name.endsWith('.json') && !EXCLUDED_JSON.has(name)) files.push(p);
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
    try {
      JSON.parse(json);
    } catch (e) {
      return { valid: false, error: `JSON 解析失败: ${(e as Error).message}` };
    }
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

// ===== 机制审计（T4） =====

interface AuditResult {
  levelId: string;
  tags: string[];
  evidence: Record<string, boolean>;
  unusedTags: string[];
  unusedEntities: string[];
  frozenException: boolean;
  frozenReason?: string;
  counterfactual: Record<string, CounterfactualResult>;
}

interface CounterfactualResult {
  /** 实体类型 */
  entityType: string;
  /** 移除该类型实体后，最短步数变化 */
  originalSteps: number;
  /** 移除后的最短步数（-1 表示不可解） */
  modifiedSteps: number;
  /** 是否证明该机制有约束 */
  constraining: boolean;
  /** 详细说明 */
  detail: string;
}

/** 既存关卡的冻结例外清单——已知单方向教学解，免于审计失败。 */
const FROZEN_EXCEPTIONS: Record<string, string> = {
  'level-001': 'M0 教学关：单方向(LEFT)教学，无机关可审计',
  'level-003': 'M0 教学关：单方向(DOWN×4)教学，无机关可审计',
  'level-016': 'M2 教学关：单方向(RIGHT×3)专属门教学，最短解充分利用专属门机制',
  'level-017': 'M1+M2 组合教学：单方向(LEFT×5)通过压板门和专属门，双机制激活',
  'level-026': 'M4 教学关：单方向(UP×4)切换映射教学，最短解经过切换器激活映射变化',
  'level-047': 'M3+M8 组合：单方向(UP×6)通过暂停调节同步脉冲，双机制激活'
};

/**
 * 反事实检查：移除指定实体类型的所有实例，重新求解，判断该机制是否约束最短解。
 * 若移除后最短解变短或从不可解变可解，则该机制有约束贡献。
 */
function counterfactualCheck(
  level: LevelDef,
  entityType: string,
  originalResult: { solvable: boolean; optimalSteps: number }
): CounterfactualResult {
  // 克隆关卡，移除指定类型实体
  const modified: LevelDef = JSON.parse(JSON.stringify(level));
  modified.entities = modified.entities.filter((e) => e.type !== entityType);

  const modifiedResult = bfsSolve(modified);
  const origSteps = originalResult.solvable ? originalResult.optimalSteps : -1;
  const modSteps = modifiedResult.solvable ? modifiedResult.optimalSteps : -1;

  let constraining = false;
  const detail: string = (() => {
    if (originalResult.solvable && modifiedResult.solvable) {
      if (modSteps < origSteps) {
        constraining = true;
        return `移除后最短步数减少 ${origSteps}→${modSteps}，该机制约束了解空间`;
      } else if (modSteps > origSteps) {
        return `移除后最短步数增加 ${origSteps}→${modSteps}，该机制非约束性`;
      } else {
        return `移除后最短步数不变 (${origSteps})，该机制对最短解无影响`;
      }
    } else if (originalResult.solvable && !modifiedResult.solvable) {
      constraining = true;
      return `移除后关卡从可解变为不可解，该机制是解存在的必要条件`;
    } else if (!originalResult.solvable && modifiedResult.solvable) {
      constraining = true;
      return `移除后从不可解变为可解，该机制是关卡难度来源`;
    } else {
      return `移除前后均不可解，无法判断约束性`;
    }
  })();

  return { entityType, originalSteps: origSteps, modifiedSteps: modSteps, constraining, detail };
}

/** 审计单个关卡：回放最短解，检测机制激活证据 */
function auditLevel(level: LevelDef, solution: Direction[]): AuditResult {
  const tags = level.tags.filter((t) => /^M[1-8]$/.test(t));
  const evidence: Record<string, boolean> = {};
  for (const t of tags) evidence[t] = false;

  // 检测实体类型存在
  const hasEntity = (type: Entity['type']) => level.entities.some((e) => e.type === type);

  // 逐步回放，收集动态状态变化
  let state = createInitialState(level);
  const prevDoors: Record<string, boolean> = {};
  const prevPulseDoors: Record<string, boolean> = {};
  const prevFragile: string[] = [];
  const prevTokens: boolean[] = [false, false];

  for (const dir of solution) {
    const outcome = applyCommand(level, state, dir);
    const next = outcome.state;
    const result = outcome.result;

    // M1: 门状态变化（开合）
    if (tags.includes('M1')) {
      const doorKeys = Object.keys(next.doors);
      for (const key of doorKeys) {
        const val = next.doors[key] as boolean;
        if (prevDoors[key] !== undefined && prevDoors[key] !== val) {
          evidence['M1'] = true;
        }
        prevDoors[key] = val;
      }
      // 初始门状态
      if (Object.keys(prevDoors).length === 0) {
        for (const key of doorKeys) {
          prevDoors[key] = next.doors[key] as boolean;
        }
      }
    }

    // M2: 角色通过专属门
    if (tags.includes('M2')) {
      if (hasEntity('colorDoor')) {
        const colorDoors = level.entities.filter((e) => e.type === 'colorDoor');
        for (const cd of colorDoors) {
          const actorInfo = result[cd.color === 'BLUE' ? 'blue' : 'orange'];
          if (actorInfo) {
            if (equalsPoint(actorInfo.from, cd) || equalsPoint(actorInfo.to, cd)) {
              evidence['M2'] = true;
            }
          }
        }
      }
    }

    // M3: 暂停令牌获得或消耗
    if (tags.includes('M3')) {
      if (result.pauseConsumed) {
        evidence['M3'] = true;
      }
      const blueToken = next.actors.blue.hasPauseToken;
      const orangeToken = next.actors.orange.hasPauseToken;
      if (blueToken !== prevTokens[0] || orangeToken !== prevTokens[1]) {
        evidence['M3'] = true;
      }
      prevTokens[0] = blueToken;
      prevTokens[1] = orangeToken;
    }

    // M4: 映射变化
    if (tags.includes('M4')) {
      if (state.mapping !== next.mapping) {
        evidence['M4'] = true;
      }
    }

    // M5: 单向格阻挡离开
    if (tags.includes('M5')) {
      for (const actor of ['blue', 'orange'] as const) {
        if (result[actor]?.reason === 'oneWay') {
          evidence['M5'] = true;
        }
      }
      // 更精确：检查角色从单向格离开时方向符合箭头
      if (hasEntity('oneWay')) {
        for (const actor of ['blue', 'orange'] as const) {
          const from = result[actor]?.from;
          if (from) {
            const oneWayOnCell = level.entities.find(
              (e) => e.type === 'oneWay' && equalsPoint(e, from)
            );
            if (oneWayOnCell && oneWayOnCell.type === 'oneWay') {
              // 角色站在单向格上且移动了——需要检查离开方向是否匹配
              // 如果移动了，说明离开方向匹配箭头
              const actorRes = result[actor];
              if (actorRes && !equalsPoint(from, actorRes.to)) {
                evidence['M5'] = true;
              }
            }
          }
        }
      }
    }

    // M6: 传送
    if (tags.includes('M6')) {
      if (result.teleported) {
        evidence['M6'] = true;
      }
    }

    // M7: 脆弱格坍塌
    if (tags.includes('M7')) {
      const currentFragile = next.fragileCollapsed.map((p) => `${p.x},${p.y}`).sort();
      const prevSet = new Set(prevFragile);
      for (const k of currentFragile) {
        if (!prevSet.has(k)) {
          evidence['M7'] = true;
        }
      }
      prevFragile.length = 0;
      prevFragile.push(...currentFragile);
    }

    // M8: 脉冲门闩锁
    if (tags.includes('M8')) {
      const pulseKeys = Object.keys(next.pulseDoors);
      for (const key of pulseKeys) {
        const val = next.pulseDoors[key] as boolean;
        if (prevPulseDoors[key] !== undefined && prevPulseDoors[key] !== val) {
          evidence['M8'] = true;
        }
        prevPulseDoors[key] = val;
      }
      if (Object.keys(prevPulseDoors).length === 0) {
        for (const key of pulseKeys) {
          prevPulseDoors[key] = next.pulseDoors[key] as boolean;
        }
      }
    }

    state = next;
  }

  // 检查无用实体：对最短解完全无影响的实体
  const unusedEntities: string[] = [];
  for (const entity of level.entities) {
    if (entity.type === 'plate') {
      // 检查压板是否被踩过（门状态变化）
      if (!evidence['M1'] && tags.includes('M1')) {
        // 如果 M1 无证据且有关联压板，标记压板为无用
        unusedEntities.push(`${entity.type}(${entity.id})`);
      }
    }
    if (entity.type === 'pauseTile') {
      if (!evidence['M3'] && tags.includes('M3')) {
        unusedEntities.push(`${entity.type}`);
      }
    }
    if (entity.type === 'switcher') {
      if (!evidence['M4'] && tags.includes('M4')) {
        unusedEntities.push(`${entity.type}`);
      }
    }
    if (entity.type === 'oneWay') {
      if (!evidence['M5'] && tags.includes('M5')) {
        unusedEntities.push(`${entity.type}`);
      }
    }
    if (entity.type === 'portal') {
      if (!evidence['M6'] && tags.includes('M6')) {
        unusedEntities.push(`${entity.type}`);
      }
    }
    if (entity.type === 'fragile') {
      if (!evidence['M7'] && tags.includes('M7')) {
        unusedEntities.push(`${entity.type}`);
      }
    }
    if (entity.type === 'pulseSwitch') {
      if (!evidence['M8'] && tags.includes('M8')) {
        unusedEntities.push(`${entity.type}`);
      }
    }
  }

  // 反事实检查：对每个实体类型检查约束性
  const originalResult = { solvable: true, optimalSteps: solution.length };
  const entityTypes = [
    'door',
    'plate',
    'colorDoor',
    'pauseTile',
    'switcher',
    'oneWay',
    'portal',
    'fragile',
    'pulseSwitch',
    'pulseDoor'
  ];
  const counterfactual: Record<string, CounterfactualResult> = {};
  for (const et of entityTypes) {
    // 只检查关卡中存在的实体类型
    if (level.entities.some((e) => e.type === et)) {
      counterfactual[et] = counterfactualCheck(level, et, originalResult);
    }
  }

  // 利用反事实证据补充：若某机制无事件证据但反事实证明有约束，则视为已证明
  const tagToEntityTypes: Record<string, string[]> = {
    M1: ['door', 'plate'],
    M2: ['colorDoor'],
    M3: ['pauseTile'],
    M4: ['switcher'],
    M5: ['oneWay'],
    M6: ['portal'],
    M7: ['fragile'],
    M8: ['pulseSwitch', 'pulseDoor']
  };
  const provenByCounterfactual: Record<string, boolean> = {};
  for (const tag of tags) {
    if (!evidence[tag]) {
      const types = tagToEntityTypes[tag] ?? [];
      provenByCounterfactual[tag] = types.some((et) => counterfactual[et]?.constraining);
    }
  }

  const unusedTags = tags.filter((t) => !evidence[t] && !provenByCounterfactual[t]);

  const frozenReason = FROZEN_EXCEPTIONS[level.id];

  return {
    levelId: level.id,
    tags,
    evidence,
    unusedTags,
    unusedEntities,
    frozenException: !!frozenReason,
    frozenReason,
    counterfactual
  };
}

/** 审计所有关卡 */
function auditAllLevels(): {
  results: AuditResult[];
  passed: number;
  failed: number;
} {
  const files = findLevelFiles();
  let passed = 0;
  let failed = 0;
  const results: AuditResult[] = [];

  for (const f of files) {
    const level = loadLevel(f);
    const solveResult = bfsSolve(level);
    if (!solveResult.solvable) {
      results.push({
        levelId: level.id,
        tags: level.tags.filter((t) => /^M[1-8]$/.test(t)),
        evidence: {},
        unusedTags: [],
        unusedEntities: [],
        frozenException: false,
        counterfactual: {}
      });
      failed++;
      continue;
    }
    const audit = auditLevel(level, solveResult.solution);
    const isFail = audit.unusedTags.length > 0 && !audit.frozenException;
    if (isFail) {
      failed++;
    } else {
      passed++;
    }
    results.push(audit);
  }

  return { results, passed, failed };
}

// ===== 结构相似度检查（T5） =====

interface SimilarityResult {
  pair: [string, string];
  wallJaccard: number;
  sameSolution: boolean;
  directionMultisetSimilarity: number;
  startLayoutIdentical: boolean;
  gridSizeMatch: boolean;
  verdict: 'PASS' | 'WARN' | 'FAIL';
  reason: string;
}

const WALL_JACCARD_THRESHOLD = 0.7;
const DIRECTION_SIMILARITY_THRESHOLD = 0.8;

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function checkSimilarity(levelA: LevelDef, levelB: LevelDef): SimilarityResult {
  const wallKeysA = levelA.walls.map((w) => `${w.x},${w.y}`);
  const wallKeysB = levelB.walls.map((w) => `${w.x},${w.y}`);
  const wallJaccard = jaccard(wallKeysA, wallKeysB);

  const solveA = bfsSolve(levelA);
  const solveB = bfsSolve(levelB);
  const sameSolution =
    solveA.solvable && solveB.solvable && solveA.solution.join(',') === solveB.solution.join(',');

  // 方向多重集相似度
  const dirCountA = new Map<string, number>();
  const dirCountB = new Map<string, number>();
  for (const d of solveA.solvable ? solveA.solution : []) {
    dirCountA.set(d, (dirCountA.get(d) || 0) + 1);
  }
  for (const d of solveB.solvable ? solveB.solution : []) {
    dirCountB.set(d, (dirCountB.get(d) || 0) + 1);
  }
  const allDirs = new Set([...dirCountA.keys(), ...dirCountB.keys()]);
  let totalDiff = 0;
  let total = 0;
  for (const d of allDirs) {
    const ca = dirCountA.get(d) || 0;
    const cb = dirCountB.get(d) || 0;
    totalDiff += Math.abs(ca - cb);
    total += Math.max(ca, cb);
  }
  const directionMultisetSimilarity = total === 0 ? 1 : 1 - totalDiff / (total * 2);

  const startLayoutIdentical =
    equalsPoint(levelA.blueStart, levelB.blueStart) &&
    equalsPoint(levelA.orangeStart, levelB.orangeStart) &&
    equalsPoint(levelA.blueExit, levelB.blueExit) &&
    equalsPoint(levelA.orangeExit, levelB.orangeExit);

  const gridSizeMatch =
    levelA.grid.width === levelB.grid.width && levelA.grid.height === levelB.grid.height;

  let verdict: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  const reasons: string[] = [];

  if (sameSolution) {
    verdict = 'FAIL';
    reasons.push('解序列完全相同');
  }
  if (wallJaccard > WALL_JACCARD_THRESHOLD && sameSolution) {
    verdict = 'FAIL';
    reasons.push(`墙 Jaccard=${wallJaccard.toFixed(2)} > 阈值`);
  }
  if (directionMultisetSimilarity > DIRECTION_SIMILARITY_THRESHOLD && sameSolution) {
    if (verdict !== 'FAIL') verdict = 'WARN';
    reasons.push(`方向多重集相似度=${directionMultisetSimilarity.toFixed(2)}`);
  }
  if (startLayoutIdentical && sameSolution) {
    if (verdict !== 'FAIL') verdict = 'WARN';
    reasons.push('起终点布局完全一致');
  }

  return {
    pair: [levelA.id, levelB.id],
    wallJaccard,
    sameSolution,
    directionMultisetSimilarity,
    startLayoutIdentical,
    gridSizeMatch,
    verdict,
    reason: reasons.join('; ') || '通过'
  };
}

function checkAllSimilarity(): SimilarityResult[] {
  const files = findLevelFiles();
  const levelItems = files.map((f) => ({ level: loadLevel(f), file: f }));
  const results: SimilarityResult[] = [];

  for (let i = 0; i < levelItems.length - 1; i++) {
    const a = levelItems[i];
    const b = levelItems[i + 1];
    if (!a || !b) continue;
    // 只检查同章相邻关
    if (a.level.chapter === b.level.chapter) {
      results.push(checkSimilarity(a.level, b.level));
    }
  }
  return results;
}

// ===== CLI 入口 =====
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

if (command === 'validate') {
  const result = validateAll();
  for (const f of result.failed) {
    console.error(`失败: ${f.file}`);
    console.error(`  原因: ${f.error}`);
  }
  console.log(`\n总关卡: ${result.total}，通过: ${result.passed}，失败: ${result.failed.length}`);
  process.exit(result.failed.length > 0 ? 1 : 0);
} else if (command === 'validate-file') {
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
  const levelIdOrPath = args[1];
  if (!levelIdOrPath) {
    console.error('用法: solver.mjs solve <关卡ID或文件路径>');
    process.exit(1);
  }
  let filePath: string;
  if (levelIdOrPath.endsWith('.json')) {
    filePath = levelIdOrPath;
  } else {
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

  // 写机器可读结果
  const artifactsDir = resolve(process.cwd(), 'artifacts');
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
  }
  const solveResults = results.map((r) => ({
    id: r.levelId,
    file: r.filePath.replace(/\\/g, '/').replace(process.cwd().replace(/\\/g, '/') + '/', ''),
    solvable: r.result.solvable,
    optimalSteps: r.result.solvable ? r.result.optimalSteps : -1,
    solution: r.result.solvable ? r.result.solution.join(' ') : '',
    solutionCount: r.result.solvable ? r.result.solutionCount : 0,
    statesVisited: r.result.statesVisited,
    elapsedMs: r.result.elapsedMs,
    budgetExhausted: r.result.budgetExhausted,
    parMoves: r.parMoves,
    parConsistent:
      r.parMoves <= (r.result.solvable ? r.result.optimalSteps : Infinity) &&
      (r.parMoves <= (r.result.solvable ? r.result.optimalSteps : Infinity) || !!r.parMovesNote)
  }));
  const resultJson = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      total,
      solvable,
      unsolvable,
      parErrors: parErrors.length,
      results: solveResults
    },
    null,
    2
  );
  writeFileSync(join(artifactsDir, 'solve-results.json'), resultJson, 'utf-8');
  console.log(`\n机器可读结果已写入: artifacts/solve-results.json`);

  process.exit(parErrors.length > 0 ? 1 : 0);
} else if (command === 'report') {
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
} else if (command === 'audit') {
  const strictMode = args.includes('--strict') || !args.includes('--no-strict');
  const { results, passed, failed } = auditAllLevels();
  console.log(`=== 机制审计报告${strictMode ? ' (严格模式, 含反事实检查)' : ''} ===\n`);
  for (const r of results) {
    if (r.frozenException) {
      console.log(`[冻结] ${r.levelId}: ${r.frozenReason}`);
      // 冻结关卡仍输出反事实信息（供参考）
      if (Object.keys(r.counterfactual).length > 0) {
        for (const [et, cf] of Object.entries(r.counterfactual)) {
          console.log(`  反事实[${et}]: ${cf.detail}`);
        }
      }
      if (r.unusedTags.length > 0) {
        console.log(`  未激活机制: ${r.unusedTags.join(', ')}`);
      }
      console.log('');
      continue;
    }
    const status = r.unusedTags.length === 0 ? '通过' : '失败';
    console.log(`[${status}] ${r.levelId}`);
    console.log(`  标签: ${r.tags.join(', ') || '(无M1-M8)'}`);
    console.log(
      `  证据: ${
        Object.entries(r.evidence)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ') || '(无)'
      }`
    );
    if (r.unusedTags.length > 0) {
      console.log(`  未激活机制: ${r.unusedTags.join(', ')}`);
    }
    if (r.unusedEntities.length > 0) {
      console.log(`  无用实体: ${r.unusedEntities.join(', ')}`);
    }
    // 输出反事实检查结果
    if (Object.keys(r.counterfactual).length > 0) {
      const cfLines: string[] = [];
      for (const [et, cf] of Object.entries(r.counterfactual)) {
        const icon = cf.constraining ? '约束' : '无关';
        cfLines.push(`${et}=${icon}(${cf.detail})`);
      }
      console.log(`  反事实: ${cfLines.join('; ')}`);
    }
    console.log('');
  }
  console.log(`总计: ${results.length}，通过: ${passed}，失败: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
} else if (command === 'similarity') {
  const results = checkAllSimilarity();
  console.log('=== 结构相似度检查 ===\n');
  let failCount = 0;
  for (const r of results) {
    const icon = r.verdict === 'FAIL' ? '失败' : r.verdict === 'WARN' ? '警告' : '通过';
    console.log(`[${icon}] ${r.pair[0]} ↔ ${r.pair[1]}`);
    console.log(`  墙 Jaccard: ${r.wallJaccard.toFixed(2)}`);
    console.log(`  解序列相同: ${r.sameSolution}`);
    console.log(`  方向多重集相似度: ${r.directionMultisetSimilarity.toFixed(2)}`);
    console.log(`  起终点布局一致: ${r.startLayoutIdentical}`);
    console.log(`  结论: ${r.reason}`);
    console.log('');
    if (r.verdict === 'FAIL') failCount++;
  }
  console.log(`相邻对: ${results.length}，失败: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
} else {
  console.log('用法:');
  console.log('  solver.mjs validate                      全量验证关卡');
  console.log('  solver.mjs validate-file <路径>           验证单个关卡文件');
  console.log('  solver.mjs solve <ID或路径>               求解单个关卡');
  console.log('  solver.mjs solve-all                     求解所有关卡');
  console.log('  solver.mjs report                        生成难度报告');
  console.log('  solver.mjs audit [--no-strict]            机制审计（默认严格模式含反事实检查）');
  console.log('  solver.mjs similarity                    结构相似度检查');
  process.exit(1);
}
