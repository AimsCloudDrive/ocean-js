import path from "path";
import { RolldownPlugin } from "rolldown";
import postcss, { ProcessOptions, Plugin as PostCSSPlugin, Result } from "postcss";

export interface PostCSSPluginOptions {
  /** PostCSS 插件列表，由用户传入（包含 less/sass/autoprefixer 等） */
  plugins?: PostCSSPlugin[];
  /** 匹配的文件扩展名，默认 [".css"] */
  extensions?: string[];
  /** 是否提取 CSS 为单独文件，默认 true */
  extract?: boolean | string;
  /** 是否生成 sourceMap，默认 true */
  sourceMap?: boolean;
  /** 提取后的 CSS 输出文件名，默认 "index.css" */
  cssFileName?: string;
  /** 不提取时是否将 CSS 注入 style 标签，默认 true */
  inject?: boolean;
  /** PostCSS process 的其他选项 */
  processOptions?: Partial<ProcessOptions>;
}

interface CSSAsset {
  id: string;
  css: string;
  map?: string;
}

const DEFAULT_EXTENSIONS = [".css"];

/**
 * Rolldown PostCSS 适配插件
 * 仅提供 PostCSS 处理管道，所有预处理器/功能插件由用户通过 plugins 传入
 */
export const postcssPlugin = (options: PostCSSPluginOptions = {}): RolldownPlugin<unknown> => {
  const {
    plugins: userPlugins = [],
    extensions = DEFAULT_EXTENSIONS,
    extract = true,
    sourceMap = true,
    cssFileName = "index.css",
    inject = true,
    processOptions = {},
  } = options;

  const cssAssets = new Map<string, CSSAsset>();
  const processedModules = new Set<string>();

  const isSupported = (id: string): boolean => {
    const queryIdx = id.indexOf("?");
    const cleanId = queryIdx === -1 ? id : id.slice(0, queryIdx);
    const ext = path.extname(cleanId).toLowerCase();
    return extensions.includes(ext);
  };

  const runPostCSS = async (
    code: string,
    id: string
  ): Promise<{ css: string; map?: string }> => {
    const result: Result = await postcss(userPlugins).process(code, {
      from: id,
      to: id,
      map: sourceMap
        ? {
            inline: false,
            annotation: false,
          }
        : undefined,
      ...processOptions,
    });

    for (const warning of result.warnings()) {
      console.warn(`[xbuild-postcss] ${warning.text}`);
    }

    return {
      css: result.css,
      map: result.map ? result.map.toString() : undefined,
    };
  };

  return {
    name: "xbuild-postcss",

    buildStart() {
      cssAssets.clear();
      processedModules.clear();
    },

    async transform(code: string, id: string) {
      if (!isSupported(id)) {
        return null;
      }
      if (processedModules.has(id)) {
        return null;
      }
      processedModules.add(id);

      try {
        const { css, map } = await runPostCSS(code, id);

        cssAssets.set(id, { id, css, map });

        if (extract) {
          return {
            code: `export default {};`,
            map: null,
          };
        } else if (inject) {
          const escaped = JSON.stringify(css);
          const ident = JSON.stringify(path.basename(id.split("?")[0]));
          return {
            code: `
(function() {
  if (typeof document === 'undefined') return;
  var style = document.createElement('style');
  style.type = 'text/css';
  style.setAttribute('data-xbuild-id', ${ident});
  if (style.styleSheet) {
    style.styleSheet.cssText = ${escaped};
  } else {
    style.appendChild(document.createTextNode(${escaped}));
  }
  document.head.appendChild(style);
})();
export default {};
`,
            map: null,
          };
        } else {
          return {
            code: `export default ${JSON.stringify(css)};`,
            map: null,
          };
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.error(`[xbuild-postcss] ${path.basename(id.split("?")[0])}: ${msg}`);
        return null;
      }
    },

    generateBundle() {
      if (!extract || cssAssets.size === 0) {
        return;
      }

      let combinedCSS = "";
      const maps: string[] = [];

      for (const asset of cssAssets.values()) {
        const header = `/* ${path.relative(process.cwd(), asset.id.split("?")[0])} */\n`;
        combinedCSS += header + asset.css + "\n";
        if (asset.map) maps.push(asset.map);
      }

      let outputFileName = typeof extract === "string" ? extract : cssFileName;
      if (!outputFileName.toLowerCase().endsWith(".css")) {
        outputFileName += ".css";
      }

      if (sourceMap && maps.length > 0) {
        const mapFileName = outputFileName + ".map";
        combinedCSS += `\n/*# sourceMappingURL=${mapFileName} */`;
        this.emitFile({
          type: "asset",
          fileName: mapFileName,
          source: mergeSourceMaps(maps),
        });
      }

      this.emitFile({
        type: "asset",
        fileName: outputFileName,
        source: combinedCSS,
      });
    },
  };
};

function mergeSourceMaps(maps: string[]): string {
  try {
    const out = {
      version: 3,
      file: "",
      sources: [] as string[],
      sourcesContent: [] as (string | null)[],
      names: [] as string[],
      mappings: "",
    };
    for (const s of maps) {
      const m = JSON.parse(s);
      if (m.sources) out.sources.push(...m.sources);
      if (m.sourcesContent) out.sourcesContent.push(...m.sourcesContent);
      if (m.names) out.names.push(...m.names);
      if (!out.file && m.file) out.file = m.file;
    }
    return JSON.stringify(out);
  } catch {
    return "{}";
  }
}
