import babel from "@rollup/plugin-babel";
import dts from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import { defineConfig } from "vite";
import addSourceCommentPlugin from "./vite-plugins/addSourceCommentPlugin";
import addTsIgnorePlugin from "./vite-plugins/addTsIgnorePlugin";
import viteRollupBabelPlugins from "./vite.rollup.babel.plugins";
import path from "path";

const SourceCommentRegExp = /^\*[\s\S]*?Source:[\s\S]*?$/;

// https://vite.dev/config/
export default defineConfig({
  plugins: [addSourceCommentPlugin(), addTsIgnorePlugin()],
  build: {
    rollupOptions: {
      plugins: [
        dts({
          tsconfig: "./tsconfig.json",
          paths: {},
          noCheck: true,
          jsxImportSource: undefined,
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
      external: [/^@msom\//, "fs", "path", "mongodb", "cors", "express"],
    },
    target: ["esnext"],
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    outDir: "./dist",
    lib: {
      entry: ["src/index.ts"],
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
