import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const dist = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
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
    proxy: {
      "/api/model-designer": {
        target: "http://127.0.0.1:9091",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    lib: {
      entry: dist("./src/index.ts"),
      name: "ModelDesignerVue",
      fileName: "model-designer-vue",
      formats: ["es"],
    },
    rollupOptions: {
      // 将 Vue 相关依赖视为外部依赖，不打包进库
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue",
        },
      },
    },
  },
});
