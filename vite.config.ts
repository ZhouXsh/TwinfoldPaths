/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // O7 将 40 个后期关卡从细通道升级为开放共享迷宫，BFS 状态空间显著扩大。
    // 保留原有全量/重复求解断言，只提高单测时间预算，不降低任何正确性门槛。
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/domain/**'],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 95,
        statements: 95
      }
    }
  }
});
