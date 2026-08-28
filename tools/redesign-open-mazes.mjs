import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  analyzeSolutionTrace,
  bfsSolve,
  bfsSolveWithoutPassThrough,
  traceSolution
} from '../tools-dist/solverApi.mjs';

const ROOT = process.cwd();
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];
const DIR_NAME = new Map([
  ['1,0', 'RIGHT'],
  ['-1,0', 'LEFT'],
  ['0,1', 'DOWN'],
  ['0,-1', 'UP']
]);

const key = (p) => `${p.x},${p.y}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => a.x === b.x && a.y === b.y;
const chapterOf = (order) => Math.ceil(order / 10);

function rng32(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}

function hashSeed(order, attempt, salt = 0) {
  return (0x9e3779b9 ^ Math.imul(order + 17, 0x85ebca6b) ^ Math.imul(attempt + 1, 0xc2b2ae35) ^ salt) >>> 0;
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function shuffle(rng, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function inBounds(width, height, p) {
  return p.x >= 0 && p.y >= 0 && p.x < width && p.y < height;
}

function neighbors(width, height, p) {
  return DIRS.map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).filter((q) =>
    inBounds(width, height, q)
  );
}

function allCells(width, height) {
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out.push({ x, y });
  }
  return out;
}

function dimsFor(order, rng) {
  const chapter = chapterOf(order);
  const choices =
    chapter === 2
      ? [[7, 7], [8, 7], [7, 8]]
      : chapter === 3
        ? [[8, 8], [9, 8], [8, 9], [9, 9]]
        : chapter === 4
          ? [[9, 9], [10, 9], [9, 10]]
          : [[10, 10], [11, 10], [10, 11], [11, 11]];
  return pick(rng, choices);
}

function chooseEndpoints(width, height, mapping, rng) {
  const ys = shuffle(rng, Array.from({ length: height - 2 }, (_, i) => i + 1));
  const xs = shuffle(rng, Array.from({ length: width - 2 }, (_, i) => i + 1));
  if (mapping === 'H_MIRROR') {
    const y1 = ys[0];
    let y2 = ys.find((y) => Math.abs(y - y1) >= Math.max(2, Math.floor(height / 3))) ?? ys[1];
    const y3 = ys.find((y) => y !== y1 && y !== y2) ?? ys[2];
    const y4 = ys.find((y) => y !== y1 && y !== y2 && y !== y3) ?? ys[3];
    return {
      blueStart: { x: 0, y: y1 },
      orangeStart: { x: width - 1, y: y2 },
      blueExit: { x: width - 1, y: y3 },
      orangeExit: { x: 0, y: y4 }
    };
  }
  const x1 = xs[0];
  let x2 = xs.find((x) => Math.abs(x - x1) >= Math.max(2, Math.floor(width / 3))) ?? xs[1];
  const x3 = xs.find((x) => x !== x1 && x !== x2) ?? xs[2];
  const x4 = xs.find((x) => x !== x1 && x !== x2 && x !== x3) ?? xs[3];
  return {
    blueStart: { x: x1, y: 0 },
    orangeStart: { x: x2, y: height - 1 },
    blueExit: { x: x3, y: height - 1 },
    orangeExit: { x: x4, y: 0 }
  };
}

function endpointSet(endpoints) {
  return new Set(Object.values(endpoints).map(key));
}

function addWall(walls, reserved, width, height, p) {
  if (!inBounds(width, height, p)) return false;
  const k = key(p);
  if (reserved.has(k) || walls.has(k)) return false;
  walls.add(k);
  return true;
}

function addDeadEndPocket(walls, reserved, width, height, rng) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const target = { x: randInt(rng, 1, width - 2), y: randInt(rng, 1, height - 2) };
    const tk = key(target);
    if (reserved.has(tk) || walls.has(tk)) continue;
    const openDirIndex = randInt(rng, 0, 3);
    const openNeighbor = {
      x: target.x + DIRS[openDirIndex][0],
      y: target.y + DIRS[openDirIndex][1]
    };
    if (!inBounds(width, height, openNeighbor) || walls.has(key(openNeighbor))) continue;
    const blockers = [];
    let valid = true;
    for (let i = 0; i < 4; i++) {
      if (i === openDirIndex) continue;
      const p = { x: target.x + DIRS[i][0], y: target.y + DIRS[i][1] };
      if (!inBounds(width, height, p) || reserved.has(key(p))) {
        valid = false;
        break;
      }
      blockers.push(p);
    }
    if (!valid) continue;
    reserved.add(tk);
    reserved.add(key(openNeighbor));
    for (const p of blockers) walls.add(key(p));
    return true;
  }
  return false;
}

function generateWalls(width, height, endpoints, order, rng) {
  const walls = new Set();
  const reserved = endpointSet(endpoints);

  // 先人工制造若干“口袋”，确保开放棋盘里仍然存在真正的死胡同。
  const pocketTarget = chapterOf(order) >= 4 ? 4 : 3;
  let pockets = 0;
  for (let i = 0; i < pocketTarget * 2 && pockets < pocketTarget; i++) {
    if (addDeadEndPocket(walls, reserved, width, height, rng)) pockets++;
  }

  // 再放置短墙段与墙块。核心是“开放空间里有障碍”，而不是从实心墙雕走廊。
  const area = width * height;
  const densityTarget = 0.2 + chapterOf(order) * 0.018 + (order % 3) * 0.01;
  const targetWalls = Math.floor(area * Math.min(0.31, densityTarget));
  let guard = 0;
  while (walls.size < targetWalls && guard++ < area * 20) {
    if (rng() < 0.72) {
      const horizontal = rng() < 0.5;
      const length = randInt(rng, 2, Math.min(5, horizontal ? width - 2 : height - 2));
      const start = {
        x: randInt(rng, 1, Math.max(1, width - (horizontal ? length : 1) - 1)),
        y: randInt(rng, 1, Math.max(1, height - (horizontal ? 1 : length) - 1))
      };
      for (let i = 0; i < length; i++) {
        const p = { x: start.x + (horizontal ? i : 0), y: start.y + (horizontal ? 0 : i) };
        addWall(walls, reserved, width, height, p);
      }
    } else {
      const bx = randInt(rng, 1, width - 2);
      const by = randInt(rng, 1, height - 2);
      for (const p of [
        { x: bx, y: by },
        { x: bx + 1, y: by },
        { x: bx, y: by + 1 },
        { x: bx + 1, y: by + 1 }
      ]) {
        addWall(walls, reserved, width, height, p);
      }
    }
  }
  return walls;
}

function connectedOpen(width, height, walls, start) {
  const seen = new Set([key(start)]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    for (const q of neighbors(width, height, p)) {
      const qk = key(q);
      if (walls.has(qk) || seen.has(qk)) continue;
      seen.add(qk);
      queue.push(q);
    }
  }
  return seen;
}

function normalizeConnectedWalls(width, height, walls, endpoints) {
  const protectedKeys = endpointSet(endpoints);
  const reachable = connectedOpen(width, height, walls, endpoints.blueStart);
  for (const p of allCells(width, height)) {
    const k = key(p);
    if (walls.has(k) || reachable.has(k)) continue;
    if (protectedKeys.has(k)) return null;
    walls.add(k);
  }
  for (const p of Object.values(endpoints)) {
    if (!reachable.has(key(p))) return null;
  }
  return walls;
}

function graphMetrics(width, height, walls, endpoints) {
  const protectedKeys = endpointSet(endpoints);
  let vertices = 0;
  let degreeSum = 0;
  let branches = 0;
  let deadEnds = 0;
  for (const p of allCells(width, height)) {
    if (walls.has(key(p))) continue;
    vertices++;
    const degree = neighbors(width, height, p).filter((q) => !walls.has(key(q))).length;
    degreeSum += degree;
    if (degree >= 3) branches++;
    if (degree === 1 && !protectedKeys.has(key(p))) deadEnds++;
  }
  const edges = degreeSum / 2;
  const cycleRank = edges - vertices + 1;
  const openRatio = vertices / (width * height);
  return { vertices, edges, branches, deadEnds, cycleRank, openRatio };
}

function mappingFor(order) {
  // 对穿交换需要相反方向映射；M4 通过关内 switcher 再引入 ROTATE_CW。
  return order % 2 === 0 ? 'V_MIRROR' : 'H_MIRROR';
}

function geometryQuality(level) {
  const walls = new Set(level.walls.map(key));
  return graphMetrics(level.grid.width, level.grid.height, walls, {
    blueStart: level.blueStart,
    orangeStart: level.orangeStart,
    blueExit: level.blueExit,
    orangeExit: level.orangeExit
  });
}

function baseLevel(template, width, height, mapping, endpoints, walls) {
  const keepTags = template.tags.filter(
    (tag) => !['maze', 'shared-maze', 'cross-interaction', 'route-variation', 'large-map'].includes(tag)
  );
  for (const tag of ['maze', 'open-maze', 'shared-maze', 'branching-map', 'pass-through-design']) {
    if (!keepTags.includes(tag)) keepTags.push(tag);
  }
  const visibility = {
    ...(template.visibility ?? {}),
    mode: 'fog',
    radius: 1,
    shape: 'square',
    source: template.visibility?.source ?? 'both',
    memory: template.visibility?.memory ?? 'persistent'
  };
  return {
    schemaVersion: 1,
    id: template.id,
    title: template.title,
    chapter: template.chapter,
    order: template.order,
    grid: { width, height },
    blueStart: endpoints.blueStart,
    orangeStart: endpoints.orangeStart,
    blueExit: endpoints.blueExit,
    orangeExit: endpoints.orangeExit,
    initialMapping: mapping,
    walls: [...walls].map((s) => {
      const [x, y] = s.split(',').map(Number);
      return { x, y };
    }),
    entities: [],
    parMoves: 1,
    parMovesNote: '等待 BFS 回填',
    hint: {
      focus: `开放迷宫没有固定双线：先利用墙体让两球错位，再观察会车时的对穿交换。${template.hint?.focus ? ` ${template.hint.focus}` : ''}`
    },
    tags: keepTags,
    visibility
  };
}

function minPar(order) {
  if (order <= 20) return 8;
  if (order <= 30) return 14;
  if (order <= 40) return 16;
  return 18;
}

function maxPar(order) {
  if (order <= 20) return 22;
  if (order <= 30) return 30;
  if (order <= 40) return 34;
  return 38;
}

function traceVisited(trace) {
  const blue = new Set();
  const orange = new Set();
  for (const step of trace) {
    blue.add(key(step.blueFrom));
    blue.add(key(step.blueTo));
    orange.add(key(step.orangeFrom));
    orange.add(key(step.orangeTo));
  }
  return { blue, orange, union: new Set([...blue, ...orange]) };
}

function allOpenCandidates(level) {
  const walls = new Set(level.walls.map(key));
  const protectedKeys = new Set([
    key(level.blueStart),
    key(level.orangeStart),
    key(level.blueExit),
    key(level.orangeExit)
  ]);
  return allCells(level.grid.width, level.grid.height).filter(
    (p) => !walls.has(key(p)) && !protectedKeys.has(key(p))
  );
}

function directionBetween(a, b) {
  return DIR_NAME.get(`${b.x - a.x},${b.y - a.y}`) ?? null;
}

function actorForCell(trace, cell) {
  const k = key(cell);
  for (const step of trace) {
    if (key(step.blueTo) === k || key(step.blueFrom) === k) return 'BLUE';
    if (key(step.orangeTo) === k || key(step.orangeFrom) === k) return 'ORANGE';
  }
  return null;
}

function departureForCell(trace, cell) {
  const k = key(cell);
  for (const step of trace) {
    if (key(step.blueFrom) === k && !same(step.blueFrom, step.blueTo)) {
      return directionBetween(step.blueFrom, step.blueTo);
    }
    if (key(step.orangeFrom) === k && !same(step.orangeFrom, step.orangeTo)) {
      return directionBetween(step.orangeFrom, step.orangeTo);
    }
  }
  return null;
}

function entryTurnForCell(trace, cell) {
  const k = key(cell);
  for (const step of trace) {
    if (
      (key(step.blueTo) === k && !same(step.blueFrom, step.blueTo)) ||
      (key(step.orangeTo) === k && !same(step.orangeFrom, step.orangeTo))
    ) {
      return step.turn;
    }
  }
  return null;
}

function orderedPreferredCells(level, trace, rng) {
  const visited = [];
  const seen = new Set();
  const protectedKeys = new Set([
    key(level.blueStart),
    key(level.orangeStart),
    key(level.blueExit),
    key(level.orangeExit)
  ]);
  for (const step of trace) {
    for (const p of [step.blueTo, step.orangeTo]) {
      const k = key(p);
      if (protectedKeys.has(k) || seen.has(k)) continue;
      seen.add(k);
      visited.push(p);
    }
  }
  const rest = shuffle(
    rng,
    allOpenCandidates(level).filter((p) => !seen.has(key(p)))
  );
  return [...visited, ...rest];
}

function deadEndCells(level) {
  const walls = new Set(level.walls.map(key));
  const protectedKeys = new Set([
    key(level.blueStart),
    key(level.orangeStart),
    key(level.blueExit),
    key(level.orangeExit)
  ]);
  return allOpenCandidates(level).filter((p) => {
    if (protectedKeys.has(key(p))) return false;
    return neighbors(level.grid.width, level.grid.height, p).filter((q) => !walls.has(key(q))).length === 1;
  });
}

function takeUniqueCell(candidates, used, predicate = () => true) {
  for (const p of candidates) {
    if (used.has(key(p)) || !predicate(p)) continue;
    used.add(key(p));
    return p;
  }
  return null;
}

function addM1CrossPlates(level, trace, entities, used) {
  const candidates = trace.filter((step, i) => i > 1 && i < trace.length - 2);
  const pickPair = (plateActor, startIndex, suffix) => {
    for (let offset = 0; offset < candidates.length; offset++) {
      const step = candidates[(startIndex + offset) % candidates.length];
      const next = trace[step.turn];
      if (!next) continue;
      const plate = plateActor === 'BLUE' ? step.blueTo : step.orangeTo;
      const door = plateActor === 'BLUE' ? next.orangeTo : next.blueTo;
      if (same(plate, door) || used.has(key(plate)) || used.has(key(door))) continue;
      used.add(key(plate));
      used.add(key(door));
      const doorId = `${level.id}-m1-${suffix}-door`;
      entities.push(
        { type: 'plate', id: `${level.id}-m1-${suffix}-plate`, x: plate.x, y: plate.y, doorId },
        { type: 'door', id: doorId, x: door.x, y: door.y }
      );
      return true;
    }
    return false;
  };
  const a = pickPair('BLUE', Math.floor(candidates.length * 0.22), 'blue-opens-orange');
  const b = pickPair('ORANGE', Math.floor(candidates.length * 0.58), 'orange-opens-blue');
  return a && b;
}

function addM2ColorDoors(level, trace, preferred, entities, used) {
  const visited = traceVisited(trace);
  const blueCell = takeUniqueCell(preferred, used, (p) => visited.blue.has(key(p)) && !visited.orange.has(key(p)));
  const orangeCell = takeUniqueCell(preferred, used, (p) => visited.orange.has(key(p)) && !visited.blue.has(key(p)));
  if (!blueCell || !orangeCell) return false;
  entities.push(
    { type: 'colorDoor', color: 'BLUE', x: blueCell.x, y: blueCell.y },
    { type: 'colorDoor', color: 'ORANGE', x: orangeCell.x, y: orangeCell.y }
  );
  return true;
}

function addM3Pause(level, trace, entities, used) {
  for (const step of trace.slice(2, -3)) {
    if (used.has(key(step.blueTo)) || used.has(key(step.orangeTo)) || same(step.blueTo, step.orangeTo)) continue;
    used.add(key(step.blueTo));
    used.add(key(step.orangeTo));
    entities.push(
      { type: 'pauseTile', x: step.blueTo.x, y: step.blueTo.y },
      { type: 'pauseTile', x: step.orangeTo.x, y: step.orangeTo.y }
    );
    return true;
  }
  return false;
}

function addM4Switcher(level, trace, entities, used, deadEnds) {
  const cell = takeUniqueCell(deadEnds, used) ?? takeUniqueCell(allOpenCandidates(level), used);
  if (!cell) return false;
  entities.push({ type: 'switcher', target: 'ROTATE_CW', x: cell.x, y: cell.y });
  return true;
}

function addM5OneWay(level, trace, preferred, entities, used) {
  const first = takeUniqueCell(preferred, used, (p) => departureForCell(trace, p) !== null);
  const second = takeUniqueCell(preferred, used, (p) => departureForCell(trace, p) !== null);
  if (!first || !second) return false;
  entities.push(
    { type: 'oneWay', arrow: departureForCell(trace, first), x: first.x, y: first.y },
    { type: 'oneWay', arrow: departureForCell(trace, second), x: second.x, y: second.y }
  );
  return true;
}

function addM6Portal(level, entities, used, deadEnds, preferred) {
  const a = takeUniqueCell(deadEnds, used) ?? takeUniqueCell(preferred, used);
  const b = takeUniqueCell([...deadEnds].reverse(), used) ?? takeUniqueCell([...preferred].reverse(), used);
  if (!a || !b) return false;
  const portalId = `${level.id}-m6-portal`;
  entities.push(
    { type: 'portal', portalId, end: 'A', x: a.x, y: a.y },
    { type: 'portal', portalId, end: 'B', x: b.x, y: b.y }
  );
  return true;
}

function addM7Fragile(level, preferred, entities, used) {
  const a = takeUniqueCell([...preferred].reverse(), used);
  const b = takeUniqueCell([...preferred].reverse(), used);
  if (!a || !b) return false;
  entities.push({ type: 'fragile', x: a.x, y: a.y }, { type: 'fragile', x: b.x, y: b.y });
  return true;
}

function addM8Pulse(level, trace, entities, used) {
  const usable = trace.slice(2, -5);
  for (const step of usable) {
    const later = trace[Math.min(trace.length - 2, step.turn + 3)];
    if (!later) continue;
    const cells = [step.blueTo, step.orangeTo, later.blueTo, later.orangeTo];
    if (new Set(cells.map(key)).size !== 4 || cells.some((p) => used.has(key(p)))) continue;
    cells.forEach((p) => used.add(key(p)));
    const pairId = `${level.id}-m8-pulse`;
    entities.push(
      { type: 'pulseSwitch', pairId, x: step.blueTo.x, y: step.blueTo.y },
      { type: 'pulseSwitch', pairId, x: step.orangeTo.x, y: step.orangeTo.y },
      { type: 'pulseDoor', pairId, x: later.blueTo.x, y: later.blueTo.y },
      { type: 'pulseDoor', pairId, x: later.orangeTo.x, y: later.orangeTo.y }
    );
    return true;
  }
  return false;
}

function addM9Phase(level, trace, preferred, entities, used) {
  const cells = [];
  for (const p of preferred) {
    const turn = entryTurnForCell(trace, p);
    if (!turn || used.has(key(p))) continue;
    used.add(key(p));
    cells.push({ p, turn });
    if (cells.length === 2) break;
  }
  if (cells.length < 2) return false;
  for (const { p, turn } of cells) {
    entities.push({ type: 'phaseDoor', phase: turn % 2 === 1 ? 'ODD' : 'EVEN', x: p.x, y: p.y });
  }
  return true;
}

function addVisionBeacons(template, level, entities, used, deadEnds, preferred) {
  const count = template.entities.filter((entity) => entity.type === 'visionBeacon').length;
  for (let i = 0; i < count; i++) {
    const cell = takeUniqueCell(deadEnds, used) ?? takeUniqueCell(preferred, used);
    if (!cell) return false;
    entities.push({ type: 'visionBeacon', radius: 2 + (i % 2), x: cell.x, y: cell.y });
  }
  return true;
}

function placeMechanisms(template, level, baseSolution, placementAttempt) {
  const rng = rng32(hashSeed(level.order, placementAttempt, 0x51ed270b));
  const trace = traceSolution(level, baseSolution);
  const preferred = orderedPreferredCells(level, trace, rng);
  const deadEnds = shuffle(rng, deadEndCells(level));
  const used = new Set([
    key(level.blueStart),
    key(level.orangeStart),
    key(level.blueExit),
    key(level.orangeExit)
  ]);
  const entities = [];
  const mechanisms = new Set(template.tags.filter((tag) => /^M\d+$/.test(tag)));

  // M1 以后每章仍保留双向跨球压板；它们放在最短解相邻回合上，使“另一球在哪里”继续影响通路。
  if (mechanisms.has('M1') && !addM1CrossPlates(level, trace, entities, used)) return null;
  if (mechanisms.has('M2') && !addM2ColorDoors(level, trace, preferred, entities, used)) return null;
  if (mechanisms.has('M3') && !addM3Pause(level, trace, entities, used)) return null;
  if (mechanisms.has('M4') && !addM4Switcher(level, trace, entities, used, deadEnds)) return null;
  if (mechanisms.has('M5') && !addM5OneWay(level, trace, preferred, entities, used)) return null;
  if (mechanisms.has('M6') && !addM6Portal(level, entities, used, deadEnds, preferred)) return null;
  if (mechanisms.has('M7') && !addM7Fragile(level, preferred, entities, used)) return null;
  if (mechanisms.has('M8') && !addM8Pulse(level, trace, entities, used)) return null;
  if (mechanisms.has('M9') && !addM9Phase(level, trace, preferred, entities, used)) return null;
  if (!addVisionBeacons(template, level, entities, used, deadEnds, preferred)) return null;

  return entities;
}

function entityVisitCount(level, solution) {
  if (level.entities.length === 0) return 0;
  const trace = traceSolution(level, solution);
  const visited = new Set();
  for (const step of trace) {
    visited.add(key(step.blueFrom));
    visited.add(key(step.blueTo));
    visited.add(key(step.orangeFrom));
    visited.add(key(step.orangeTo));
  }
  return new Set(level.entities.filter((entity) => visited.has(key(entity))).map(key)).size;
}

function acceptableFinal(level, result, stats, geometry) {
  if (!result.solvable || result.budgetExhausted) return false;
  if (result.optimalSteps < minPar(level.order) || result.optimalSteps > maxPar(level.order)) return false;
  if (stats.passThroughSwaps < 1) return false;
  if (stats.sharedVisitedCells < 2) return false;
  if (stats.blueBlockedOrangeMoved + stats.orangeBlockedBlueMoved < 2) return false;
  if (geometry.openRatio < 0.52 || geometry.openRatio > 0.82) return false;
  if (geometry.branches < 4 || geometry.deadEnds < 2 || geometry.cycleRank < 2) return false;
  if (level.entities.length > 0 && entityVisitCount(level, result.solution) < Math.min(2, level.entities.length)) {
    return false;
  }
  return true;
}

function buildOne(template) {
  const order = template.order;
  for (let attempt = 0; attempt < 900; attempt++) {
    const rng = rng32(hashSeed(order, attempt, 0x1234abcd));
    const [width, height] = dimsFor(order, rng);
    const mapping = mappingFor(order);
    const endpoints = chooseEndpoints(width, height, mapping, rng);
    const rawWalls = generateWalls(width, height, endpoints, order, rng);
    const walls = normalizeConnectedWalls(width, height, rawWalls, endpoints);
    if (!walls) continue;
    const level = baseLevel(template, width, height, mapping, endpoints, walls);
    const geometry = geometryQuality(level);
    if (geometry.openRatio < 0.52 || geometry.openRatio > 0.82) continue;
    if (geometry.branches < 4 || geometry.deadEnds < 2 || geometry.cycleRank < 2) continue;

    const baseResult = bfsSolve(level, { maxNodes: 220_000, maxDepth: 90 });
    if (!baseResult.solvable || baseResult.budgetExhausted) continue;
    if (baseResult.optimalSteps < Math.max(6, minPar(order) - 3) || baseResult.optimalSteps > maxPar(order)) continue;
    const baseStats = analyzeSolutionTrace(level, baseResult.solution);
    if (baseStats.passThroughSwaps < 1 || baseStats.sharedVisitedCells < 2) continue;

    for (let placementAttempt = 0; placementAttempt < 16; placementAttempt++) {
      const candidate = clone(level);
      const entities = placeMechanisms(template, candidate, baseResult.solution, attempt * 31 + placementAttempt);
      if (!entities) continue;
      candidate.entities = entities;
      const result = bfsSolve(candidate, { maxNodes: 700_000, maxDepth: 120 });
      if (!result.solvable || result.budgetExhausted) continue;
      const stats = analyzeSolutionTrace(candidate, result.solution);
      if (!acceptableFinal(candidate, result, stats, geometry)) continue;

      const noSwap = bfsSolveWithoutPassThrough(candidate, { maxNodes: 350_000, maxDepth: 120 });
      candidate.parMoves = result.optimalSteps;
      candidate.parMovesNote = `BFS 最短步数=${result.optimalSteps}；最优解对穿=${stats.passThroughSwaps} 次；parMoves 与求解器严格一致`;
      candidate.tags = candidate.tags.filter((tag) => tag !== 'cross-interaction');
      for (const tag of ['cross-interaction', 'swap-optimal']) {
        if (!candidate.tags.includes(tag)) candidate.tags.push(tag);
      }
      if (!noSwap.solvable || noSwap.budgetExhausted || noSwap.optimalSteps > result.optimalSteps) {
        candidate.tags.push('swap-value');
      }
      return {
        level: candidate,
        result,
        noSwap,
        stats,
        geometry,
        seedAttempt: attempt,
        placementAttempt
      };
    }
  }
  throw new Error(`${template.id}: 900 组开放迷宫候选仍未满足对穿/分岔/回环/可解门禁`);
}

function levelPath(order) {
  const chapter = String(chapterOf(order)).padStart(2, '0');
  return resolve(ROOT, `levels/chapter-${chapter}/level-${String(order).padStart(3, '0')}.json`);
}

const rows = [];
for (let order = 11; order <= 50; order++) {
  const path = levelPath(order);
  const template = JSON.parse(readFileSync(path, 'utf8'));
  const built = buildOne(template);
  writeFileSync(path, `${JSON.stringify(built.level, null, 2)}\n`, 'utf8');
  rows.push({
    order,
    id: built.level.id,
    chapter: built.level.chapter,
    title: built.level.title,
    grid: `${built.level.grid.width}x${built.level.grid.height}`,
    optimalSteps: built.result.optimalSteps,
    solutionCount: built.result.solutionCount,
    statesVisited: built.result.statesVisited,
    passThroughSwaps: built.stats.passThroughSwaps,
    sharedVisitedCells: built.stats.sharedVisitedCells,
    blueBlockedOrangeMoved: built.stats.blueBlockedOrangeMoved,
    orangeBlockedBlueMoved: built.stats.orangeBlockedBlueMoved,
    openRatio: Number(built.geometry.openRatio.toFixed(3)),
    branches: built.geometry.branches,
    deadEnds: built.geometry.deadEnds,
    cycleRank: built.geometry.cycleRank,
    noSwapSolvable: built.noSwap.solvable,
    noSwapOptimalSteps: built.noSwap.solvable ? built.noSwap.optimalSteps : null,
    swapValue:
      !built.noSwap.solvable || built.noSwap.budgetExhausted
        ? 'required-or-budgeted'
        : built.noSwap.optimalSteps > built.result.optimalSteps
          ? `saves-${built.noSwap.optimalSteps - built.result.optimalSteps}`
          : 'optimal-tie',
    seedAttempt: built.seedAttempt,
    placementAttempt: built.placementAttempt
  });
  console.log(
    `${built.level.id}: ${built.level.grid.width}x${built.level.grid.height} opt=${built.result.optimalSteps} swap=${built.stats.passThroughSwaps} shared=${built.stats.sharedVisitedCells} branch=${built.geometry.branches} dead=${built.geometry.deadEnds} cycles=${built.geometry.cycleRank}`
  );
}

const late30 = rows.filter((row) => row.order >= 21);
const avg = (items, selector) => items.reduce((sum, item) => sum + selector(item), 0) / items.length;
const chapterStats = [2, 3, 4, 5].map((chapter) => {
  const items = rows.filter((row) => row.chapter === chapter);
  return {
    chapter,
    averageOptimal: Number(avg(items, (row) => row.optimalSteps).toFixed(2)),
    minOptimal: Math.min(...items.map((row) => row.optimalSteps)),
    maxOptimal: Math.max(...items.map((row) => row.optimalSteps)),
    averageSwaps: Number(avg(items, (row) => row.passThroughSwaps).toFixed(2))
  };
});
const summary = {
  generatedAt: new Date().toISOString(),
  levels: rows.length,
  passThroughOptimalLevels: rows.filter((row) => row.passThroughSwaps > 0).length,
  swapValueLevels: rows.filter((row) => row.swapValue !== 'optimal-tie').length,
  sharedVisitLevels: rows.filter((row) => row.sharedVisitedCells >= 2).length,
  dualDecoupleLevels: rows.filter(
    (row) => row.blueBlockedOrangeMoved > 0 && row.orangeBlockedBlueMoved > 0
  ).length,
  late30AverageOptimal: Number(avg(late30, (row) => row.optimalSteps).toFixed(2)),
  chapterStats,
  rows
};

if (summary.passThroughOptimalLevels < 40) throw new Error('后40关并非全部在最优解中出现对穿');
if (summary.sharedVisitLevels < 32) throw new Error('共享轨迹关卡不足 32/40');
if (summary.dualDecoupleLevels < 24) throw new Error('双向单侧受阻解耦关卡不足 24/40');
if (summary.late30AverageOptimal < 18) {
  throw new Error(`后30关平均最优步数 ${summary.late30AverageOptimal} < 18`);
}

mkdirSync(resolve(ROOT, 'reports'), { recursive: true });
writeFileSync(
  resolve(ROOT, 'reports/open-maze-redesign-summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
  'utf8'
);

const md = [
  '# 后 40 关开放迷宫与对穿交互重制报告',
  '',
  `- 重制关卡：${summary.levels}/40`,
  `- 最优解包含真实对穿交换：${summary.passThroughOptimalLevels}/40`,
  `- 禁止对穿后不可解或最短解变长：${summary.swapValueLevels}/40`,
  `- 最优解共享访问格 >= 2：${summary.sharedVisitLevels}/40`,
  `- 最优解同时出现两种单侧受阻解耦：${summary.dualDecoupleLevels}/40`,
  `- 后 30 关平均 BFS 最优步数：${summary.late30AverageOptimal}`,
  '',
  '## 分章统计',
  '',
  '| 章节 | 平均最优步数 | 最小 | 最大 | 平均对穿次数 |',
  '|---:|---:|---:|---:|---:|',
  ...chapterStats.map(
    (row) => `| ${row.chapter} | ${row.averageOptimal} | ${row.minOptimal} | ${row.maxOptimal} | ${row.averageSwaps} |`
  ),
  '',
  '## 逐关几何与交互指标',
  '',
  '| 关卡 | 地图 | 最优 | 对穿 | 共享格 | 蓝停橙走 | 橙停蓝走 | 开放率 | 分岔 | 死胡同 | 环秩 | 禁对穿 |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
  ...rows.map(
    (row) =>
      `| ${row.id} | ${row.grid} | ${row.optimalSteps} | ${row.passThroughSwaps} | ${row.sharedVisitedCells} | ${row.blueBlockedOrangeMoved} | ${row.orangeBlockedBlueMoved} | ${row.openRatio} | ${row.branches} | ${row.deadEnds} | ${row.cycleRank} | ${row.swapValue} |`
  ),
  '',
  '本报告由确定性生成器 + 领域 BFS/逐回合回放生成。这里的“对穿”严格指两球在同一已应用回合中互换相邻格位置，不是路径线条视觉相交。'
].join('\n');
writeFileSync(resolve(ROOT, 'reports/open-maze-redesign-summary.md'), `${md}\n`, 'utf8');

console.log(
  `done: levels=${summary.levels}, swaps=${summary.passThroughOptimalLevels}/40, swapValue=${summary.swapValueLevels}/40, dualDecouple=${summary.dualDecoupleLevels}/40, late30Avg=${summary.late30AverageOptimal}`
);
