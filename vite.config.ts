import babel from "@rollup/plugin-babel";
import dts from "@rollup/plugin-typescript";
import { defineConfig } from "vite";
import addSourceCommentPlugin from "./vite-plugins/addSourceCommentPlugin";
import addTsIgnorePlugin from "./vite-plugins/addTsIgnorePlugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [addSourceCommentPlugin(), addTsIgnorePlugin()],
  build: {
    terserOptions: {
      format: {
        comments: /^\/\*\**\*\//,
      },
      compress: true,
    },
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
          sourceMaps: true,
          exclude: "node_modules/**",
          targets: ["defaults"],
          extensions: [".ts", ".js", ".tsx", ".jsx"],
          babelrc: false,
        }),
      ] as any[],
      external: /^@ocean\//,
    },
    target: ["esnext"],
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    outDir: "./dist",
    lib: {
      entry: ["src/index.ts"],
      name: "index.js",
      formats: ["es"],
      fileName: (format) => {
        if (/^esm?$/.test(format)) {
          return "index.js";
        }
        return `index.${format}.js`;
      },
    },
  },
});
