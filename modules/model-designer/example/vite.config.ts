import babel from "@rollup/plugin-babel";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import createDecoratorPlugin from "../../../babel-plugins/dist/decorator.js";

const dist = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  base: "/demo/",
  resolve: {
    alias: [
      { find: /^@msom\/model-designer$/, replacement: dist("../dist/index.js") },
      { find: /^@msom\/dom\/jsx-runtime$/, replacement: dist("../../dom/dist/jsx-runtime.js") },
      { find: /^@msom\/dom\/jsx-dev-runtime$/, replacement: dist("../../dom/dist/jsx-dev-runtime.js") },
      { find: /^@msom\/dom$/, replacement: dist("../../dom/dist/index.js") },
      { find: /^@msom\/component$/, replacement: dist("../../component/dist/index.js") },
      { find: /^@msom\/reaction$/, replacement: dist("../../reaction/dist/index.js") },
      { find: /^@msom\/common$/, replacement: dist("../../common/dist/index.js") },
      { find: /^modules\/dom\/jsx-runtime$/, replacement: dist("../../dom/dist/jsx-runtime.js") },
    ],
  },
  plugins: [
    babel({
      ast: true,
      cloneInputAst: false,
      babelHelpers: "bundled",
      presets: [["@babel/preset-env", { targets: "> 0.25%, not dead" }]],
      plugins: [createDecoratorPlugin()],
      exclude: ["node_modules/**"],
      extensions: [".js"],
      babelrc: false,
    }),
  ],
  server: {
    port: 5174,
  },
});
