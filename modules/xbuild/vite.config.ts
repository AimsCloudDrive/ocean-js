import babel from "@rollup/plugin-babel";
import dts from "@rollup/plugin-typescript";

import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [],
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
          sourceMaps: false,
          babelHelpers: "bundled",
          presets: [["@babel/preset-env", { targets: "> 0.25%, not dead" }]],
          exclude: ["node_modules/**", "@ocean/**"],
          extensions: [".ts", ".js", ".tsx", ".jsx"],
          babelrc: false,
        }),
      ] as any[],
      external: [
        "node_modules/**",
        /^(node:)?(fs)|(path)|(process)|(child_process)|(url)$/,
        "rollup",
        "commander",
        "chalk",
        "typescript",
      ],
    },
    target: ["esnext"],
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
    outDir: "./dist",
    lib: {
      entry: ["src/index.ts"],
      formats: ["cjs"],
      fileName: () => "cli.js",
    },
  },
});
