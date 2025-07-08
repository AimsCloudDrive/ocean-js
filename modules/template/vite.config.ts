import babel from "@rollup/plugin-babel";
import dts from "@rollup/plugin-typescript";
import { defineConfig } from "vite";
import viteRollupBabelPlugins from "../../vite.rollup.babel.plugins";
import { JsxEmit } from "typescript";

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
          declaration: false,
          declarationDir: undefined,
          jsx: JsxEmit.ReactNative,
          jsxFactory: undefined,
          jsxImportSource: undefined,
          declarationMap: false,
          noCheck: true,
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
      jsx: {
        mode: "automatic",
        factory: "Msom.createELement",
        jsxImportSource: "@msom/dom",
      },
    },
    target: ["esnext"],
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    outDir: "./dist",
  },
});
