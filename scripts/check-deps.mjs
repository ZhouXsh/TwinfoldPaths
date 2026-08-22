#!/usr/bin/env node
// 依赖边界检查：强制 docs/architecture.md §2 的单向依赖规则。
// 规则：
//  1. src/domain/** 只允许导入 src/domain 内部模块；禁止 phaser/DOM/localStorage/Audio。
//  2. tools/** 禁止导入 phaser 或引用 DOM。
//  3. src/persistence/** 禁止导入 phaser。
//  4. 所有 src/** 与 tools/** 禁止导入任何远程模块（http/https URL）。
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const root = resolve(process.cwd());
const errors = [];

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

const files = [
  ...walk(join(root, "src"), [".ts", ".tsx"]),
  ...walk(join(root, "tools"), [".ts", ".mjs", ".js"]),
];

const importRe = /(?:^|\n)\s*(?:import|export)[^'"\n]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

let checked = 0;
for (const file of files) {
  checked++;
  const rel = relative(root, file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");
  const inDomain = rel.startsWith("src/domain/");
  const inTools = rel.startsWith("tools/");
  const inPersistence = rel.startsWith("src/persistence/");

  if (inDomain) {
    for (const kw of ["phaser", "localStorage", "sessionStorage", "document.", "window.", "AudioContext", "navigator.", "XMLHttpRequest", "fetch("]) {
      if (new RegExp(`(^|[^\\w])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m").test(text)) {
        errors.push(`${rel}: domain 层出现禁用符号 "${kw}"`);
      }
    }
  }
  if (inTools) {
    for (const kw of ["phaser", "document.", "window.", "localStorage"]) {
      if (new RegExp(`(^|[^\\w])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m").test(text)) {
        errors.push(`${rel}: tools 出现禁用符号 "${kw}"`);
      }
    }
  }
  if (inPersistence && /['"]phaser['"]|from\s+['"]phaser/.test(text)) {
    errors.push(`${rel}: persistence 不得导入 phaser`);
  }

  let m;
  importRe.lastIndex = 0;
  while ((m = importRe.exec(text)) !== null) {
    const spec = m[1] || m[2] || m[3];
    if (!spec) continue;
    if (/^https?:\/\//.test(spec)) errors.push(`${rel}: 远程导入 ${spec}`);
    if (inDomain && !spec.startsWith(".") && !spec.startsWith("src/domain")) {
      errors.push(`${rel}: domain 层外部导入 "${spec}"（仅允许 domain 内部相对导入）`);
    }
    if (inTools && /^phaser/i.test(spec)) errors.push(`${rel}: tools 导入 phaser`);
    if (inPersistence && /^phaser/i.test(spec)) errors.push(`${rel}: persistence 导入 phaser`);
  }
}

if (errors.length) {
  console.error(`FAIL: ${errors.length} 处依赖边界违规`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`PASS: 依赖边界检查通过（检查文件数: ${checked}；src/ 或 tools/ 为空时视为平凡通过）`);
