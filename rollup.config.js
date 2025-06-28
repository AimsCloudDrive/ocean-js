import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import path from "path";
import { fileURLToPath } from "url";

export default {
  external: (id) => {
    // 使用正则表达式来匹配所有以 @msom/ 开头的模块
    return /^@msom\//.test(id);
  },
  input: "src/index.ts", // 你的主要输入文件
  output: {
    sourcemap: true,
    dir: "dist", // 输出目录
    format: "esm",
  },
  plugins: [
    nodeResolve({
      browser: true,
    }),
    commonjs(),
    babel({
      babelrc: false,
      babelHelpers: "bundled",
      presets: [
        "@babel/preset-env",
        ["@babel/preset-typescript", { allowDeclareFields: true }],
      ],
      plugins: [
        path.resolve(
          fileURLToPath(import.meta.url),
          "..",
          "babel-plugins/decorator.js"
        ),
      ],
      ast: true,
      sourceMaps: "inline",
      exclude: "node_modules/**",
      targets: ["defaults"],
      extensions: [".ts", ".js", ".tsx", ".jsx"],
    }),
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      declarationDir: "dist/types", // 声明文件的路径
      // rootDir: "src",
      outDir: "dist",
      sourceMap: true,
    }),
  ],
};
