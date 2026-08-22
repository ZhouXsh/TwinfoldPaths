#!/usr/bin/env node
// 阶段01强制校验：文档内链有效性、需求编号唯一性、P0需求完整性、追踪矩阵双向完整性。
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const errors = [];

function walkMd(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "dist") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkMd(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

// 1) 相对链接有效性
const mdFiles = [
  ...walkMd(join(root, "docs")),
  ...walkMd(join(root, "reports")),
  ...walkMd(join(root, "prompts")),
  ...walkMd(join(root, "reference")),
  ...walkMd(join(root, "templates")),
  join(root, "README.md"),
  join(root, "AGENTS.md"),
  join(root, ".ai", "project-state.md"),
].filter(existsSync);

let linkCount = 0;
for (const file of mdFiles) {
  const text = readFileSync(file, "utf8");
  const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    let target = m[1].trim();
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    target = target.split("#")[0];
    if (!target) continue;
    linkCount++;
    const abs = resolve(dirname(file), target);
    if (!existsSync(abs)) errors.push(`坏链接: ${file} -> ${m[1]}`);
  }
}

// 2) 需求编号唯一性与 P0 完整性
const reqText = readFileSync(join(root, "docs", "requirements.md"), "utf8");
const idRe = /\b(FR|NFR|R|CONTENT)-\d{2,3}\b/g;
const ids = reqText.match(idRe) || [];
const uniqueIds = [...new Set(ids)];

// 表格行：| 编号 | ... | 优先级 | 验收条件 | 验证方法 |
const tableRows = reqText.split("\n").filter((l) => /^\|\s*(FR|NFR|R|CONTENT)-\d/.test(l));
const seenInTables = new Set();
for (const row of tableRows) {
  const cells = row.split("|").map((c) => c.trim());
  const id = cells[1];
  if (seenInTables.has(id)) errors.push(`编号在表格中重复定义: ${id}`);
  seenInTables.add(id);
  if (/^FR-/.test(id)) {
    const prio = cells[3];
    const acceptance = cells[4];
    const verify = cells[5];
    if (prio === "P0" && (!acceptance || !verify)) errors.push(`P0 需求缺少验收条件或验证方法: ${id}`);
  }
  if (/^(NFR)-/.test(id)) {
    if (!cells[3] || !cells[4]) errors.push(`NFR 缺少量化验收条件或验证方法: ${id}`);
  }
}
for (const id of uniqueIds) {
  if (/^(FR|NFR|R|CONTENT)-\d/.test(id) && !seenInTables.has(id)) {
    errors.push(`编号未在需求表中定义: ${id}`);
  }
}
const expected = [
  ...Array.from({ length: 11 }, (_, i) => `FR-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 8 }, (_, i) => `NFR-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 7 }, (_, i) => `R-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 5 }, (_, i) => `CONTENT-${String(i + 1).padStart(2, "0")}`),
];
for (const id of expected) if (!seenInTables.has(id)) errors.push(`缺少必需编号: ${id}`);

// 3) 追踪矩阵双向完整性
const matrixText = readFileSync(join(root, "docs", "traceability-matrix.md"), "utf8");
const matrixRows = matrixText.split("\n").filter((l) => /^\|\s*(FR|NFR|R|CONTENT)-\d/.test(l));
const matrixIds = new Set(matrixRows.map((l) => l.split("|")[1].trim()));
const reqTableIds = [...seenInTables];
for (const id of reqTableIds) if (!matrixIds.has(id)) errors.push(`追踪矩阵缺失需求: ${id}`);
for (const id of matrixIds) if (!seenInTables.has(id)) errors.push(`矩阵引用了未定义需求: ${id}`);
// 每条正向行须有模块、测试、证据（第2/3/4列非空且非占位）
for (const row of matrixRows) {
  const cells = row.split("|").map((c) => c.trim());
  if (!cells[2] || !cells[3] || !cells[4] || /^—+$/.test(cells[2])) {
    errors.push(`矩阵行缺少模块/测试/证据映射: ${cells[1]}`);
  }
}

console.log(`检查文件数: ${mdFiles.length}, 相对链接数: ${linkCount}`);
console.log(`需求表定义编号: ${reqTableIds.length}, 矩阵映射编号: ${matrixIds.size}`);
if (errors.length) {
  console.error(`FAIL: ${errors.length} 个问题`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log("PASS: 链接有效、编号唯一齐全、P0/NFR 有验收与验证、矩阵双向完整");
