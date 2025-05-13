import { Plugin } from "vite";
export default function addTsIgnorePlugin(): Plugin {
  return {
    name: "add-ts-ignore",
    generateBundle(_, bundle) {
      // 遍历所有输出文件
      Object.keys(bundle).forEach((fileName) => {
        const file = bundle[fileName];
        if (file.type === "chunk" && file.code) {
          // 在 JS 文件内容前添加注释
          file.code = "// @ts-nocheck\n" + file.code;
        }
      });
    },
  };
}
