import esbuild from "esbuild";
import { dirname } from "path";
import { fileURLToPath } from "url";
import cache from "./cache.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const bundleCache = new cache(60 * 1000); // 1分钟缓存

export async function build(filePath) {
  // 检查缓存
  const cached = bundleCache.get(filePath);
  if (cached) return cached;

  try {
    const result = await esbuild.build({
      entryPoints: [filePath],
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      external: ["react", "react-dom"], // 外部化依赖
      define: {
        "process.env.NODE_ENV": '"development"',
      },
      loader: {
        ".ts": "tsx",
        ".tsx": "tsx",
      },
      jsx: "automatic",
      tsconfigRaw: `{
        "compilerOptions": {
          "jsx": "react-jsx",
          "esModuleInterop": true
        }
      }`,
    });

    const code = result.outputFiles[0].text;
    bundleCache.set(filePath, code);
    return code;
  } catch (error) {
    console.error(`构建失败: ${filePath}`);
    throw error;
  }
}
