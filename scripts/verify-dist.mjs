#!/usr/bin/env node
// 构建产物校验：单文件存在、无远程请求、无硬编码密钥、体积在预算内（ADR-009：>3MB 触发复查）。
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), 'dist', 'index.html');
const errors = [];

if (!existsSync(file)) {
  console.error('FAIL: dist/index.html 不存在，请先运行 npm run build');
  process.exit(1);
}

const html = readFileSync(file, 'utf8');
const bytes = statSync(file).size;
const mb = bytes / 1024 / 1024;

const tagRefs = [...html.matchAll(/<(script|link|img|iframe)[^>]*(?:src|href)=["']([^"']+)["']/gi)];
for (const m of tagRefs) {
  const url = m[2];
  if (/^(https?:)?\/\//i.test(url)) errors.push(`外部资源引用: <${m[1]}> -> ${url}`);
}
for (const m of html.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)/gi)) {
  errors.push(`css url() 外部引用: ${m[1]}`);
}
for (const m of html.matchAll(/fetch\(\s*["'](https?:\/\/[^"']+)["']/g)) {
  errors.push(`fetch 外部请求: ${m[1]}`);
}

const keyLike = html.match(
  /["']?(api[_-]?key|secret[_-]?key|access[_-]?token)["']?\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i
);
if (keyLike) errors.push(`疑似硬编码密钥: ${keyLike[0].slice(0, 40)}...`);

if (mb > 3) errors.push(`单文件体积 ${mb.toFixed(2)}MB 超出预算 3MB（ADR-009 复查条件）`);

console.log(`dist/index.html 体积: ${mb.toFixed(2)}MB (${bytes} bytes)`);
if (errors.length) {
  console.error(`FAIL: ${errors.length} 个问题`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log('PASS: 无外部请求、无密钥、体积在预算内');
