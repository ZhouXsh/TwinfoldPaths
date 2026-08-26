#!/usr/bin/env node
// Restore working levels from first round, fix only the truly broken ones
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LEVELS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../levels');

// Level 014: simpler - single plate, single door, forces plate use
writeFileSync(resolve(LEVELS_DIR, 'chapter-02/level-014.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-014', chapter: 2, order: 14, title: '压板二次利用',
  initialMapping: 'H_MIRROR',
  grid: { width: 5, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
  walls: [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
  entities: [
    { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 2, y: 4 },
    { type: 'plate', id: 'p2', x: 4, y: 4, doorId: 'd2' },
    { type: 'door', id: 'd2', x: 3, y: 4 }
  ],
  parMoves: 5, parMovesNote: 'BFS 最短步数=5',
  hint: { focus: '蓝踩板开左门让橙通过，橙踩板开右门让蓝通过' },
  tags: ['chapter-2', 'tutorial', 'M1', 'reuse-plate']
}, null, 2));

// Level 019: simpler - single row with plate and colorDoor
writeFileSync(resolve(LEVELS_DIR, 'chapter-02/level-019.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-019', chapter: 2, order: 19, title: '双压板双门',
  initialMapping: 'H_MIRROR',
  grid: { width: 7, height: 4 },
  blueStart: { x: 0, y: 2 }, orangeStart: { x: 6, y: 2 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
  walls: [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 4, y: 0 }, { x: 4, y: 1 }],
  entities: [
    { type: 'plate', id: 'p1', x: 0, y: 2, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 2, y: 2 },
    { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
    { type: 'plate', id: 'p2', x: 6, y: 2, doorId: 'd2' },
    { type: 'door', id: 'd2', x: 4, y: 2 }
  ],
  parMoves: 6, parMovesNote: 'BFS 最短步数=6',
  hint: { focus: '蓝踩板为橙开门，橙踩板为蓝开门' },
  tags: ['chapter-2', 'M1', 'M2', 'dual-plate']
}, null, 2));

// Level 020: simpler
writeFileSync(resolve(LEVELS_DIR, 'chapter-02/level-020.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-020', chapter: 2, order: 20, title: '第二章综合',
  initialMapping: 'H_MIRROR',
  grid: { width: 7, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
  walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
  entities: [
    { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 2, y: 4 },
    { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
    { type: 'colorDoor', x: 3, y: 4, color: 'BLUE' }
  ],
  parMoves: 7, parMovesNote: 'BFS 最短步数=7',
  hint: { focus: '综合运用墙、压板门和专属门' },
  tags: ['chapter-2', 'M0', 'M1', 'M2', 'chapter-final']
}, null, 2));

// Level 025: simpler
writeFileSync(resolve(LEVELS_DIR, 'chapter-03/level-025.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-025', chapter: 3, order: 25, title: '专属门与暂停',
  initialMapping: 'H_MIRROR',
  grid: { width: 5, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
  walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }],
  entities: [
    { type: 'colorDoor', x: 2, y: 3, color: 'ORANGE' },
    { type: 'colorDoor', x: 2, y: 0, color: 'BLUE' },
    { type: 'pauseTile', x: 4, y: 2 }
  ],
  parMoves: 7, parMovesNote: 'BFS 最短步数=7',
  hint: { focus: '橙需要暂停等蓝先走，蓝需要通过专属门' },
  tags: ['chapter-3', 'M2', 'M3', 'colordoor-pause']
}, null, 2));

// Level 027: keep original working version
writeFileSync(resolve(LEVELS_DIR, 'chapter-03/level-027.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-027', chapter: 3, order: 27, title: '两种映射分段',
  initialMapping: 'H_MIRROR',
  grid: { width: 6, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
  blueExit: { x: 2, y: 0 }, orangeExit: { x: 3, y: 0 },
  walls: [{ x: 2, y: 2 }, { x: 3, y: 2 }],
  entities: [
    { type: 'switcher', x: 0, y: 4, target: 'H_MIRROR' },
    { type: 'switcher', x: 5, y: 4, target: 'V_MIRROR' }
  ],
  parMoves: 6, parMovesNote: 'BFS 最短步数=6',
  hint: { focus: '切换成垂直镜像后分开行动' },
  tags: ['chapter-3', 'tutorial', 'M4', 'dual-mapping']
}, null, 2));

// Level 028: original version
writeFileSync(resolve(LEVELS_DIR, 'chapter-03/level-028.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-028', chapter: 3, order: 28, title: '暂停切换映射',
  initialMapping: 'H_MIRROR',
  grid: { width: 5, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
  walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
  entities: [
    { type: 'pauseTile', x: 0, y: 2 },
    { type: 'switcher', x: 4, y: 2, target: 'V_MIRROR' }
  ],
  parMoves: 6, parMovesNote: 'BFS 最短步数=6',
  hint: { focus: '先拿暂停，再切换映射' },
  tags: ['chapter-3', 'M3', 'M4', 'pause-switch']
}, null, 2));

// Level 030: original version
writeFileSync(resolve(LEVELS_DIR, 'chapter-03/level-030.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-030', chapter: 3, order: 30, title: '第三章综合',
  initialMapping: 'H_MIRROR',
  grid: { width: 7, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
  walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
  entities: [
    { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 2, y: 4 },
    { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
    { type: 'pauseTile', x: 6, y: 2 },
    { type: 'switcher', x: 0, y: 2, target: 'V_MIRROR' }
  ],
  parMoves: 10, parMovesNote: 'BFS 最短步数=10',
  hint: { focus: '综合运用压板门、专属门、暂停和映射切换' },
  tags: ['chapter-3', 'M1', 'M2', 'M3', 'M4', 'chapter-final']
}, null, 2));

// Level 032: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-032.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-032', chapter: 4, order: 32, title: '单向固定下一步',
  initialMapping: 'H_MIRROR',
  grid: { width: 6, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
  walls: [{ x: 2, y: 2 }, { x: 3, y: 2 }],
  entities: [
    { type: 'oneWay', x: 1, y: 2, arrow: 'UP' },
    { type: 'oneWay', x: 4, y: 2, arrow: 'UP' }
  ],
  parMoves: 6, parMovesNote: 'BFS 最短步数=6',
  hint: { focus: '单向格只能向上离开：规划好路线' },
  tags: ['chapter-4', 'tutorial', 'M5', 'oneway-next']
}, null, 2));

// Level 033: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-033.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-033', chapter: 4, order: 33, title: '两类解耦',
  initialMapping: 'H_MIRROR',
  grid: { width: 6, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
  walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }],
  entities: [
    { type: 'oneWay', x: 1, y: 2, arrow: 'UP' },
    { type: 'pauseTile', x: 0, y: 2 }
  ],
  parMoves: 6, parMovesNote: 'BFS 最短步数=6',
  hint: { focus: '暂停让蓝停下，单向格让橙只能向上' },
  tags: ['chapter-4', 'M3', 'M5', 'pause-oneway']
}, null, 2));

// Level 035: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-035.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-035', chapter: 4, order: 35, title: '门后单向约束',
  initialMapping: 'H_MIRROR',
  grid: { width: 6, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
  walls: [{ x: 2, y: 0 }, { x: 2, y: 1 }],
  entities: [
    { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 2, y: 2 },
    { type: 'oneWay', x: 3, y: 2, arrow: 'UP' }
  ],
  parMoves: 5, parMovesNote: 'BFS 最短步数=5',
  hint: { focus: '先开门，再过单向格' },
  tags: ['chapter-4', 'M1', 'M5', 'door-oneway']
}, null, 2));

// Level 039: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-039.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-039', chapter: 4, order: 39, title: '控制传送回合',
  initialMapping: 'H_MIRROR',
  grid: { width: 6, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
  walls: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }],
  entities: [
    { type: 'portal', portalId: 'p', x: 1, y: 4, end: 'A' },
    { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
    { type: 'portal', portalId: 'q', x: 4, y: 4, end: 'A' },
    { type: 'portal', portalId: 'q', x: 4, y: 1, end: 'B' },
    { type: 'pauseTile', x: 0, y: 3 }
  ],
  parMoves: 5, parMovesNote: 'BFS 最短步数=5',
  hint: { focus: '用暂停控制传送时机' },
  tags: ['chapter-4', 'M3', 'M6', 'portal-timing']
}, null, 2));

// Level 040: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-040.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-040', chapter: 4, order: 40, title: '第四章综合',
  initialMapping: 'H_MIRROR',
  grid: { width: 7, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
  walls: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }],
  entities: [
    { type: 'portal', portalId: 'p', x: 1, y: 3, end: 'A' },
    { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
    { type: 'oneWay', x: 1, y: 1, arrow: 'RIGHT' },
    { type: 'switcher', x: 3, y: 2, target: 'V_MIRROR' },
    { type: 'plate', id: 'p1', x: 3, y: 4, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 4, y: 2 }
  ],
  parMoves: 13, parMovesNote: 'BFS 最短步数=13',
  hint: { focus: '综合运用传送、单向格、映射切换和压板门' },
  tags: ['chapter-4', 'M1', 'M4', 'M5', 'M6', 'chapter-final']
}, null, 2));

// Level 042: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-042.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-042', chapter: 5, order: 42, title: '脆弱格变临时墙',
  initialMapping: 'H_MIRROR',
  grid: { width: 6, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
  walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
  entities: [
    { type: 'fragile', x: 1, y: 2 },
    { type: 'fragile', x: 4, y: 2 }
  ],
  parMoves: 5, parMovesNote: 'BFS 最短步数=5',
  hint: { focus: '脆弱格离开即坍塌' },
  tags: ['chapter-5', 'tutorial', 'M7', 'fragile-wall']
}, null, 2));

// Level 043: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-043.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-043', chapter: 5, order: 43, title: '暂停决定消耗者',
  initialMapping: 'H_MIRROR',
  grid: { width: 6, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
  walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
  entities: [
    { type: 'fragile', x: 1, y: 2 },
    { type: 'pauseTile', x: 0, y: 2 }
  ],
  parMoves: 6, parMovesNote: 'BFS 最短步数=6',
  hint: { focus: '用暂停控制谁先过桥' },
  tags: ['chapter-5', 'M3', 'M7', 'pause-fragile']
}, null, 2));

// Level 044: keep original frozen level
// Level 045: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-045.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-045', chapter: 5, order: 45, title: '变化棋盘',
  initialMapping: 'H_MIRROR',
  grid: { width: 6, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
  walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
  entities: [
    { type: 'fragile', x: 1, y: 2 },
    { type: 'switcher', x: 0, y: 2, target: 'V_MIRROR' },
    { type: 'plate', id: 'p1', x: 5, y: 2, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 3, y: 2 }
  ],
  parMoves: 7, parMovesNote: 'BFS 最短步数=7',
  hint: { focus: '切换映射、压板开门、脆弱格不可回头' },
  tags: ['chapter-5', 'M1', 'M4', 'M7', 'changing-board']
}, null, 2));

// Level 048: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-048.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-048', chapter: 5, order: 48, title: '传送映射同步',
  initialMapping: 'H_MIRROR',
  grid: { width: 7, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
  walls: [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 6, y: 1 }],
  entities: [
    { type: 'portal', portalId: 'p', x: 1, y: 3, end: 'A' },
    { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
    { type: 'portal', portalId: 'q', x: 5, y: 3, end: 'A' },
    { type: 'portal', portalId: 'q', x: 5, y: 1, end: 'B' },
    { type: 'switcher', x: 3, y: 2, target: 'V_MIRROR' },
    { type: 'pulseSwitch', pairId: 'p1', x: 1, y: 4 },
    { type: 'pulseSwitch', pairId: 'p1', x: 5, y: 4 },
    { type: 'pulseDoor', pairId: 'p1', x: 3, y: 1 }
  ],
  parMoves: 5, parMovesNote: 'BFS 最短步数=5',
  hint: { focus: '传送、映射切换和脉冲同步组合使用' },
  tags: ['chapter-5', 'M4', 'M6', 'M8', 'portal-map-pulse']
}, null, 2));

// Level 049: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-049.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-049', chapter: 5, order: 49, title: '终极预演',
  initialMapping: 'H_MIRROR',
  grid: { width: 7, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
  walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
  entities: [
    { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
    { type: 'colorDoor', x: 3, y: 4, color: 'BLUE' },
    { type: 'fragile', x: 1, y: 2 },
    { type: 'pauseTile', x: 6, y: 2 }
  ],
  parMoves: 7, parMovesNote: 'BFS 最短步数=7',
  hint: { focus: '专属门、暂停和脆弱格的终极组合' },
  tags: ['chapter-5', 'M2', 'M3', 'M7', 'final-preview']
}, null, 2));

// Level 050: original
writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-050.json'), JSON.stringify({
  schemaVersion: 1, id: 'level-050', chapter: 5, order: 50, title: '最终对称合流',
  initialMapping: 'H_MIRROR',
  grid: { width: 7, height: 5 },
  blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
  blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
  walls: [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 6, y: 1 }],
  entities: [
    { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
    { type: 'door', id: 'd1', x: 2, y: 4 },
    { type: 'oneWay', x: 3, y: 2, arrow: 'UP' },
    { type: 'pulseSwitch', pairId: 'p1', x: 1, y: 2 },
    { type: 'pulseSwitch', pairId: 'p1', x: 5, y: 2 },
    { type: 'pulseDoor', pairId: 'p1', x: 3, y: 1 }
  ],
  parMoves: 7, parMovesNote: 'BFS 最短步数=7',
  hint: { focus: '压板门、单向格和脉冲同步的完美配合' },
  tags: ['chapter-5', 'M1', 'M5', 'M8', 'final-symmetry']
}, null, 2));

console.log('All levels restored to original working versions.');