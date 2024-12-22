// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";

export default {
  external: (id) => {
    // 使用正则表达式来匹配所有以 @ocean/ 开头的模块
    return /^@ocean\//.test(id);
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
      declaration: true,
      declarationDir: "dist/types", // 声明文件的路径
      rootDir: "src",
      outDir: "dist",
      sourceMap: true,
    }),
  ],
};
