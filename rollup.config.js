// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";

export default {
  external: [
    "@ocean/common",
    "@ocean/dom",
    "@ocean/component",
    "@ocean/reaction",
    "@ocean/ui",
    "@ocean/app",
  ],
  input: "src/index.ts", // 你的主要输入文件
  output: {
    sourcemap: true,
    file: "dist/index.js", // 输出文件
    format: "esm",
  },
  plugins: [
    nodeResolve({
      browser: true,
    }),
    commonjs(),
    babel({
      targets: ["defaults"],
      exclude: "node_modules/**",
      extensions: [".ts", ".js", ".tsx", ".jsx"],
      presets: ["@babel/preset-env", "@babel/preset-typescript"],
      plugins: [["@babel/plugin-proposal-decorators", { version: "legacy" }]],
      babelrc: false,
      sourceMaps: true,
    }),
    typescript({
      tsconfig: "./tsconfig.json",
      declarationDir: "./dist", // 声明文件的路径
    }),
    ,
  ],
};
