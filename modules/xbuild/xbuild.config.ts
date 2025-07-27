import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";
import { JsxEmit } from "typescript";

export default defineConfig({
  build: {
    external: [
      "jsdom",
      "mongodb",
      "cors",
      "express",
      "rolldown",
      "commander",
      "chalk",
      "tslib",
      "body-parser",
      /^@rollup\//,
      /^@msom\//,
    ],
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
        paths: {},
        jsx: JsxEmit.ReactNative,
        noCheck: true,
      }),
    ],
    jsx: {
      mode: "automatic",
      jsxImportSource: "@msom/dom",
    },
    input: "./src/index.ts",
    output: [
      {
        sourcemap: true,
        dir: "./dist",
        format: "esm",
        chunkFileNames: (a) => {
          console.log(a.name);
        },
      },
    ],
  },
  dev: {
    proxy: {
      "/api": { target: "http://localhost", changeOrigin: true },
      "/dasfabjdsads": { target: "http://localhost" },
    },
  },
});
