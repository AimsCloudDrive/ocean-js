import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";

const XBUILD_ENV = process.env.XBUILD_ENV;
console.log("process.env.XBUILD_ENV: " + XBUILD_ENV);

export default defineConfig({
  plugins: [],
  build: {
    external: [/@msom\//, "tslib"],
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
        paths: {},
        noCheck: true,
        sourceMap: true,
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
      },
    ],
  },
});
