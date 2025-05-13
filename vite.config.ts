import { defineConfig } from "vite";
import dts from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";
import path from "path";
import { fileURLToPath } from "url";

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      plugins: [
        dts({
          tsconfig: "./tsconfig.json",
        }),
        babel({
          babelHelpers: "bundled",
          presets: [
            "@babel/preset-env",
            ["@babel/preset-typescript", { allowDeclareFields: true }],
          ],
          plugins: [
            ["@babel/plugin-proposal-decorators", { version: "legacy" }],
            // [
            //   path.resolve(
            //     fileURLToPath(import.meta.url),
            //     "..",
            //     "babel-plugins/decorator.js"
            //   ),
            //   { version: "legacy" },
            // ],
          ],
          sourceMaps: "inline",
          exclude: "node_modules/**",
          targets: ["defaults"],
          extensions: [".ts", ".js", ".tsx", ".jsx"],
          babelrc: false,
        }),
      ] as any[],
      external: /^@ocean\//,
    },
    target: ["es2015"],
    emptyOutDir: true,
    sourcemap: "inline",
    minify: false,
    outDir: "./dist",
    lib: {
      entry: ["src/index.ts"],
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
