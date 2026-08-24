import { defineConfig } from 'vite';
import { resolve } from 'path';

// 编辑器构建配置：验证模块图可解析，产出到 tools-dist/editor/
export default defineConfig({
  root: resolve(__dirname, 'tools/level-editor'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'tools-dist/editor'),
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
