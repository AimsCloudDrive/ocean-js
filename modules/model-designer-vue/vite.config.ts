import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const dist = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: "/demo/",
  resolve: {
    alias: [],
  },
  plugins: [
    vue({
      // 全局启用 Vapor 无虚拟 DOM 编译模式
      features: {
        vapor: true,
      },
    }),
  ],
  server: {
    port: 5175,
    proxy: {
      "/api": {
        target: "http://47.109.110.125:9091",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
