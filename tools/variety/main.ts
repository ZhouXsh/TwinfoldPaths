import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bfsSolve, parseLevelFromJson } from '../solver/bfs-solver';
import type { Direction, LevelDef } from '../../src/domain/types';

interface SolvedLevel {
  id: string;
  chapter: number;
  order: number;
  tags: string[];
  solution: Direction[];
  optimalSteps: number;
}

interface PairAudit {
  a: string;
  b: string;
  exact: boolean;
  editSimilarity: number;
  bigramSimilarity: number;
  risk: 'ok' | 'review' | 'fail';
}

function levenshtein<T>(a: readonly T[], b: readonly T[]): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = new Array<number>(b.length + 1);
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost
      );
    }
    for (let j = 0; j < curr.length; j++) prev[j] = curr[j] ?? 0;
  }
  return prev[b.length] ?? 0;
}

function editSimilarity(a: readonly Direction[], b: readonly Direction[]): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function ngrams(seq: readonly Direction[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i <= seq.length - n; i++) out.add(seq.slice(i, i + n).join('>'));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

function loadLevels(): LevelDef[] {
  const levels: LevelDef[] = [];
  for (let chapter = 1; chapter <= 5; chapter++) {
    const dir = resolve(process.cwd(), 'levels', `chapter-${String(chapter).padStart(2, '0')}`);
    for (const name of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      levels.push(parseLevelFromJson(readFileSync(resolve(dir, name), 'utf8')));
    }
  }
  return levels.sort((a, b) => a.chapter - b.chapter || a.order - b.order);
}

function solveAll(levels: LevelDef[]): SolvedLevel[] {
  return levels.map((level) => {
    const result = bfsSolve(level);
    if (!result.solvable) throw new Error(`${level.id} 无法求解: ${result.reason ?? 'unknown'}`);
    return {
      id: level.id,
      chapter: level.chapter,
      order: level.order,
      tags: level.tags,
      solution: result.solution,
      optimalSteps: result.optimalSteps
    };
  });
}

function auditAdjacent(levels: SolvedLevel[]): PairAudit[] {
  const rows: PairAudit[] = [];
  for (let i = 0; i < levels.length - 1; i++) {
    const a = levels[i]!;
    const b = levels[i + 1]!;
    if (a.chapter !== b.chapter) continue;
    const exact = a.solution.join(',') === b.solution.join(',');
    const edit = editSimilarity(a.solution, b.solution);
    const bigram = jaccard(ngrams(a.solution, 2), ngrams(b.solution, 2));
    const tutorialPair = a.tags.includes('tutorial') || b.tags.includes('tutorial');
    const risk: PairAudit['risk'] =
      !tutorialPair && exact ? 'fail' : edit > 0.85 && bigram > 0.8 ? 'review' : 'ok';
    rows.push({
      a: a.id,
      b: b.id,
      exact,
      editSimilarity: edit,
      bigramSimilarity: bigram,
      risk
    });
  }
  return rows;
}

function exactDuplicateGroups(levels: SolvedLevel[], includeChapter: boolean) {
  const groups = new Map<string, string[]>();
  for (const level of levels) {
    const solution = level.solution.join(',');
    const key = includeChapter ? `${level.chapter}|${solution}` : solution;
    const bucket = groups.get(key) ?? [];
    bucket.push(level.id);
    groups.set(key, bucket);
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({
      solution: (includeChapter ? key.split('|').slice(1).join('|') : key) || '(empty)',
      chapter: includeChapter ? Number(key.split('|')[0]) : undefined,
      ids
    }));
}

const solved = solveAll(loadLevels());
const pairs = auditAdjacent(solved);
const duplicateGroups = exactDuplicateGroups(solved, false);
const sameChapterDuplicateGroups = exactDuplicateGroups(solved, true);
const adjacentFailures = pairs.filter((x) => x.risk === 'fail').length;
const failCount = adjacentFailures + sameChapterDuplicateGroups.length;

const report = {
  generatedAt: new Date().toISOString(),
  levelCount: solved.length,
  failCount,
  adjacentFailureCount: adjacentFailures,
  sameChapterDuplicateCount: sameChapterDuplicateGroups.length,
  reviewCount: pairs.filter((x) => x.risk === 'review').length,
  duplicateGroups,
  sameChapterDuplicateGroups,
  levels: solved.map((x) => ({ ...x, solution: x.solution.join(' ') })),
  adjacentPairs: pairs
};

const outPath = resolve(process.cwd(), 'reports', 'solution-variety-report.json');
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`solution variety report: ${outPath}`);
console.log(
  `levels=${report.levelCount} fail=${report.failCount} sameChapterExact=${report.sameChapterDuplicateCount} review=${report.reviewCount}`
);
if (report.failCount > 0) process.exitCode = 2;
