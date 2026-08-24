import { defineConfig } from 'vite';
import { resolve } from 'path';

// 工具链构建配置：将 solver CLI 入口打包为 Node ESM bundle
export default defineConfig({
  build: {
    outDir: 'tools-dist',
    lib: {
      entry: resolve(__dirname, 'tools/solver/main.ts'),
      formats: ['es'],
      fileName: () => 'solver.mjs'
    },
    rollupOptions: {
      external: ['node:fs', 'node:path', 'node:url', 'node:child_process']
    },
    target: 'es2022',
    minify: false,
    sourcemap: false
  },
  // 确保 TypeScript 路径解析正确
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
