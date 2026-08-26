#!/usr/bin/env node
// Round 2: Redesign failed levels with multiple candidates
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const solver = require('../../../tools-dist/solver.mjs');

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '.');

// Each level redesign: { id, title, chapter, order, candidates: [{ desc, ...levelData }] }
const redesigns = [];

// ===== level-014 压板二次利用 =====
// Need: plates must actually affect door state in solution
redesigns.push({
  id: 'level-014', title: '压板二次利用', chapter: 2, order: 14,
  candidates: [
    {
      desc: '蓝橙各自踩板为对方开门后交换位置',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 2, y: 4 },
        { type: 'plate', id: 'p2', x: 5, y: 4, doorId: 'd2' },
        { type: 'door', id: 'd2', x: 3, y: 4 }
      ],
      hint: { focus: '蓝踩板开左门让橙通过，橙踩板开右门让蓝通过：交替配合' },
      tags: ['chapter-2', 'tutorial', 'M1', 'reuse-plate']
    },
    {
      desc: '单压板需多次利用',
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
      hint: { focus: '两个压板分别控制两扇门，蓝和橙需要互相配合通过' },
      tags: ['chapter-2', 'tutorial', 'M1', 'reuse-plate']
    }
  ]
});

// ===== level-019 双压板双门 =====
redesigns.push({
  id: 'level-019', title: '双压板双门', chapter: 2, order: 19,
  candidates: [
    {
      desc: '蓝踩板开橙门，橙踩板开蓝门，蓝还需过专属门',
      grid: { width: 7, height: 4 },
      blueStart: { x: 0, y: 2 }, orangeStart: { x: 6, y: 2 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
      walls: [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 4, y: 0 }, { x: 4, y: 1 }],
      entities: [
        { type: 'plate', id: 'p1', x: 0, y: 2, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 2, y: 2 },
        { type: 'plate', id: 'p2', x: 6, y: 2, doorId: 'd2' },
        { type: 'door', id: 'd2', x: 4, y: 2 },
        { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' }
      ],
      hint: { focus: '两个压板开两扇门，橙还需通过专属门' },
      tags: ['chapter-2', 'M1', 'M2', 'dual-plate']
    },
    {
      desc: '对称双压板双门布局',
      grid: { width: 7, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
      entities: [
        { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 2, y: 4 },
        { type: 'colorDoor', x: 3, y: 2, color: 'BLUE' },
        { type: 'plate', id: 'p2', x: 6, y: 4, doorId: 'd2' },
        { type: 'door', id: 'd2', x: 4, y: 4 }
      ],
      hint: { focus: '蓝踩板为橙开门，橙踩板为蓝开门，中间还有蓝的专属门' },
      tags: ['chapter-2', 'M1', 'M2', 'dual-plate']
    }
  ]
});

// ===== level-020 第二章综合 =====
redesigns.push({
  id: 'level-020', title: '第二章综合', chapter: 2, order: 20,
  candidates: [
    {
      desc: '墙体+压板门+专属门组合',
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
      hint: { focus: '综合运用墙、压板门和专属门：找到两人各自的路径' },
      tags: ['chapter-2', 'M0', 'M1', 'M2', 'chapter-final']
    },
    {
      desc: '非对称布局，需交替踩板',
      grid: { width: 7, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 2, y: 4 },
        { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
        { type: 'plate', id: 'p2', x: 6, y: 4, doorId: 'd2' },
        { type: 'door', id: 'd2', x: 4, y: 4 }
      ],
      hint: { focus: '压板门和专属门的组合，需要双方配合' },
      tags: ['chapter-2', 'M0', 'M1', 'M2', 'chapter-final']
    }
  ]
});

// ===== level-025 专属门与暂停 =====
redesigns.push({
  id: 'level-025', title: '专属门与暂停', chapter: 3, order: 25,
  candidates: [
    {
      desc: '橙需暂停等蓝通过专属门',
      grid: { width: 5, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }],
      entities: [
        { type: 'colorDoor', x: 2, y: 3, color: 'ORANGE' },
        { type: 'colorDoor', x: 2, y: 0, color: 'BLUE' },
        { type: 'pauseTile', x: 4, y: 2 }
      ],
      hint: { focus: '橙需要暂停等蓝先走，蓝需要通过专属门' },
      tags: ['chapter-3', 'M2', 'M3', 'colordoor-pause']
    },
    {
      desc: '蓝需暂停等橙通过专属门',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
        { type: 'pauseTile', x: 0, y: 2 }
      ],
      hint: { focus: '蓝暂停让橙先通过专属门，橙再等蓝' },
      tags: ['chapter-3', 'M2', 'M3', 'colordoor-pause']
    }
  ]
});

// ===== level-027 两种映射分段 =====
redesigns.push({
  id: 'level-027', title: '两种映射分段', chapter: 3, order: 27,
  candidates: [
    {
      desc: '需切换映射才能通过狭窄通道',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 2, y: 0 }, orangeExit: { x: 3, y: 0 },
      walls: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 0, y: 2 }, { x: 5, y: 2 }],
      entities: [
        { type: 'switcher', x: 0, y: 4, target: 'V_MIRROR' }
      ],
      hint: { focus: '切换为垂直镜像后，左右同向才能让两人同时通过' },
      tags: ['chapter-3', 'tutorial', 'M4', 'dual-mapping']
    },
    {
      desc: '水平镜像→垂直镜像切换',
      grid: { width: 5, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
      blueExit: { x: 2, y: 0 }, orangeExit: { x: 2, y: 4 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'switcher', x: 0, y: 2, target: 'V_MIRROR' }
      ],
      hint: { focus: '切换映射后，两人才能同时到达各自出口' },
      tags: ['chapter-3', 'tutorial', 'M4', 'dual-mapping']
    }
  ]
});

// ===== level-028 暂停切换映射 =====
redesigns.push({
  id: 'level-028', title: '暂停切换映射', chapter: 3, order: 28,
  candidates: [
    {
      desc: '先暂停再切换映射',
      grid: { width: 5, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'pauseTile', x: 0, y: 2 },
        { type: 'switcher', x: 4, y: 2, target: 'V_MIRROR' }
      ],
      hint: { focus: '先拿暂停，再切换映射：两个操作配合使用' },
      tags: ['chapter-3', 'M3', 'M4', 'pause-switch']
    },
    {
      desc: '暂停后切换映射让橙能通过',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'pauseTile', x: 0, y: 2 },
        { type: 'switcher', x: 3, y: 2, target: 'V_MIRROR' }
      ],
      hint: { focus: '暂停让蓝等待，切换映射让橙能同步移动' },
      tags: ['chapter-3', 'M3', 'M4', 'pause-switch']
    }
  ]
});

// ===== level-030 第三章综合 =====
redesigns.push({
  id: 'level-030', title: '第三章综合', chapter: 3, order: 30,
  candidates: [
    {
      desc: '压板+专属门+暂停+切换',
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
      hint: { focus: '综合运用压板门、专属门、暂停和映射切换' },
      tags: ['chapter-3', 'M1', 'M2', 'M3', 'M4', 'chapter-final']
    },
    {
      desc: '简化版：压板+暂停+切换',
      grid: { width: 7, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 2, y: 4 },
        { type: 'pauseTile', x: 6, y: 2 },
        { type: 'switcher', x: 3, y: 2, target: 'V_MIRROR' }
      ],
      hint: { focus: '压板开门、暂停配合、切换映射的综合运用' },
      tags: ['chapter-3', 'M1', 'M3', 'M4', 'chapter-final']
    }
  ]
});

// ===== level-032 单向固定下一步 =====
redesigns.push({
  id: 'level-032', title: '单向固定下一步', chapter: 4, order: 32,
  candidates: [
    {
      desc: '单向格限制路线选择',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 0, y: 2 }, { x: 5, y: 2 }],
      entities: [
        { type: 'oneWay', x: 1, y: 2, arrow: 'UP' },
        { type: 'oneWay', x: 4, y: 2, arrow: 'UP' }
      ],
      hint: { focus: '单向格只能向上离开：规划好路线' },
      tags: ['chapter-4', 'tutorial', 'M5', 'oneway-next']
    },
    {
      desc: '单向格约束路径',
      grid: { width: 5, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
      walls: [{ x: 2, y: 2 }],
      entities: [
        { type: 'oneWay', x: 1, y: 2, arrow: 'RIGHT' },
        { type: 'oneWay', x: 3, y: 2, arrow: 'LEFT' }
      ],
      hint: { focus: '单向格让蓝只能向右，橙只能向左离开' },
      tags: ['chapter-4', 'tutorial', 'M5', 'oneway-next']
    }
  ]
});

// ===== level-033 两类解耦 =====
redesigns.push({
  id: 'level-033', title: '两类解耦', chapter: 4, order: 33,
  candidates: [
    {
      desc: '暂停+单向格',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }],
      entities: [
        { type: 'oneWay', x: 1, y: 2, arrow: 'UP' },
        { type: 'pauseTile', x: 0, y: 2 }
      ],
      hint: { focus: '暂停让蓝停下，单向格让橙只能向上' },
      tags: ['chapter-4', 'M3', 'M5', 'pause-oneway']
    },
    {
      desc: '单向格+暂停非对称',
      grid: { width: 5, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'oneWay', x: 1, y: 2, arrow: 'RIGHT' },
        { type: 'pauseTile', x: 4, y: 2 }
      ],
      hint: { focus: '橙暂停等蓝，蓝必须通过单向格' },
      tags: ['chapter-4', 'M3', 'M5', 'pause-oneway']
    }
  ]
});

// ===== level-035 门后单向约束 =====
redesigns.push({
  id: 'level-035', title: '门后单向约束', chapter: 4, order: 35,
  candidates: [
    {
      desc: '压板开门后过单向格',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 0 }, { x: 2, y: 1 }],
      entities: [
        { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 2, y: 2 },
        { type: 'oneWay', x: 3, y: 2, arrow: 'UP' }
      ],
      hint: { focus: '先开门再通过单向格，顺序不能错' },
      tags: ['chapter-4', 'M1', 'M5', 'door-oneway']
    },
    {
      desc: '门后单向格限制路径',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 0 }, { x: 2, y: 1 }],
      entities: [
        { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 2, y: 3 },
        { type: 'oneWay', x: 2, y: 3, arrow: 'UP' }
      ],
      hint: { focus: '压板开门后，门的位置就是单向格' },
      tags: ['chapter-4', 'M1', 'M5', 'door-oneway']
    }
  ]
});

// ===== level-039 控制传送回合 =====
redesigns.push({
  id: 'level-039', title: '控制传送回合', chapter: 4, order: 39,
  candidates: [
    {
      desc: '暂停控制传送时机',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
        { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 1, y: 4, end: 'A' },
        { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
        { type: 'portal', portalId: 'q', x: 4, y: 4, end: 'A' },
        { type: 'portal', portalId: 'q', x: 4, y: 1, end: 'B' },
        { type: 'pauseTile', x: 0, y: 3 }
      ],
      hint: { focus: '用暂停控制传送时机：站上传送门才能传送' },
      tags: ['chapter-4', 'M3', 'M6', 'portal-timing']
    },
    {
      desc: '暂停+传送+切换',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
        { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 1, y: 4, end: 'A' },
        { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
        { type: 'portal', portalId: 'q', x: 4, y: 4, end: 'A' },
        { type: 'portal', portalId: 'q', x: 4, y: 1, end: 'B' },
        { type: 'pauseTile', x: 0, y: 3 },
        { type: 'switcher', x: 3, y: 3, target: 'V_MIRROR' }
      ],
      hint: { focus: '暂停、传送和映射切换组合使用' },
      tags: ['chapter-4', 'M3', 'M4', 'M6', 'portal-timing']
    }
  ]
});

// ===== level-040 第四章综合 =====
redesigns.push({
  id: 'level-040', title: '第四章综合', chapter: 4, order: 40,
  candidates: [
    {
      desc: '传送+单向+切换',
      grid: { width: 7, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
      walls: [
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
        { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 1, y: 3, end: 'A' },
        { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
        { type: 'oneWay', x: 1, y: 1, arrow: 'RIGHT' },
        { type: 'switcher', x: 3, y: 2, target: 'V_MIRROR' },
        { type: 'plate', id: 'p1', x: 3, y: 4, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 4, y: 2 }
      ],
      hint: { focus: '综合运用传送、单向格、映射切换和压板门' },
      tags: ['chapter-4', 'M1', 'M4', 'M5', 'M6', 'chapter-final']
    },
    {
      desc: '传送+单向+切换+压板',
      grid: { width: 7, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
      walls: [
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
        { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }
      ],
      entities: [
        { type: 'portal', portalId: 'p', x: 1, y: 3, end: 'A' },
        { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
        { type: 'oneWay', x: 1, y: 1, arrow: 'RIGHT' },
        { type: 'switcher', x: 3, y: 2, target: 'V_MIRROR' },
        { type: 'plate', id: 'p1', x: 3, y: 4, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 4, y: 2 }
      ],
      hint: { focus: '传送绕开墙，单向格限制方向，切换映射调整路线' },
      tags: ['chapter-4', 'M1', 'M4', 'M5', 'M6', 'chapter-final']
    }
  ]
});

// ===== level-042 脆弱格变临时墙 =====
redesigns.push({
  id: 'level-042', title: '脆弱格变临时墙', chapter: 5, order: 42,
  candidates: [
    {
      desc: '必经脆弱格，需规划路线',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 0, y: 2 }, { x: 5, y: 2 }],
      entities: [
        { type: 'fragile', x: 1, y: 2 },
        { type: 'fragile', x: 4, y: 2 }
      ],
      hint: { focus: '脆弱格离开即坍塌，必须规划好一次性通过路径' },
      tags: ['chapter-5', 'tutorial', 'M7', 'fragile-wall']
    },
    {
      desc: '单脆弱格需绕行',
      grid: { width: 5, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 0, y: 2 }, { x: 4, y: 2 }],
      entities: [
        { type: 'fragile', x: 1, y: 2 }
      ],
      hint: { focus: '蓝必须经过脆弱格，一脚踏出便无法回头' },
      tags: ['chapter-5', 'tutorial', 'M7', 'fragile-wall']
    }
  ]
});

// ===== level-043 暂停决定消耗者 =====
redesigns.push({
  id: 'level-043', title: '暂停决定消耗者', chapter: 5, order: 43,
  candidates: [
    {
      desc: '暂停让蓝不踩脆弱格',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'fragile', x: 1, y: 2 },
        { type: 'pauseTile', x: 0, y: 2 }
      ],
      hint: { focus: '蓝暂停不踩脆弱格，让橙先过桥' },
      tags: ['chapter-5', 'M3', 'M7', 'pause-fragile']
    },
    {
      desc: '暂停决定谁踩脆弱格',
      grid: { width: 5, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 4, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 4, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'fragile', x: 1, y: 2 },
        { type: 'pauseTile', x: 4, y: 2 }
      ],
      hint: { focus: '谁拿暂停谁就不踩脆弱格：用暂停控制谁先过桥' },
      tags: ['chapter-5', 'M3', 'M7', 'pause-fragile']
    }
  ]
});

// ===== level-044 不可回头路 =====
// Fix: oneWay must affect solution
redesigns.push({
  id: 'level-044', title: '不可回头路', chapter: 5, order: 44,
  candidates: [
    {
      desc: '保留原设计但调整布局使单向格生效',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [
        { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 },
        { x: 2, y: 3 }, { x: 2, y: 4 },
        { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 },
        { x: 3, y: 3 }, { x: 3, y: 4 }
      ],
      entities: [
        { type: 'fragile', x: 0, y: 3 },
        { type: 'fragile', x: 0, y: 2 },
        { type: 'fragile', x: 1, y: 1 },
        { type: 'fragile', x: 5, y: 3 },
        { type: 'fragile', x: 5, y: 2 },
        { type: 'fragile', x: 4, y: 1 },
        { type: 'oneWay', x: 0, y: 1, arrow: 'DOWN' },
        { type: 'oneWay', x: 5, y: 1, arrow: 'DOWN' }
      ],
      hint: { focus: '身后脆弱格会碎、单向格只许向前：规划好再走' },
      tags: ['chapter-5', 'combo', 'M5', 'M7', 'no-return']
    }
  ]
});

// ===== level-045 变化棋盘 =====
redesigns.push({
  id: 'level-045', title: '变化棋盘', chapter: 5, order: 45,
  candidates: [
    {
      desc: '切换映射+压板+脆弱格',
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
      hint: { focus: '切换映射、压板开门、脆弱格不可回头' },
      tags: ['chapter-5', 'M1', 'M4', 'M7', 'changing-board']
    },
    {
      desc: '切换映射后压板开门',
      grid: { width: 6, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 5, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 5, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 0, y: 2 }, { x: 5, y: 2 }],
      entities: [
        { type: 'switcher', x: 0, y: 4, target: 'V_MIRROR' },
        { type: 'plate', id: 'p1', x: 3, y: 2, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 4, y: 2 },
        { type: 'fragile', x: 1, y: 2 }
      ],
      hint: { focus: '切换映射后两人同向，蓝踩板开门，脆弱格无法回头' },
      tags: ['chapter-5', 'M1', 'M4', 'M7', 'changing-board']
    }
  ]
});

// ===== level-048 传送映射同步 =====
redesigns.push({
  id: 'level-048', title: '传送映射同步', chapter: 5, order: 48,
  candidates: [
    {
      desc: '传送+脉冲+切换',
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
      hint: { focus: '传送、映射切换和脉冲同步组合使用' },
      tags: ['chapter-5', 'M4', 'M6', 'M8', 'portal-map-pulse']
    },
    {
      desc: '传送+脉冲，需同步',
      grid: { width: 7, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
      walls: [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 6, y: 1 }],
      entities: [
        { type: 'portal', portalId: 'p', x: 1, y: 3, end: 'A' },
        { type: 'portal', portalId: 'p', x: 1, y: 1, end: 'B' },
        { type: 'portal', portalId: 'q', x: 5, y: 3, end: 'A' },
        { type: 'portal', portalId: 'q', x: 5, y: 1, end: 'B' },
        { type: 'pulseSwitch', pairId: 'p1', x: 1, y: 4 },
        { type: 'pulseSwitch', pairId: 'p1', x: 5, y: 4 },
        { type: 'pulseDoor', pairId: 'p1', x: 3, y: 1 }
      ],
      hint: { focus: '传送穿过墙后，需同时站上脉冲开关开门' },
      tags: ['chapter-5', 'M6', 'M8', 'portal-pulse']
    }
  ]
});

// ===== level-049 终极预演 =====
redesigns.push({
  id: 'level-049', title: '终极预演', chapter: 5, order: 49,
  candidates: [
    {
      desc: '专属门+暂停+脆弱格',
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
      hint: { focus: '专属门、暂停和脆弱格的终极组合' },
      tags: ['chapter-5', 'M2', 'M3', 'M7', 'final-preview']
    },
    {
      desc: '暂停+专属门+脆弱格，需多种操作',
      grid: { width: 7, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
      walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
      entities: [
        { type: 'colorDoor', x: 3, y: 2, color: 'ORANGE' },
        { type: 'fragile', x: 1, y: 2 },
        { type: 'pauseTile', x: 0, y: 2 }
      ],
      hint: { focus: '暂停让蓝等待，橙通过专属门，脆弱格限制回头' },
      tags: ['chapter-5', 'M2', 'M3', 'M7', 'final-preview']
    }
  ]
});

// ===== level-050 最终对称合流 =====
redesigns.push({
  id: 'level-050', title: '最终对称合流', chapter: 5, order: 50,
  candidates: [
    {
      desc: '压板+单向+脉冲',
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
      hint: { focus: '压板开门、单向格、脉冲同步的完美配合' },
      tags: ['chapter-5', 'M1', 'M5', 'M8', 'final-symmetry']
    },
    {
      desc: '压板+单向+脉冲，非对称布局',
      grid: { width: 7, height: 5 },
      blueStart: { x: 0, y: 4 }, orangeStart: { x: 6, y: 4 },
      blueExit: { x: 0, y: 0 }, orangeExit: { x: 6, y: 0 },
      walls: [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 }, { x: 6, y: 1 }],
      entities: [
        { type: 'plate', id: 'p1', x: 0, y: 4, doorId: 'd1' },
        { type: 'door', id: 'd1', x: 2, y: 4 },
        { type: 'oneWay', x: 2, y: 1, arrow: 'RIGHT' },
        { type: 'pulseSwitch', pairId: 'p1', x: 1, y: 2 },
        { type: 'pulseSwitch', pairId: 'p1', x: 5, y: 2 },
        { type: 'pulseDoor', pairId: 'p1', x: 3, y: 1 }
      ],
      hint: { focus: '压板开门、单向格限制方向、脉冲同步开启终局门' },
      tags: ['chapter-5', 'M1', 'M5', 'M8', 'final-symmetry']
    }
  ]
});

// ===== Write all candidates =====
const R2_DIR = DIR;
for (const r of redesigns) {
  for (let ci = 0; ci < r.candidates.length; ci++) {
    const c = r.candidates[ci];
    const data = {
      schemaVersion: 1,
      initialMapping: 'H_MIRROR',
      id: r.id,
      chapter: r.chapter,
      order: r.order,
      title: r.title,
      grid: c.grid,
      blueStart: c.blueStart,
      orangeStart: c.orangeStart,
      blueExit: c.blueExit,
      orangeExit: c.orangeExit,
      walls: c.walls,
      entities: c.entities,
      parMoves: 99,
      parMovesNote: 'candidate - to be determined by BFS',
      hint: c.hint,
      tags: c.tags
    };
    const fp = resolve(R2_DIR, `${r.id}-candidate-${ci + 1}.json`);
    writeFileSync(fp, JSON.stringify(data, null, 2));
    console.log(`Wrote: ${r.id} candidate ${ci + 1}`);
  }
}

console.log(`\nTotal: ${redesigns.length} levels, ${redesigns.reduce((s, r) => s + r.candidates.length, 0)} candidates`);