import { defineConfig } from 'vite';
import { resolve } from 'path';

// 工具链构建配置：CLI、可复用 solver API 与关卡解序列差异化审计均打包为 Node ESM。
export default defineConfig({
  build: {
    outDir: 'tools-dist',
    rollupOptions: {
      // solverApi 被 Node 生成器直接按 named exports 引用，必须禁止入口导出被 tree-shake。
      preserveEntrySignatures: 'strict',
      input: {
        solver: resolve(__dirname, 'tools/solver/main.ts'),
        solverApi: resolve(__dirname, 'tools/solver/bfs-solver.ts'),
        variety: resolve(__dirname, 'tools/variety/main.ts')
      },
      output: {
        entryFileNames: '[name].mjs'
      },
      external: ['node:fs', 'node:path', 'node:url', 'node:child_process']
    },
    target: 'es2022',
    minify: false,
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
