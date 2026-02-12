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
    input: ["./src/mock-server.ts", "./src/proxy-server.ts"],
    output: [
      {
        dir: "./dist",
        format: "esm",
      },
    ],
  },
});
