import { defineConfig } from "@msom/xbuild";
import dts from "@rollup/plugin-typescript";

export default defineConfig({
  plugins: [],
  build: {
    external: ["tslib", /^@rollup\//, /^@msom\//],
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
        paths: {},
        noCheck: true,
        jsxFactory: "Msom.createElement",
        jsxImportSource: "@msom/dom",
      }),
    ],
    jsx: {
      mode: "classic",
      factory: "Msom.createElement",
      jsxImportSource: "@msom/dom",
    },
    input: [
      "./src/index.ts",
      "./src/jsx-runtime.ts",
      "./src/jsx-dev-runtime.ts",
    ],
    output: [
      {
        sourcemap: true,
        dir: "./dist",
        format: "esm",
      },
    ],
  },
});
