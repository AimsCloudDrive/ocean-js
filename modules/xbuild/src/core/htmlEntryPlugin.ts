import path from "path";
import fs from "fs";
import { RolldownPlugin } from "rolldown";

// HTML 入口解析插件 (适配 Rolldown 的 pluginutils)
export const htmlEntryPlugin = (): RolldownPlugin<unknown> => {
  let htmlContent = "";
  const processedAssets = new Set();

  return {
    name: "html-entry-plugin",
    async buildStart(options) {
      // 1. 读取 HTML 入口文件
      const input = [options.input].flat()[0];
      if (typeof input === "object" || !input.endsWith(".html")) {
        return;
      }
      const htmlPath = path.resolve(process.cwd(), input);
      console.log(htmlPath);
      htmlContent = fs.readFileSync(htmlPath, "utf-8");

      // 2. 解析 HTML 中的脚本资源
      const scriptRegex =
        /<script\s+[^>]*src\s*=\s*['"]([^'"]+\.(js|ts|jsx|tsx))['"][^>]*>/gi;
      const scripts: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = scriptRegex.exec(htmlContent)) !== null) {
        const relativePath = match[1];
        const scriptPath = path.resolve(path.dirname(htmlPath), relativePath);
        scripts.push(scriptPath);
      }

      // 3. 设置动态入口
      if (scripts.length > 0) {
        // 将第一个脚本作为主入口
        this.emitFile({
          type: "chunk",
          id: scripts[0],
          fileName: path.basename(scripts[0]),
        });

        // 其他脚本作为额外入口点
        for (let i = 1; i < scripts.length; i++) {
          this.emitFile({
            type: "chunk",
            id: scripts[i],
          });
        }
      }
    },

    async generateBundle(outputOptions, bundle) {
      if (!htmlContent) {
        return;
      }
      // 4. 资源注入处理器
      const headInjection: string[] = [];
      const cssLinks: string[] = [];
      const jsScripts: string[] = [];

      // 创建资源类型映射
      const assetTypeMap = {
        ".css": "style",
        ".woff2": "font",
        ".woff": "font",
        ".ttf": "font",
        ".eot": "font",
        ".png": "image",
        ".jpg": "image",
        ".jpeg": "image",
        ".gif": "image",
        ".webp": "image",
        ".svg": "image",
      };

      // 遍历生成的文件
      for (const [fileName, assetInfo] of Object.entries(bundle)) {
        // 跳过已处理资源
        if (processedAssets.has(fileName)) continue;
        processedAssets.add(fileName);

        const ext = path.extname(fileName).toLowerCase();

        // 处理 CSS 资源
        if (ext === ".css") {
          cssLinks.push(`<link rel="stylesheet" href="${fileName}">`);
        }
        // 处理 JS 资源 (非入口文件)
        else if (
          ext === ".js" &&
          assetInfo.type === "chunk" &&
          !assetInfo.isEntry
        ) {
          jsScripts.push(`<script src="${fileName}" defer></script>`);
        }
        // 处理其他静态资源
        else if (assetTypeMap[ext]) {
          headInjection.push(
            `<link rel="preload" href="${fileName}" as="${assetTypeMap[ext]}" crossorigin>`
          );
        }
      }

      // 5. 更新 HTML 内容
      let updatedHtml = htmlContent;

      // 更新 script 引用
      updatedHtml = updatedHtml.replace(
        /<script\s+[^>]*src\s*=\s*['"]([^'"]+\.(js|ts|jsx|tsx))['"][^>]*>/gi,
        (match, src) => {
          // 查找对应的输出文件名
          const outputFile = Object.keys(bundle).find((name) =>
            name.startsWith(path.basename(src, path.extname(src)))
          );

          return outputFile
            ? match
                .replace(src, outputFile)
                .replace(/(type\s*=\s*['"])[^'"]*['"]/i, 'type="module"')
            : match;
        }
      );

      // 注入资源到 head
      updatedHtml = updatedHtml.replace(
        /<\/head>/i,
        `${cssLinks.join("\n")}\n${headInjection.join("\n")}\n</head>`
      );

      // 注入非入口 JS 文件到 body 末尾
      updatedHtml = updatedHtml.replace(
        /<\/body>/i,
        `${jsScripts.join("\n")}\n</body>`
      );

      // 6. 输出最终 HTML
      this.emitFile({
        type: "asset",
        fileName: "index.html",
        source: updatedHtml,
      });
    },
  };
};
