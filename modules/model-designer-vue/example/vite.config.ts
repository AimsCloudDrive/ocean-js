import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const dist = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// example 作为独立应用运行：依赖从库项目的 node_modules 正常解析
// （vite 向上查找 node_modules，找到 model-designer-vue/node_modules 下的 vue 与 @vue/runtime-vapor）
export default defineConfig(() => {
  return {
    root: dist("."),
    base: "/demo/",
    plugins: [
      vue({
        features: { vapor: true },
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
  };
});
