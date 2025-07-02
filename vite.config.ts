import babel from "@rollup/plugin-babel";
import dts from "@rollup/plugin-typescript";
import { defineConfig } from "vite";
import addSourceCommentPlugin from "./vite-plugins/addSourceCommentPlugin";
import addTsIgnorePlugin from "./vite-plugins/addTsIgnorePlugin";
import addImportMsomPlugin from "./vite-plugins/addImportMsomPlugin";
import viteRollupBabelPlugins from "./vite.rollup.babel.plugins";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // addSourceCommentPlugin(),
    // addImportMsomPlugin(),
    // addTsIgnorePlugin(),
  ],
  build: {
    rollupOptions: {
      plugins: [
        dts({
          tsconfig: "./tsconfig.json",
          paths: {},
          noCheck: true,
          jsxFactory: "Msom.createElement",
          jsxImportSource: "@msom/dom",
        }),
        babel({
          ast: true,
          cloneInputAst: false,
          babelHelpers: "bundled",
          presets: [["@babel/preset-env", { targets: "> 0.25%, not dead" }]],
          plugins: viteRollupBabelPlugins,
          exclude: ["node_modules/**", "@msom/**"],
          extensions: [".ts", ".js", ".tsx", ".jsx"],
          babelrc: false,
        }),
      ] as any[],
      external: [
        /^@msom\//,
        "jsdom",
        "fs",
        "path",
        "mongodb",
        "cors",
        "express",
        "url",
        "rolldown",
        "commander",
        "chalk",
        "tslib",
        "typescript",
        /^@rollup\//,
      ],
    },
    target: ["esnext"],
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    outDir: "./dist",
    lib: {
      entry: ["./src/index.ts"],
      name: "index.js",
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        if (/^esm?$/.test(format)) {
          return "index.js";
        }
        return `index.${format}.js`;
      },
    },
  },
});
