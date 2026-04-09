import { defineConfig } from './src/utils/config';

export default defineConfig(({ mode }) => ({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  external: [
    'rolldown',
    'commander',
    'chalk',
    'express',
    'http-proxy-middleware',
    'ws',
    'fs',
    'path',
    'os',
    'child_process',
  ],
  plugins: [
    // 插件配置
  ],
  devServer: {
    port: 3000,
    publicDir: 'dist',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
}));