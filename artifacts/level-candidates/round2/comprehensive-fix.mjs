#!/usr/bin/env node
// Comprehensive fix of all level issues
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const LEVELS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../levels');
const SOLVER = resolve(dirname(fileURLToPath(import.meta.url)), '../../../tools-dist/solver.mjs');

// Fix level-040: remove plate-wall overlap
const l040 = JSON.parse(readFileSync(resolve(LEVELS_DIR, 'chapter-04/level-040.json'), 'utf-8'));
l040.walls = l040.walls.filter(w => !(w.x === 3 && w.y === 4) && !(w.x === 4 && w.y === 2));
writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-040.json'), JSON.stringify(l040, null, 2));
console.log('level-040: Fixed wall overlap');

// Run solve-all to get BFS results
console.log('\nSolving all levels...');
const out = execSync(`node "${SOLVER}" solve-all`, { encoding: 'utf-8' });

// Parse BFS results to fix parMoves
const parFixes = {};
const lines = out.split('\n');
let currentId = '';
for (const line of lines) {
  const idMatch = line.match(/关卡: (level-\d+)/);
  const stepsMatch = line.match(/最短步数: (\d+)/);
  if (idMatch) currentId = idMatch[1];
  if (stepsMatch && currentId) {
    parFixes[currentId] = parseInt(stepsMatch[1]);
  }
}

// Apply parMoves fixes
for (const [id, steps] of Object.entries(parFixes)) {
  const ch = parseInt(id.split('-')[1]) <= 10 ? 'chapter-01'
    : parseInt(id.split('-')[1]) <= 20 ? 'chapter-02'
    : parseInt(id.split('-')[1]) <= 30 ? 'chapter-03'
    : parseInt(id.split('-')[1]) <= 40 ? 'chapter-04'
    : 'chapter-05';
  const fp = resolve(LEVELS_DIR, ch, `${id}.json`);
  const data = JSON.parse(readFileSync(fp, 'utf-8'));
  if (data.parMoves !== steps) {
    data.parMoves = steps;
    data.parMovesNote = `BFS 求解器验证最短步数=${steps}`;
    writeFileSync(fp, JSON.stringify(data, null, 2));
    console.log(`${id}: parMoves ${data.parMoves} -> ${steps}`);
  }
}

console.log('\nAll fixes applied. Now run validate and audit.');