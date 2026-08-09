import babel from "@rollup/plugin-babel";
import pkg from "./package.json" with { type: "json" };
import { defineConfig } from "vite";
import viteRollupBabelPlugins from "../../vite.rollup.babel.plugins.ts";

// 从 dependencies 构建排除列表：
// - 所有非 @msom 的第三方依赖全部排除（安装 xbuild 时同步安装）
// - @msom 家族排除 component/dom/reaction/web-component/gallay
// - @msom/common 和 @msom/http 需要内联打进 bundle，因为打包这两个包时会清空自身 dist，
//   如果排除则构建阶段 import 它们会失败
const deps = Object.keys(pkg.dependencies || {});
const thirdPartyDeps = deps.filter((d) => !d.startsWith("@msom/"));
const msomExcludeDeps = deps.filter((d) => d.startsWith("@msom/") && d !== "@msom/common" && d !== "@msom/http");
const scopes = [
  ...new Set(thirdPartyDeps.filter((d) => d.startsWith("@")).map((d) => d.split("/").slice(0, 2).join("/"))),
];
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default defineConfig({
  plugins: [],
  build: {
    rollupOptions: {
      plugins: [
        babel({
          ast: true,
          cloneInputAst: false,
          babelHelpers: "bundled",
          sourceMaps: false,
          generatorOpts: { compact: true },
          presets: [["@babel/preset-env", { targets: "> 0.25%, not dead" }]],
          plugins: viteRollupBabelPlugins,
          exclude: ["node_modules/**", "@msom/**"],
          extensions: [".ts", ".js", ".tsx", ".jsx"],
          babelrc: false,
        }),
      ] as any[],
      external: [
        // @msom 家族：排除除 common/http 外的所有兄弟包
        ...msomExcludeDeps.map((name) => new RegExp(`^${escapeRegex(name)}(?:[/\\\\].*)?$`)),
        // 第三方依赖（不打 bundle，由用户安装时同步引入）
        ...thirdPartyDeps.map((name) => new RegExp(`^${escapeRegex(name)}(?:[/\\\\].*)?$`)),
        ...scopes.map((s) => new RegExp(`^${escapeRegex(s)}(?:[/\\\\].*)?$`)),
        /^@web\//,
        "express",
        "cors",
        "body-parser",
        // Node 内置模块
        /^node:/,
        /^(?:node:)?fs(?:[/\\\\].*)?$/,
        /^(?:node:)?path(?:[/\\\\].*)?$/,
        /^(?:node:)?url(?:[/\\\\].*)?$/,
        /^(?:node:)?net(?:[/\\\\].*)?$/,
        /^https?:?[/\\\\]?/,
        "stream",
        "util",
        "async_hooks",
        "crypto",
        "buffer",
        "string_decoder",
        "events",
        "querystring",
        "zlib",
        "tty",
        "os",
        "assert",
        "constants",
        "timers",
        "child_process",
        "dgram",
        "dns",
        "inspector",
        "module",
        "perf_hooks",
        "process",
        "punycode",
        "readline",
        "repl",
        "tls",
        "vm",
        "wasi",
        "worker_threads",
      ],
      platform: "node",
      checks: {
        pluginTimings: false,
      },
    },
    target: ["esnext"],
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    css: {
      postcss: {},
    },
    outDir: "./dist",
    lib: {
      entry: ["./src/index.ts"],
      name: "index.js",
      formats: ["es"],
      fileName: () => "index.js",
    },
  },
  dev: {},
  server: {
    proxy: {},
  },
});
