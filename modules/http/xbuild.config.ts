import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";

export default defineConfig({
  build: {
    external: [
      "mongodb",
      "cors",
      "express",
      "chalk",
      "tslib",
      "body-parser",
      /^@babel\//,
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
