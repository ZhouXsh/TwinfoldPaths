import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bfsSolve } from '../tools-dist/solver.mjs';

const ROOT = process.cwd();
const DIRS = [
  ['UP', 0, -1],
  ['DOWN', 0, 1],
  ['LEFT', -1, 0],
  ['RIGHT', 1, 0]
];

function key(p) {
  return `${p.x},${p.y}`;
}

function directionBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 1 && dy === 0) return 'RIGHT';
  if (dx === -1 && dy === 0) return 'LEFT';
  if (dx === 0 && dy === 1) return 'DOWN';
  if (dx === 0 && dy === -1) return 'UP';
  throw new Error(`非相邻路径点: ${key(a)} -> ${key(b)}`);
}

function transformPoint(mode, p, width, height) {
  if (mode === 'H_MIRROR') return { x: width - 1 - p.x, y: p.y };
  if (mode === 'V_MIRROR') return { x: p.x, y: height - 1 - p.y };
  if (width !== height) throw new Error('ROTATE_CW 生成器要求方形地图');
  return { x: width - 1 - p.y, y: p.x };
}

function transformDir(mode, dir) {
  const maps = {
    H_MIRROR: { UP: 'UP', DOWN: 'DOWN', LEFT: 'RIGHT', RIGHT: 'LEFT' },
    V_MIRROR: { UP: 'DOWN', DOWN: 'UP', LEFT: 'LEFT', RIGHT: 'RIGHT' },
    ROTATE_CW: { UP: 'RIGHT', RIGHT: 'DOWN', DOWN: 'LEFT', LEFT: 'UP' }
  };
  return maps[mode][dir];
}

function horizontalSnake(laneLength, lanes) {
  const path = [];
  let y = 1;
  let leftToRight = true;
  for (let lane = 0; lane < lanes; lane++) {
    const xs = leftToRight
      ? Array.from({ length: laneLength }, (_, i) => i + 1)
      : Array.from({ length: laneLength }, (_, i) => laneLength - i);
    if (lane === 0) {
      for (const x of xs) path.push({ x, y });
    } else {
      const connectorX = xs[0];
      path.push({ x: connectorX, y: y - 1 });
      path.push({ x: connectorX, y });
      for (const x of xs.slice(1)) path.push({ x, y });
    }
    y += 2;
    leftToRight = !leftToRight;
  }
  return path;
}

function geometry(spec) {
  const base = horizontalSnake(spec.laneLength, spec.lanes);
  if (spec.axis === 'H') {
    return {
      width: spec.laneLength * 2 + 3,
      height: spec.lanes * 2 + 1,
      bluePath: base
    };
  }
  if (spec.axis === 'V') {
    return {
      width: spec.lanes * 2 + 1,
      height: spec.laneLength * 2 + 3,
      bluePath: base.map((p) => ({ x: p.y, y: p.x }))
    };
  }
  const extent = Math.max(spec.laneLength, spec.lanes * 2 - 1);
  const size = Math.max(15, extent * 2 + 5);
  return { width: size, height: size, bluePath: base };
}

function neighborCount(p, open) {
  let count = 0;
  for (const [, dx, dy] of DIRS) {
    if (open.has(`${p.x + dx},${p.y + dy}`)) count++;
  }
  return count;
}

function carveBranches(open, bluePath, mode, width, height, count) {
  const candidates = [0.24, 0.43, 0.61, 0.78, 0.34, 0.69];
  let made = 0;
  for (const ratio of candidates) {
    if (made >= count) break;
    const i = Math.max(2, Math.min(bluePath.length - 3, Math.floor((bluePath.length - 1) * ratio)));
    const origin = bluePath[i];
    for (const [, dx, dy] of DIRS) {
      const leaf = { x: origin.x + dx, y: origin.y + dy };
      if (leaf.x <= 0 || leaf.y <= 0 || leaf.x >= width - 1 || leaf.y >= height - 1) continue;
      const twin = transformPoint(mode, leaf, width, height);
      if (open.has(key(leaf)) || open.has(key(twin)) || key(leaf) === key(twin)) continue;
      if (neighborCount(leaf, open) !== 1 || neighborCount(twin, open) !== 1) continue;
      open.add(key(leaf));
      open.add(key(twin));
      made++;
      break;
    }
  }
}

function atRatio(path, ratio) {
  return Math.max(1, Math.min(path.length - 2, Math.floor((path.length - 1) * ratio)));
}

function addPairedEntity(entities, mode, width, height, blueEntity, orangePatch = {}) {
  entities.push(blueEntity);
  const twin = transformPoint(mode, blueEntity, width, height);
  entities.push({ ...blueEntity, ...twin, ...orangePatch });
}

function featureEntities(spec, bluePath, width, height) {
  const entities = [];
  const mode = spec.mapping;
  const idx = (ratio) => atRatio(bluePath, ratio);

  for (const feature of spec.features ?? []) {
    if (feature.type === 'colorDoor') {
      const p = bluePath[idx(feature.ratio ?? 0.3)];
      addPairedEntity(
        entities,
        mode,
        width,
        height,
        { type: 'colorDoor', x: p.x, y: p.y, color: 'BLUE' },
        { color: 'ORANGE' }
      );
    } else if (feature.type === 'pauseTile') {
      const p = bluePath[idx(feature.ratio ?? 0.4)];
      addPairedEntity(entities, mode, width, height, { type: 'pauseTile', x: p.x, y: p.y });
    } else if (feature.type === 'fragile') {
      const p = bluePath[idx(feature.ratio ?? 0.55)];
      addPairedEntity(entities, mode, width, height, { type: 'fragile', x: p.x, y: p.y });
    } else if (feature.type === 'oneWay') {
      const i = idx(feature.ratio ?? 0.5);
      const p = bluePath[i];
      const dir = directionBetween(bluePath[i], bluePath[i + 1]);
      addPairedEntity(
        entities,
        mode,
        width,
        height,
        { type: 'oneWay', x: p.x, y: p.y, arrow: dir },
        { arrow: transformDir(mode, dir) }
      );
    } else if (feature.type === 'plateDoor') {
      const i = Math.max(1, Math.min(bluePath.length - 3, idx(feature.ratio ?? 0.45)));
      const plate = bluePath[i];
      const door = bluePath[i + 1];
      const twinPlate = transformPoint(mode, plate, width, height);
      const twinDoor = transformPoint(mode, door, width, height);
      entities.push(
        { type: 'plate', id: `${spec.id}-pb`, x: plate.x, y: plate.y, doorId: `${spec.id}-db` },
        { type: 'door', id: `${spec.id}-db`, x: door.x, y: door.y },
        {
          type: 'plate',
          id: `${spec.id}-po`,
          x: twinPlate.x,
          y: twinPlate.y,
          doorId: `${spec.id}-do`
        },
        { type: 'door', id: `${spec.id}-do`, x: twinDoor.x, y: twinDoor.y }
      );
    } else if (feature.type === 'pulse') {
      const s = bluePath[idx(feature.switchRatio ?? 0.32)];
      const d = bluePath[idx(feature.doorRatio ?? 0.7)];
      const twinS = transformPoint(mode, s, width, height);
      const twinD = transformPoint(mode, d, width, height);
      const pairId = `${spec.id}-pulse`;
      entities.push(
        { type: 'pulseSwitch', pairId, x: s.x, y: s.y },
        { type: 'pulseSwitch', pairId, x: twinS.x, y: twinS.y },
        { type: 'pulseDoor', pairId, x: d.x, y: d.y },
        { type: 'pulseDoor', pairId, x: twinD.x, y: twinD.y }
      );
    } else if (feature.type === 'phaseDoor') {
      const p = bluePath[idx(feature.ratio ?? 0.5)];
      addPairedEntity(entities, mode, width, height, {
        type: 'phaseDoor',
        phase: feature.phase ?? 'ODD',
        x: p.x,
        y: p.y
      });
    } else if (feature.type === 'visionBeacon') {
      const p = bluePath[idx(feature.ratio ?? 0.45)];
      addPairedEntity(entities, mode, width, height, {
        type: 'visionBeacon',
        radius: feature.radius ?? 2,
        x: p.x,
        y: p.y
      });
    } else {
      throw new Error(`未知 feature: ${feature.type}`);
    }
  }
  return entities;
}

function buildLevel(spec) {
  const { width, height, bluePath } = geometry(spec);
  const orangePath = bluePath.map((p) => transformPoint(spec.mapping, p, width, height));
  const open = new Set([...bluePath, ...orangePath].map(key));

  if (open.size !== bluePath.length + orangePath.length) {
    throw new Error(`${spec.id} 双路径发生重叠，需扩大或调整地图`);
  }

  carveBranches(open, bluePath, spec.mapping, width, height, spec.branches ?? 2);
  const walls = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!open.has(`${x},${y}`)) walls.push({ x, y });
    }
  }

  const entities = featureEntities(spec, bluePath, width, height);
  return {
    schemaVersion: 1,
    id: spec.id,
    chapter: spec.chapter,
    order: spec.order,
    title: spec.title,
    initialMapping: spec.mapping,
    grid: { width, height },
    blueStart: bluePath[0],
    orangeStart: orangePath[0],
    blueExit: bluePath[bluePath.length - 1],
    orangeExit: orangePath[orangePath.length - 1],
    walls,
    entities,
    parMoves: 1,
    parMovesNote: '等待 BFS 回填',
    hint: { focus: spec.hint },
    tags: [`chapter-${spec.chapter}`, ...(spec.tags ?? ['M0'])],
    ...(spec.visibility ? { visibility: { mode: 'fog', radius: 1, ...spec.visibility } } : {})
  };
}

const fogBasic = { mode: 'fog', radius: 1, shape: 'square', memory: 'persistent', source: 'both' };

const specs = [
  { id:'level-021', chapter:3, order:21, title:'扩域起步', mapping:'H_MIRROR', axis:'H', laneLength:4, lanes:3, branches:2, features:[{type:'colorDoor',ratio:.34}], tags:['tutorial','M2','large-map'], hint:'地图变大后先认清双线的镜像长廊；专属门只是路标。', minPar:13 },
  { id:'level-022', chapter:3, order:22, title:'纵向回环', mapping:'V_MIRROR', axis:'V', laneLength:4, lanes:3, branches:2, features:[{type:'oneWay',ratio:.48}], tags:['M5','large-map'], hint:'垂直镜像会让橙球上下相反，沿蛇形长廊观察两条路线。', minPar:13 },
  { id:'level-023', chapter:3, order:23, title:'暂停长廊', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:3, branches:3, features:[{type:'pauseTile',ratio:.42},{type:'fragile',ratio:.68}], tags:['M3','M7','large-map'], hint:'暂停令牌会插入一个节拍；脆弱格让回头路变得昂贵。', minPar:16 },
  { id:'level-024', chapter:3, order:24, title:'门锁折返', mapping:'V_MIRROR', axis:'V', laneLength:5, lanes:3, branches:3, features:[{type:'plateDoor',ratio:.46}], tags:['M1','large-map'], hint:'压板先开门，再利用长路径保持两球同步推进。', minPar:15 },
  { id:'level-025', chapter:3, order:25, title:'脉冲远征', mapping:'H_MIRROR', axis:'H', laneLength:4, lanes:4, branches:3, features:[{type:'pulse',switchRatio:.3,doorRatio:.72}], tags:['M8','large-map'], hint:'先让双球同时经过脉冲开关，再进入后半段长廊。', minPar:18 },
  { id:'level-026', chapter:3, order:26, title:'旋转象限', mapping:'ROTATE_CW', axis:'R', laneLength:4, lanes:3, branches:3, features:[{type:'oneWay',ratio:.38},{type:'fragile',ratio:.7}], tags:['M4','M5','M7','large-map'], hint:'橙球轨迹是蓝球轨迹的顺时针旋转；把路线当成两个象限来读。', minPar:13 },
  { id:'level-027', chapter:3, order:27, title:'双门深行', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:4, branches:4, features:[{type:'colorDoor',ratio:.25},{type:'plateDoor',ratio:.58}], tags:['M1','M2','large-map'], hint:'前段识别专属门，后段再用压板门完成长距离同步。', minPar:22 },
  { id:'level-028', chapter:3, order:28, title:'纵轴节拍', mapping:'V_MIRROR', axis:'V', laneLength:4, lanes:4, branches:4, features:[{type:'pauseTile',ratio:.3},{type:'oneWay',ratio:.67}], tags:['M3','M5','large-map'], hint:'暂停产生额外回合，随后要按单向格继续纵向镜像。', minPar:19 },
  { id:'level-029', chapter:3, order:29, title:'回路封痕', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:4, branches:4, features:[{type:'fragile',ratio:.28},{type:'fragile',ratio:.61},{type:'pulse',switchRatio:.38,doorRatio:.82}], tags:['M7','M8','large-map'], hint:'两段脆弱路封住退路，脉冲门要求你在深入前建立同步。', minPar:22 },
  { id:'level-030', chapter:3, order:30, title:'扩域综合', mapping:'ROTATE_CW', axis:'R', laneLength:5, lanes:3, branches:4, features:[{type:'colorDoor',ratio:.22},{type:'pauseTile',ratio:.44},{type:'pulse',switchRatio:.58,doorRatio:.8}], tags:['M2','M3','M8','chapter-final','large-map'], hint:'在旋转映射的大地图中串联专属门、暂停和脉冲。', minPar:17 },

  { id:'level-031', chapter:4, order:31, title:'九宫初探', mapping:'H_MIRROR', axis:'H', laneLength:4, lanes:3, branches:4, features:[{type:'colorDoor',ratio:.45}], tags:['tutorial','M2','V1-fog','exploration'], visibility:fogBasic, hint:'本章全程探索迷雾：每个球只能照亮自身九宫格，走过的区域会留下记忆。', minPar:13 },
  { id:'level-032', chapter:4, order:32, title:'无痕暗域', mapping:'V_MIRROR', axis:'V', laneLength:4, lanes:3, branches:4, features:[{type:'oneWay',ratio:.52}], tags:['M5','V1-fog','fog-no-memory','exploration'], visibility:{...fogBasic,memory:'none'}, hint:'无痕迷雾不会保留旧地图；记住转角和单向格的位置。', minPar:13 },
  { id:'level-033', chapter:4, order:33, title:'衰减记忆', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:3, branches:5, features:[{type:'fragile',ratio:.58}], tags:['M7','V1-fog','fog-decay','exploration'], visibility:{...fogBasic,memory:'decay',memoryTurns:3}, hint:'旧视野三回合后重新隐去；脆弱格同时切断已经走过的路。', minPar:16 },
  { id:'level-034', chapter:4, order:34, title:'双生交替', mapping:'V_MIRROR', axis:'V', laneLength:5, lanes:3, branches:5, features:[{type:'pauseTile',ratio:.4}], tags:['M3','V1-fog','fog-alternating','exploration'], visibility:{...fogBasic,source:'alternating'}, hint:'蓝、橙视野按回合交替出现；用暂停节拍把注意力切到需要观察的一侧。', minPar:16 },
  { id:'level-035', chapter:4, order:35, title:'菱镜视界', mapping:'H_MIRROR', axis:'H', laneLength:4, lanes:4, branches:5, features:[{type:'oneWay',ratio:.36},{type:'colorDoor',ratio:.7}], tags:['M2','M5','V1-fog','fog-diamond','exploration'], visibility:{...fogBasic,shape:'diamond'}, hint:'视野从九宫格收束为菱形，转角处的信息更少。', minPar:18 },
  { id:'level-036', chapter:4, order:36, title:'十字探路', mapping:'V_MIRROR', axis:'V', laneLength:4, lanes:4, branches:5, features:[{type:'plateDoor',ratio:.55}], tags:['M1','V1-fog','fog-cross','exploration'], visibility:{...fogBasic,shape:'cross',memory:'decay',memoryTurns:4}, hint:'十字视野看得远但看不到斜角，利用压板门判断长廊结构。', minPar:18 },
  { id:'level-037', chapter:4, order:37, title:'周期雷达', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:4, branches:6, features:[{type:'fragile',ratio:.33},{type:'oneWay',ratio:.72}], tags:['M5','M7','V1-fog','fog-radar','exploration'], visibility:{...fogBasic,memory:'none',pulseEvery:5,pulseRadius:16}, hint:'每五个有效回合雷达会闪现全局视野；在脉冲之间记住岔路。', minPar:22 },
  { id:'level-038', chapter:4, order:38, title:'点亮信标', mapping:'V_MIRROR', axis:'V', laneLength:5, lanes:4, branches:6, features:[{type:'visionBeacon',ratio:.28,radius:2},{type:'visionBeacon',ratio:.66,radius:2}], tags:['M0','V1-fog','V2-beacon','exploration'], visibility:{...fogBasic,memory:'decay',memoryTurns:2}, hint:'踩过青色信标后，它周围的区域会永久点亮，建立属于你的地图锚点。', minPar:22 },
  { id:'level-039', chapter:4, order:39, title:'一明一暗', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:4, branches:6, features:[{type:'visionBeacon',ratio:.42,radius:2},{type:'pauseTile',ratio:.62}], tags:['M3','V1-fog','V2-beacon','fog-alternating','exploration'], visibility:{...fogBasic,source:'alternating',memory:'decay',memoryTurns:2}, hint:'交替视野与衰减记忆叠加；信标是不会消失的参照物。', minPar:22 },
  { id:'level-040', chapter:4, order:40, title:'暗域全景', mapping:'ROTATE_CW', axis:'R', laneLength:5, lanes:3, branches:6, features:[{type:'visionBeacon',ratio:.25,radius:2},{type:'visionBeacon',ratio:.6,radius:3},{type:'pulse',switchRatio:.38,doorRatio:.78}], tags:['M8','V1-fog','V2-beacon','fog-radar','chapter-final','exploration'], visibility:{...fogBasic,shape:'diamond',memory:'decay',memoryTurns:3,pulseEvery:6,pulseRadius:20}, hint:'最终暗域同时包含菱形视野、衰减记忆、信标和周期雷达。', minPar:16 },

  { id:'level-041', chapter:5, order:41, title:'奇相之门', mapping:'H_MIRROR', axis:'H', laneLength:4, lanes:4, branches:3, features:[{type:'phaseDoor',ratio:.48,phase:'ODD'}], tags:['tutorial','M9','phase'], hint:'紫色相位门只允许对应奇偶回合进入；被挡住的回合也会推进节拍。', minPar:18 },
  { id:'level-042', chapter:5, order:42, title:'偶相折线', mapping:'V_MIRROR', axis:'V', laneLength:4, lanes:4, branches:3, features:[{type:'phaseDoor',ratio:.35,phase:'EVEN'},{type:'oneWay',ratio:.68}], tags:['M5','M9','phase'], hint:'先对齐偶数相位，再遵守单向格离开方向。', minPar:18 },
  { id:'level-043', chapter:5, order:43, title:'双色相位', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:4, branches:4, features:[{type:'colorDoor',ratio:.22},{type:'phaseDoor',ratio:.52,phase:'ODD'},{type:'phaseDoor',ratio:.76,phase:'EVEN'}], tags:['M2','M9','phase'], hint:'同一路线连续出现奇相与偶相门，专属门帮助确认双方所在支路。', minPar:22 },
  { id:'level-044', chapter:5, order:44, title:'暂停校相', mapping:'V_MIRROR', axis:'V', laneLength:5, lanes:4, branches:4, features:[{type:'pauseTile',ratio:.27},{type:'phaseDoor',ratio:.58,phase:'EVEN'}], tags:['M3','M9','phase'], hint:'暂停令牌会额外消耗一回合，可用来改变抵达相位门时的奇偶。', minPar:23 },
  { id:'level-045', chapter:5, order:45, title:'坍塌时钟', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:4, branches:5, features:[{type:'fragile',ratio:.26},{type:'phaseDoor',ratio:.48,phase:'ODD'},{type:'fragile',ratio:.72}], tags:['M7','M9','phase'], hint:'脆弱路逼你向前，而相位门可能要求现场等待一个节拍。', minPar:22 },
  { id:'level-046', chapter:5, order:46, title:'脉冲拍点', mapping:'ROTATE_CW', axis:'R', laneLength:5, lanes:3, branches:4, features:[{type:'pulse',switchRatio:.3,doorRatio:.72},{type:'phaseDoor',ratio:.55,phase:'EVEN'}], tags:['M8','M9','phase'], hint:'先同步点亮脉冲，再把旋转路线的回合数对齐偶相门。', minPar:16 },
  { id:'level-047', chapter:5, order:47, title:'长廊换拍', mapping:'V_MIRROR', axis:'V', laneLength:5, lanes:4, branches:5, features:[{type:'oneWay',ratio:.25},{type:'phaseDoor',ratio:.5,phase:'ODD'},{type:'pauseTile',ratio:.74}], tags:['M3','M5','M9','phase','large-map'], hint:'长地图上先锁定单向方向，中段校相，后段暂停再次改变节拍。', minPar:23 },
  { id:'level-048', chapter:5, order:48, title:'门阵节拍', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:4, branches:5, features:[{type:'plateDoor',ratio:.3},{type:'phaseDoor',ratio:.58,phase:'EVEN'},{type:'colorDoor',ratio:.78}], tags:['M1','M2','M9','phase','large-map'], hint:'压板门、相位门和专属门连续出现，别只盯着空间位置，还要数回合。', minPar:22 },
  { id:'level-049', chapter:5, order:49, title:'终局预演', mapping:'V_MIRROR', axis:'V', laneLength:5, lanes:4, branches:6, features:[{type:'fragile',ratio:.2},{type:'pulse',switchRatio:.34,doorRatio:.8},{type:'phaseDoor',ratio:.58,phase:'ODD'},{type:'oneWay',ratio:.7}], tags:['M5','M7','M8','M9','phase','final-preview'], hint:'脆弱格、同步脉冲、相位门、单向格四种约束连续叠加。', minPar:22 },
  { id:'level-050', chapter:5, order:50, title:'双生终极折线', mapping:'H_MIRROR', axis:'H', laneLength:5, lanes:4, branches:6, features:[{type:'colorDoor',ratio:.16},{type:'pauseTile',ratio:.3},{type:'fragile',ratio:.44},{type:'phaseDoor',ratio:.58,phase:'EVEN'},{type:'pulse',switchRatio:.68,doorRatio:.86}], tags:['M2','M3','M7','M8','M9','phase','final','chapter-final'], hint:'最后一关把长路径、暂停、坍塌、相位和脉冲合在同一条双生折线中。', minPar:24 }
];

function solveAndWrite(spec) {
  const level = buildLevel(spec);
  const result = bfsSolve(level, { maxNodes: 500_000, maxDepth: 100 });
  if (!result.solvable || result.budgetExhausted) {
    throw new Error(`${spec.id} 求解失败: ${result.reason ?? 'unknown'}`);
  }
  if (result.optimalSteps < spec.minPar) {
    throw new Error(`${spec.id} 最短解过短: ${result.optimalSteps} < ${spec.minPar}`);
  }
  level.parMoves = result.optimalSteps;
  level.parMovesNote = `BFS 最短步数=${result.optimalSteps}；生成器强制 parMoves 与最优解一致`;

  const chapterDir = resolve(ROOT, 'levels', `chapter-${String(spec.chapter).padStart(2, '0')}`);
  mkdirSync(chapterDir, { recursive: true });
  const path = resolve(chapterDir, `${spec.id}.json`);
  writeFileSync(path, `${JSON.stringify(level, null, 2)}\n`, 'utf8');
  return {
    id: spec.id,
    chapter: spec.chapter,
    grid: `${level.grid.width}x${level.grid.height}`,
    optimalSteps: result.optimalSteps,
    statesVisited: result.statesVisited,
    solutionCount: result.solutionCount,
    solution: result.solution.join(' '),
    visibility: level.visibility ?? null,
    featureTypes: [...new Set(level.entities.map((e) => e.type))]
  };
}

function average(rows) {
  return rows.reduce((sum, row) => sum + row.optimalSteps, 0) / rows.length;
}

function updateDecisionLog() {
  const path = resolve(ROOT, 'docs', 'decision-log.md');
  let text = readFileSync(path, 'utf8');
  if (!text.includes('| ADR-019 |')) {
    const marker = '| ADR-016 | M7 坍塌对穿精化：D2 后格上有角色则不坍塌 | accepted | 2026-08-24 |';
    const row = '\n| ADR-019 | M9 回合相位门与探索章节扩展               | accepted | 2026-08-27 |';
    text = text.includes(marker) ? text.replace(marker, marker + row) : text;
  }
  if (!text.includes('# ADR-019：M9 回合相位门与探索章节扩展')) {
    text += `\n\n---\n\n# ADR-019：M9 回合相位门与探索章节扩展\n\n- 日期：2026-08-27\n- 状态：accepted\n- 影响需求：M9、CONTENT 21–50、第四章探索玩法\n- 影响阶段：阶段 14 与 15 之间计划外重制\n\n## 背景\n\n原 21–50 关平均最短解过短，且九宫格迷雾只零散插入个别关卡，无法形成章节身份。用户要求后 30 关整体重制、修正错误目标步数，并增加与信息不完全有关的新玩法。\n\n## 候选方案\n\n1. 仅放大旧地图并保留原最短解；工程成本低，但复杂度和新鲜感基本不变。\n2. 后 30 关全部重建为长路径大地图；第四章完整采用探索迷雾并逐关叠加记忆衰减、交替视野、视野形状、雷达和信标；第五章新增 M9 回合相位门。\n\n## 决策\n\n采用方案 2。M9 相位门按“即将执行的有效回合序号奇偶”决定能否进入；阻挡仍算有效回合，因此玩家可以通过等待校相。BFS 哈希在含 M9 的关卡中纳入回合奇偶。探索规则仍属于信息呈现层，不改变移动几何和胜利判定。\n\n## 理由与证据\n\n整章统一迷雾能建立清晰的章节主题；视野规则的渐进变化提供不同于传统双球同步迷宫的策略维度。M9 则把时间/节拍加入状态空间，能在不破坏既有 R-01~R-07 的前提下增加真正的逻辑约束。\n\n## 后果\n\n21–50 关由确定性生成器重制；parMoves 必须逐关等于 BFS 最短步数；CI 增加后 30 关平均最短解门槛和第四章全迷雾断言。\n\n## 复查条件\n\n若真人试玩显示 M9 奇偶理解成本过高，优先强化视觉节拍提示而不是删除状态约束；若 13–15 格地图在小屏上可读性不足，再调整棋盘缩放和机关纹理密度。\n`;
  }
  writeFileSync(path, text, 'utf8');
}

function updateProjectState(stats) {
  const path = resolve(ROOT, '.ai', 'project-state.md');
  let text = readFileSync(path, 'utf8');
  const bullet = `- 计划外迭代（2026-08-27，后 30 关重制）：level-021..050 全量重建为大地图长路径；第四章 031..040 全章探索迷雾，逐关加入无痕/衰减记忆、交替视野、菱形/十字视野、雷达与信标；第五章新增 M9 奇偶相位门。parMoves 全部由 BFS 自动回填并强制等于最短步数；21–50 平均最优步数 ${stats.averageLate.toFixed(2)}。报告：reports/late-game-redesign-summary.md。`;
  if (!text.includes('计划外迭代（2026-08-27，后 30 关重制）')) {
    text = text.replace('## 当前事实\n', `## 当前事实\n\n${bullet}\n`);
    writeFileSync(path, text, 'utf8');
  }
}

const rows = specs.map(solveAndWrite);
const byChapter = [3, 4, 5].map((chapter) => {
  const items = rows.filter((row) => row.chapter === chapter);
  return { chapter, average: average(items), min: Math.min(...items.map((r) => r.optimalSteps)), max: Math.max(...items.map((r) => r.optimalSteps)) };
});
const stats = { averageLate: average(rows), byChapter };

if (stats.averageLate < 18) throw new Error(`后 30 关平均最优解过短: ${stats.averageLate.toFixed(2)} < 18`);
if (rows.filter((r) => r.chapter === 4 && r.visibility?.mode === 'fog').length !== 10) {
  throw new Error('第四章并非 10/10 关启用探索迷雾');
}

mkdirSync(resolve(ROOT, 'reports'), { recursive: true });
writeFileSync(
  resolve(ROOT, 'reports', 'late-game-redesign-summary.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), ...stats, levels: rows }, null, 2)}\n`,
  'utf8'
);

const markdown = [
  '# 后 30 关重制验收报告',
  '',
  `- 关卡范围：level-021..050（${rows.length} 关）`,
  `- 平均 BFS 最优步数：${stats.averageLate.toFixed(2)}`,
  '- parMoves：逐关由 BFS 自动回填，禁止人工猜测',
  '- 第四章：10/10 关启用探索迷雾',
  '- 新玩法：无痕迷雾、衰减记忆、交替视野、菱形视野、十字视野、周期雷达、视野信标、M9 奇偶相位门',
  '',
  '## 分章统计',
  '',
  '| 章节 | 平均最优步数 | 最短 | 最长 |',
  '|---:|---:|---:|---:|',
  ...byChapter.map((x) => `| ${x.chapter} | ${x.average.toFixed(2)} | ${x.min} | ${x.max} |`),
  '',
  '## 逐关数据',
  '',
  '| 关卡 | 地图 | 最优步数 | 搜索状态 | 最短解数量 |',
  '|---|---:|---:|---:|---:|',
  ...rows.map((x) => `| ${x.id} | ${x.grid} | ${x.optimalSteps} | ${x.statesVisited} | ${x.solutionCount} |`),
  ''
].join('\n');
writeFileSync(resolve(ROOT, 'reports', 'late-game-redesign-summary.md'), markdown, 'utf8');
updateDecisionLog();
updateProjectState(stats);

console.log(`redesigned ${rows.length} levels; average optimal=${stats.averageLate.toFixed(2)}`);
for (const chapter of byChapter) {
  console.log(`chapter ${chapter.chapter}: avg=${chapter.average.toFixed(2)} min=${chapter.min} max=${chapter.max}`);
}
