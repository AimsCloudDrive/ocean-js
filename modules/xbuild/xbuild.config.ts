import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";

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
        noCheck: true,
        sourceMap: true,
      }),
    ],
    input: "./src/index.ts",
    output: [
      {
        sourcemap: true,
        dir: "./dist",
        format: "esm",
      },
    ],
  },
});
