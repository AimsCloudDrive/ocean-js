import path from "path";
import { Plugin } from "vite";

/**! */
export default function addSourceCommentPlugin(): Plugin {
  const sourceMap = new Map<string, { relativePath: string }>();

  return {
    name: "add-source-comment",
    enforce: "pre",
    apply: "build",

    transform(code, id) {
      // 记录源文件映射
      if (!id.includes("node_modules") && !id.includes("index")) {
        const relativePath = path.relative(process.cwd(), id);
        sourceMap.set(id, { relativePath });
      }
      return null;
    },

    renderChunk(code, chunk) {
      // 获取该 chunk 包含的所有模块
      const modules = chunk.modules;
      let newCode = code;

      // 为每个模块在代码中找到对应位置并添加注释
      for (let id in modules) {
        const sourcePath = sourceMap.get(id);
        if (sourcePath) {
          // 获取模块的代码
          const moduleCode = modules[id].code;
          if (moduleCode) {
            // 在模块代码前添加注释
            newCode = newCode.replace(
              moduleCode,
              `\n/** Source: ${
                sourcePath.relativePath.split("\\").pop() || ""
              } */\n${moduleCode}`
            );
          }
        }
      }
      // console.log(newCode);

      return {
        code: newCode,
        map: null,
      };
    },
  };
}
