import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.cwd(), 'tools', 'redesign-late-game.mjs');
let text = readFileSync(path, 'utf8');

const patches = [
  {
    id: 'level-026',
    from: "features:[{type:'oneWay',ratio:.38},{type:'fragile',ratio:.7}]",
    to: "features:[{type:'oneWay',ratio:.38},{type:'pauseTile',ratio:.53},{type:'fragile',ratio:.7}]"
  },
  {
    id: 'level-029',
    from: "features:[{type:'fragile',ratio:.28},{type:'fragile',ratio:.61},{type:'pulse',switchRatio:.38,doorRatio:.82}]",
    to: "features:[{type:'fragile',ratio:.28},{type:'pauseTile',ratio:.49},{type:'fragile',ratio:.61},{type:'pulse',switchRatio:.38,doorRatio:.82}]"
  },
  {
    id: 'level-040',
    from: "features:[{type:'visionBeacon',ratio:.25,radius:2},{type:'visionBeacon',ratio:.6,radius:3},{type:'pulse',switchRatio:.38,doorRatio:.78}]",
    to: "features:[{type:'visionBeacon',ratio:.25,radius:2},{type:'pauseTile',ratio:.48},{type:'visionBeacon',ratio:.6,radius:3},{type:'pulse',switchRatio:.38,doorRatio:.78}]"
  },
  {
    id: 'level-048',
    from: "features:[{type:'plateDoor',ratio:.3},{type:'phaseDoor',ratio:.58,phase:'EVEN'},{type:'colorDoor',ratio:.78}]",
    to: "features:[{type:'plateDoor',ratio:.3},{type:'pauseTile',ratio:.45},{type:'phaseDoor',ratio:.58,phase:'EVEN'},{type:'colorDoor',ratio:.78}]"
  }
];

for (const patch of patches) {
  if (text.includes(patch.to)) {
    console.log(`${patch.id}: already diversified`);
    continue;
  }
  if (!text.includes(patch.from)) {
    throw new Error(`${patch.id}: expected generator fragment not found`);
  }
  text = text.replace(patch.from, patch.to);
  console.log(`${patch.id}: inserted a forced pause beat to break the repeated route`);
}

writeFileSync(path, text, 'utf8');
