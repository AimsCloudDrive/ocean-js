export default function addImportMsomPlugin() {
  return {
    name: "add-import-msom",
    generateBundle(_, bundle) {
      // 遍历所有输出文件
      Object.keys(bundle).forEach((fileName) => {
        const file = bundle[fileName];
        if (file.type === "chunk" && file.code) {
          // 在 JS 文件内容前添加注释
          if (file.code.includes("Msom.createElement")) {
            file.code = 'import * as Msom from "@msom/dom";\n' + file.code;
          }
        }
      });
    },
  };
}
