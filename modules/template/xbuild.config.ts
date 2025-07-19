import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";
import { JsxEmit } from "typescript";

export default defineConfig({
  plugins: [],
  build: {
    external: [
      "jsdom",
      "mongodb",
      "cors",
      "express",
      "commander",
      "chalk",
      "typescript",
    ],
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
        paths: {},
        declaration: false,
        declarationDir: undefined,
        jsx: JsxEmit.ReactNative,
        declarationMap: false,
        noCheck: true,
      }),
    ],
    jsx: {
      mode: "automatic",
      jsxImportSource: "@msom/dom",
    },
    input: "./index.html",
    output: [
      {
        // advancedChunks: {
        //   groups: [{ name: "vender", test: /node_modules/ }],
        // },
        sourcemap: true,
        dir: "./dist",
        format: "esm",
      },
    ],
  },
});
