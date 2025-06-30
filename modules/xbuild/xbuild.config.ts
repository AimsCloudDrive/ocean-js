import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";

export default defineConfig({
  plugins: [],
  build: {
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
        paths: {},
        noCheck: true,
        jsxFactory: "Msom.createElement",
        jsxImportSource: "@msom/dom",
      }),
    ],
    input: "./src/index.ts",
    output: {
      dir: "./dist",
      format: "commonjs",
      chunkFileNames: "cli.js",
    },
  },
});
