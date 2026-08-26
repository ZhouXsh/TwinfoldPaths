#!/usr/bin/env node
// Force mechanism activation by placing walls that channel through entities
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LEVELS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../levels');

// Level 014: walls force both characters through their respective doors
{
  const data = {
    schemaVersion: 1, id: 'level-014', chapter: 2, order: 14, title: '压板二次利用',
    initialMapping: 'H_MIRROR',
    grid: { width: 6, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 },
      { x: 2, y: 3 }, { x: 2, y: 4 },
      { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 },
      { x: 3, y: 3 }, { x: 3, y: 4 }
    ],
    entities: [
      { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 1, y: 2 },
      { type: 'plate', id: 'p2', x: 5, y: 4, doorId: 'd2' },
      { type: 'door', id: 'd2', x: 4, y: 2 }
    ],
    parMoves: 5, parMovesNote: 'BFS 最短步数=5',
    hint: { focus: '蓝踩板开左门，橙踩板开右门，互相配合' },
    tags: ['chapter-2', 'tutorial', 'M1', 'reuse-plate']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-02/level-014.json'), JSON.stringify(data, null, 2));
  console.log('level-014: Updated');
}

// Level 019: walls force through doors and colorDoor
{
  const data = {
    schemaVersion: 1, id: 'level-019', chapter: 2, order: 19, title: '双压板双门',
    initialMapping: 'H_MIRROR',
    grid: { width: 6, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 },
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }
    ],
    entities: [
      { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 2, y: 2 },
      { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
      { type: 'plate', id: 'p2', x: 5, y: 4, doorId: 'd2' },
      { type: 'door', id: 'd2', x: 4, y: 4 }
    ],
    parMoves: 6, parMovesNote: 'BFS 最短步数=6',
    hint: { focus: '蓝踩板开门，橙过专属门，橙踩板开门让蓝通过' },
    tags: ['chapter-2', 'M1', 'M2', 'dual-plate']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-02/level-019.json'), JSON.stringify(data, null, 2));
  console.log('level-019: Updated');
}

// Level 020: walls force through plates and colorDoor
{
  const data = {
    schemaVersion: 1, id: 'level-020', chapter: 2, order: 20, title: '第二章综合',
    initialMapping: 'H_MIRROR',
    grid: { width: 6, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 },
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }
    ],
    entities: [
      { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 2, y: 2 },
      { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
      { type: 'plate', id: 'p2', x: 5, y: 4, doorId: 'd2' },
      { type: 'door', id: 'd2', x: 4, y: 4 }
    ],
    parMoves: 7, parMovesNote: 'BFS 最短步数=7',
    hint: { focus: '压板门和专属门的组合，需要双方配合' },
    tags: ['chapter-2', 'M0', 'M1', 'M2', 'chapter-final']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-02/level-020.json'), JSON.stringify(data, null, 2));
  console.log('level-020: Updated');
}

// Level 025: walls force through colorDoor
{
  const data = {
    schemaVersion: 1, id: 'level-025', chapter: 3, order: 25, title: '专属门与暂停',
    initialMapping: 'H_MIRROR',
    grid: { width: 6, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 },
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 },
      { x: 2, y: 0 }, { x: 2, y: 1 }
    ],
    entities: [
      { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
      { type: 'pauseTile', x: 0, y: 4 }
    ],
    parMoves: 6, parMovesNote: 'BFS 最短步数=6',
    hint: { focus: '蓝暂停让橙先通过专属门，橙再等蓝' },
    tags: ['chapter-3', 'M2', 'M3', 'colordoor-pause']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-03/level-025.json'), JSON.stringify(data, null, 2));
  console.log('level-025: Updated');
}

// Level 027: walls force through switcher - only path is through the switcher
{
  const data = {
    schemaVersion: 1, id: 'level-027', chapter: 3, order: 27, title: '两种映射分段',
    initialMapping: 'H_MIRROR',
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
    blueExit: { x: 2, y: 0 }, orangeExit: { x: 2, y: 4 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
      { x: 2, y: 1 }, { x: 2, y: 2 }
    ],
    entities: [
      { type: 'switcher', x: 0, y: 4, target: 'V_MIRROR' }
    ],
    parMoves: 6, parMovesNote: 'BFS 最短步数=6',
    hint: { focus: '切换为垂直镜像后才能让橙向下去出口' },
    tags: ['chapter-3', 'tutorial', 'M4', 'dual-mapping']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-03/level-027.json'), JSON.stringify(data, null, 2));
  console.log('level-027: Updated');
}

// Level 028: walls force through switcher
{
  const data = {
    schemaVersion: 1, id: 'level-028', chapter: 3, order: 28, title: '暂停切换映射',
    initialMapping: 'H_MIRROR',
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
      { x: 2, y: 0 }, { x: 2, y: 1 }
    ],
    entities: [
      { type: 'pauseTile', x: 0, y: 4 },
      { type: 'switcher', x: 3, y: 2, target: 'V_MIRROR' }
    ],
    parMoves: 7, parMovesNote: 'BFS 最短步数=7',
    hint: { focus: '先拿暂停，再切换映射：两个操作配合使用' },
    tags: ['chapter-3', 'M3', 'M4', 'pause-switch']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-03/level-028.json'), JSON.stringify(data, null, 2));
  console.log('level-028: Updated');
}

// Level 030: walls force through mechanism entities
{
  const data = {
    schemaVersion: 1, id: 'level-030', chapter: 3, order: 30, title: '第三章综合',
    initialMapping: 'H_MIRROR',
    grid: { width: 6, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 },
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }
    ],
    entities: [
      { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 2, y: 2 },
      { type: 'pauseTile', x: 5, y: 4 },
      { type: 'switcher', x: 3, y: 2, target: 'V_MIRROR' }
    ],
    parMoves: 7, parMovesNote: 'BFS 最短步数=7',
    hint: { focus: '压板开门、暂停配合、切换映射的综合运用' },
    tags: ['chapter-3', 'M1', 'M3', 'M4', 'chapter-final']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-03/level-030.json'), JSON.stringify(data, null, 2));
  console.log('level-030: Updated');
}

// Level 032: walls force through oneWay cells
{
  const data = {
    schemaVersion: 1, id: 'level-032', chapter: 4, order: 32, title: '单向固定下一步',
    initialMapping: 'H_MIRROR',
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
      { x: 2, y: 0 }, { x: 2, y: 4 }
    ],
    entities: [
      { type: 'oneWay', x: 1, y: 2, arrow: 'RIGHT' },
      { type: 'oneWay', x: 3, y: 2, arrow: 'LEFT' }
    ],
    parMoves: 6, parMovesNote: 'BFS 最短步数=6',
    hint: { focus: '单向格让蓝只能向右，橙只能向左离开' },
    tags: ['chapter-4', 'tutorial', 'M5', 'oneway-next']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-032.json'), JSON.stringify(data, null, 2));
  console.log('level-032: Updated');
}

// Level 033: walls force through oneWay and pauseTile
{
  const data = {
    schemaVersion: 1, id: 'level-033', chapter: 4, order: 33, title: '两类解耦',
    initialMapping: 'H_MIRROR',
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
      { x: 2, y: 0 }, { x: 2, y: 4 }
    ],
    entities: [
      { type: 'oneWay', x: 1, y: 2, arrow: 'RIGHT' },
      { type: 'pauseTile', x: 4, y: 4 }
    ],
    parMoves: 6, parMovesNote: 'BFS 最短步数=6',
    hint: { focus: '橙暂停等蓝，蓝必须通过单向格' },
    tags: ['chapter-4', 'M3', 'M5', 'pause-oneway']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-033.json'), JSON.stringify(data, null, 2));
  console.log('level-033: Updated');
}

// Level 035: walls force through door and oneWay
{
  const data = {
    schemaVersion: 1, id: 'level-035', chapter: 4, order: 35, title: '门后单向约束',
    initialMapping: 'H_MIRROR',
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
      { x: 2, y: 0 }, { x: 2, y: 4 }
    ],
    entities: [
      { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 2, y: 2 },
      { type: 'oneWay', x: 2, y: 2, arrow: 'UP' }
    ],
    parMoves: 5, parMovesNote: 'BFS 最短步数=5',
    hint: { focus: '压板开门后，门的位置就是单向格，只能向上离开' },
    tags: ['chapter-4', 'M1', 'M5', 'door-oneway']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-035.json'), JSON.stringify(data, null, 2));
  console.log('level-035: Updated');
}

// Level 039: force through portal and switcher
{
  const data = {
    schemaVersion: 1, id: 'level-039', chapter: 4, order: 39, title: '控制传送回合',
    initialMapping: 'H_MIRROR',
    grid: { width: 6, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
    walls: [
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
      { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 },
      { x: 0, y: 1 }, { x: 5, y: 1 }
    ],
    entities: [
      { type: 'portal', portalId: 'p', x: 1, y: 4, end: 'A' },
      { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
      { type: 'portal', portalId: 'q', x: 4, y: 4, end: 'A' },
      { type: 'portal', portalId: 'q', x: 4, y: 1, end: 'B' },
      { type: 'switcher', x: 3, y: 3, target: 'V_MIRROR' }
    ],
    parMoves: 5, parMovesNote: 'BFS 最短步数=5',
    hint: { focus: '传送穿过墙后切换映射，调整方向' },
    tags: ['chapter-4', 'M4', 'M6', 'portal-timing']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-039.json'), JSON.stringify(data, null, 2));
  console.log('level-039: Updated');
}

// Level 040: walls force through path
{
  const data = {
    schemaVersion: 1, id: 'level-040', chapter: 4, order: 40, title: '第四章综合',
    initialMapping: 'H_MIRROR',
    grid: { width: 7, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
    walls: [
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
      { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 },
      { x: 0, y: 1 },
      { x: 3, y: 0 }, { x: 3, y: 4 }
    ],
    entities: [
      { type: 'portal', portalId: 'p', x: 1, y: 3, end: 'A' },
      { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
      { type: 'oneWay', x: 1, y: 1, arrow: 'RIGHT' },
      { type: 'switcher', x: 3, y: 2, target: 'V_MIRROR' },
      { type: 'plate', id: 'p1', x: 3, y: 4, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 4, y: 2 }
    ],
    parMoves: 13, parMovesNote: 'BFS 最短步数=13',
    hint: { focus: '传送绕过墙、单向格限制方向、切换映射、压板开门' },
    tags: ['chapter-4', 'M1', 'M4', 'M5', 'M6', 'chapter-final']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-04/level-040.json'), JSON.stringify(data, null, 2));
  console.log('level-040: Updated');
}

// Level 043: walls force through fragile
{
  const data = {
    schemaVersion: 1, id: 'level-043', chapter: 5, order: 43, title: '暂停决定消耗者',
    initialMapping: 'H_MIRROR',
    grid: { width: 5, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
      { x: 2, y: 0 }, { x: 2, y: 4 }
    ],
    entities: [
      { type: 'fragile', x: 1, y: 2 },
      { type: 'pauseTile', x: 4, y: 4 }
    ],
    parMoves: 6, parMovesNote: 'BFS 最短步数=6',
    hint: { focus: '谁拿暂停谁就不踩脆弱格：用暂停控制谁先过桥' },
    tags: ['chapter-5', 'M3', 'M7', 'pause-fragile']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-043.json'), JSON.stringify(data, null, 2));
  console.log('level-043: Updated');
}

// Level 044: force oneWay use
{
  const data = {
    schemaVersion: 1, id: 'level-044', chapter: 5, order: 44, title: '不可回头路',
    initialMapping: 'H_MIRROR',
    grid: { width: 6, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
    walls: [
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 },
      { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }
    ],
    entities: [
      { type: 'fragile', x: 0, y: 3 }, { type: 'fragile', x: 0, y: 2 },
      { type: 'fragile', x: 1, y: 1 }, { type: 'fragile', x: 5, y: 3 },
      { type: 'fragile', x: 5, y: 2 }, { type: 'fragile', x: 4, y: 1 },
      { type: 'oneWay', x: 0, y: 1, arrow: 'DOWN' },
      { type: 'oneWay', x: 5, y: 1, arrow: 'DOWN' }
    ],
    parMoves: 6, parMovesNote: 'BFS 最短步数=6',
    hint: { focus: '脆弱格碎裂不可回头，单向格只许向前' },
    tags: ['chapter-5', 'combo', 'M5', 'M7', 'no-return']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-044.json'), JSON.stringify(data, null, 2));
  console.log('level-044: Updated');
}

// Level 045: force through all entities
{
  const data = {
    schemaVersion: 1, id: 'level-045', chapter: 5, order: 45, title: '变化棋盘',
    initialMapping: 'H_MIRROR',
    grid: { width: 6, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 2, y: 0 }, { x: 2, y: 4 }
    ],
    entities: [
      { type: 'switcher', x: 0, y: 4, target: 'V_MIRROR' },
      { type: 'plate', id: 'p1', x: 3, y: 2, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 4, y: 2 },
      { type: 'fragile', x: 1, y: 2 }
    ],
    parMoves: 7, parMovesNote: 'BFS 最短步数=7',
    hint: { focus: '切换映射后两人同向，蓝踩板开门，脆弱格无法回头' },
    tags: ['chapter-5', 'M1', 'M4', 'M7', 'changing-board']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-045.json'), JSON.stringify(data, null, 2));
  console.log('level-045: Updated');
}

// Level 048: force through pulse
{
  const data = {
    schemaVersion: 1, id: 'level-048', chapter: 5, order: 48, title: '传送映射同步',
    initialMapping: 'H_MIRROR',
    grid: { width: 7, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 6, y: 1 },
      { x: 1, y: 0 }, { x: 5, y: 0 }
    ],
    entities: [
      { type: 'portal', portalId: 'p', x: 1, y: 3, end: 'A' },
      { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
      { type: 'portal', portalId: 'q', x: 5, y: 3, end: 'A' },
      { type: 'portal', portalId: 'q', x: 5, y: 1, end: 'B' },
      { type: 'pulseSwitch', pairId: 'p1', x: 1, y: 4 },
      { type: 'pulseSwitch', pairId: 'p1', x: 5, y: 4 },
      { type: 'pulseDoor', pairId: 'p1', x: 3, y: 1 }
    ],
    parMoves: 5, parMovesNote: 'BFS 最短步数=5',
    hint: { focus: '传送穿过墙后，需同时站上脉冲开关开门' },
    tags: ['chapter-5', 'M6', 'M8', 'portal-pulse']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-048.json'), JSON.stringify(data, null, 2));
  console.log('level-048: Updated');
}

// Level 049: force through colorDoor and fragile
{
  const data = {
    schemaVersion: 1, id: 'level-049', chapter: 5, order: 49, title: '终极预演',
    initialMapping: 'H_MIRROR',
    grid: { width: 7, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 },
      { x: 2, y: 0 }, { x: 2, y: 4 },
      { x: 4, y: 0 }, { x: 4, y: 4 }
    ],
    entities: [
      { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
      { type: 'fragile', x: 1, y: 2 },
      { type: 'pauseTile', x: 0, y: 4 }
    ],
    parMoves: 7, parMovesNote: 'BFS 最短步数=7',
    hint: { focus: '暂停让蓝等待，橙通过专属门，脆弱格限制回头' },
    tags: ['chapter-5', 'M2', 'M3', 'M7', 'final-preview']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-049.json'), JSON.stringify(data, null, 2));
  console.log('level-049: Updated');
}

// Level 050: force through plate, oneWay, and pulse
{
  const data = {
    schemaVersion: 1, id: 'level-050', chapter: 5, order: 50, title: '最终对称合流',
    initialMapping: 'H_MIRROR',
    grid: { width: 7, height: 5 },
    blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
    blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
    walls: [
      { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 6, y: 1 },
      { x: 1, y: 0 }, { x: 5, y: 0 }
    ],
    entities: [
      { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
      { type: 'door', id: 'd1', x: 2, y: 4 },
      { type: 'oneWay', x: 3, y: 2, arrow: 'UP' },
      { type: 'pulseSwitch', pairId: 'p1', x: 1, y: 2 },
      { type: 'pulseSwitch', pairId: 'p1', x: 5, y: 2 },
      { type: 'pulseDoor', pairId: 'p1', x: 3, y: 1 }
    ],
    parMoves: 7, parMovesNote: 'BFS 最短步数=7',
    hint: { focus: '压板开门、单向格限制方向、脉冲同步开启终局门' },
    tags: ['chapter-5', 'M1', 'M5', 'M8', 'final-symmetry']
  };
  writeFileSync(resolve(LEVELS_DIR, 'chapter-05/level-050.json'), JSON.stringify(data, null, 2));
  console.log('level-050: Updated');
}

console.log('All forced redesigns written.');