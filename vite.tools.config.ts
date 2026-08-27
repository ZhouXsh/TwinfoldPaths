import { defineConfig } from 'vite';
import { resolve } from 'path';

// 工具链构建配置：将 solver 与关卡解序列差异化审计打包为 Node ESM bundle。
export default defineConfig({
  build: {
    outDir: 'tools-dist',
    rollupOptions: {
      input: {
        solver: resolve(__dirname, 'tools/solver/main.ts'),
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
