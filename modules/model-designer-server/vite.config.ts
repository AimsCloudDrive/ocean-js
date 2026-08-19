import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // 打包所有第三方依赖，不自动 externalize
  ssr: {
    noExternal: true,
  },
  build: {
    // 以 Node 后端环境构建（SSR 模式），避免注入浏览器 polyfill
    ssr: true,
    target: "node20",
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    outDir: "./dist",
    rollupOptions: {
      input: "./src/index.ts",
      // 仅 Node 内置模块保持 external，其余全部打包
      external: [/^node:/],
      output: {
        format: "es",
        entryFileNames: "index.js",
      },
    },
  },
});
