import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      external: [/^@ocean\//],
      input: "src/index.ts", // 你的主要输入文件
      plugins: [
        nodeResolve({
          browser: true,
        }),
        babel({
          babelHelpers: "bundled",
          targets: ["defaults"],
          exclude: "node_modules/**",
          extensions: [".ts", ".js", ".tsx", ".jsx"],
          presets: [
            ["@babel/preset-env"],
            [
              "@babel/preset-typescript",
              { allowDeclareFields: true, sourceMap: true },
            ],
          ],
          plugins: [
            ["@babel/plugin-proposal-decorators", { version: "legacy" }],
          ],
          babelrc: false,
          sourceMaps: "inline",
        }),
        typescript({
          tsconfig: "tsconfig.json",
          exclude: /^@ocean\//,
          declaration: true,
          declarationDir: "dist/types", // 声明文件的路径
          outDir: "dist",
          sourceMap: true,
        }),
      ],
    },
    emptyOutDir: true,
    sourcemap: "inline",
    minify: false,
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      name: "index.js",
      formats: ["es", "cjs"],
      fileName: (format) => {
        if (/^esm?$/.test(format)) {
          return "index.js";
        }
        return `index.${format}.js`;
      },
    },
  },
});
