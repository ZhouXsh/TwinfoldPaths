#!/usr/bin/env node
// Fix parMoves to match BFS shortest steps for all 50 levels
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bfsSolve, parseLevelFromJson } from '../../tools/solver/bfs-solver';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'levels');

const chapters = ['chapter-01', 'chapter-02', 'chapter-03', 'chapter-04', 'chapter-05'];

for (const ch of chapters) {
  for (let i = 1; i <= 50; i++) {
    const id = i < 10 ? `level-00${i}` : `level-0${i}`;
    const filePath = resolve(DIR, ch, `${id}.json`);
    try {
      const json = readFileSync(filePath, 'utf-8');
      const level = parseLevelFromJson(json);
      const result = bfsSolve(level);
      if (result.solvable && result.optimalSteps !== level.parMoves) {
        const data = JSON.parse(json);
        data.parMoves = result.optimalSteps;
        data.parMovesNote = `BFS 求解器验证最短步数=${result.optimalSteps}`;
        writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Fixed ${id}: parMoves ${level.parMoves} -> ${result.optimalSteps}`);
      }
    } catch (e) {
      // File may not exist for this chapter
    }
  }
}
console.log('Done.');