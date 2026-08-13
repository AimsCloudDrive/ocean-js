import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

// 环境文件虚拟入口
const ENV_VIRTUAL_ID = "virtual:env";

/** 环境文件入口：将 src/.env 作为独立资源输出到 dist/.env */
function envEntryPlugin(): Plugin {
  return {
    name: "env-entry",
    resolveId(id) {
      if (id === ENV_VIRTUAL_ID) return "\0" + ENV_VIRTUAL_ID;
    },
    load(id) {
      // 占位空模块，真正的 .env 内容在 generateBundle 阶段作为资源输出
      if (id === "\0" + ENV_VIRTUAL_ID) return "export {};";
    },
    generateBundle(_options, bundle) {
      const envPath = path.resolve(process.cwd(), "src/.env");
      if (!fs.existsSync(envPath)) {
        console.warn(`[env-entry] 未找到环境文件 ${envPath}，跳过输出`);
        return;
      }
      // 移除占位入口生成的空 chunk
      delete bundle["env.js"];
      // 将环境文件作为独立资源输出
      this.emitFile({
        type: "asset",
        fileName: ".env",
        source: fs.readFileSync(envPath),
      });
      console.log(`[env-entry] 已输出环境文件 dist/.env`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [envEntryPlugin()],
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
      // 双入口：业务代码 + 环境文件
      input: {
        index: "./src/index.ts",
        env: ENV_VIRTUAL_ID,
      },
      // 仅 Node 内置模块保持 external，其余全部打包
      external: [/^node:/],
      output: {
        format: "es",
        entryFileNames: (chunkInfo) => (chunkInfo.name === "index" ? "index.js" : `${chunkInfo.name}.js`),
      },
    },
  },
});
