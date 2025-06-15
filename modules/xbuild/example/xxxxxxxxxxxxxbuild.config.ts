import babel from "@rollup/plugin-babel";
import dts from "@rollup/plugin-typescript";
import { defineConfig } from "@oceancommon/xbuild";

// https://vite.dev/config/
export default defineConfig({
  plugins: [],
  rollupOptions: {
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
        paths: {},
        noCheck: true,
        jsxImportSource: undefined,
      }),
      babel({
        sourceMaps: false,
        babelHelpers: "bundled",
        presets: [["@babel/preset-env", { targets: "> 0.25%, not dead" }]],
        exclude: ["node_modules/**", "@ocean/**"],
        extensions: [".ts", ".js", ".tsx", ".jsx"],
        babelrc: false,
      }),
    ] as any[],
    external: [
      "node_modules/**",
      /^(node:)?(fs)|(path)|(process)|(child_process)|(url)$/,
      "rollup",
      "commander",
      "chalk",
      "typescript",
    ],
  },
});
