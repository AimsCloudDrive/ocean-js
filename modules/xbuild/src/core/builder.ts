import { assert, nil } from "@msom/common";
import { ProxyRules, createServer, staticMiddle } from "@msom/http";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import path from "path";
import {
  ExternalOption,
  OutputAsset,
  OutputChunk,
  OutputOptions,
  RolldownBuild,
  RolldownOptions,
  RolldownPluginOption,
  rolldown,
} from "rolldown";
import postcss from "rollup-plugin-postcss";
import { Only, StringOrRegExp, getModuleName } from "../utils/common";
import { Logger } from "../utils/logger";
import { PluginManager } from "./plugin";
import {
  LoadedXbuildConfig,
  XBuildContext,
  XBuildOutputOptions,
  XbuildDevOptions,
} from "./types";
import { htmlEntryPlugin } from "./htmlEntryPlugin";

const defaultRolldownPlugins: RolldownPluginOption<unknown>[] = [
  postcss({
    extract: true,
    sourceMap: true,
  }),
  htmlEntryPlugin(),
];
/**
 * 打包工具相关依赖
 */
const defaultRolldownExternal = [
  /^@rolldown\//,
  /^rolldown/,
  /^@babel\//,
  /^@rollup\//,
  /rollup/,
  /^http/,
  "net",
  "autoprefixer",
  "chalk",
  "commander",
  "less",
  "postcss",
  "rolldown",
  "typescript",
  "jsdom",
  "fs",
  "path",
  "url",
  "rollup-plugin-postcss",
];

enum FileLikeType {
  File = "file",
  Directory = "directory",
}

interface IFile {
  name: string;
  path: string;
  type: FileLikeType.File;
}

interface IDirectory extends Omit<IFile, "type"> {
  type: FileLikeType.Directory;
  children: Tree;
}

type Tree = (IFile | IDirectory)[];

export class XBuilder {
  private config: XBuildContext;
  private logger: Logger = new Logger("Builder");

  constructor(config: XBuildContext) {
    this.config = config;
  }

  get pluginManager() {
    return new PluginManager(this.config?.pluginManager || []);
  }

  private buildHtml(filePath: string) {
    const fileContent = fs.readFileSync(path.resolve(filePath), "utf-8");
    const html = new JSDOM(fileContent);
    const script = html.window.document.querySelector(
      "script#script-main[type=module]"
    ) as HTMLScriptElement;
    if (!script) {
      return filePath;
    } else {
      const src = script.src;
      const changeString = (
        str: string,
        splitor: string,
        replacer: ((old: string) => string) | string
      ) => {
        const _replacer =
          typeof replacer === "function" ? replacer : () => replacer;
        return str
          .split(splitor)
          .map((v, i, a) => (i === a.length - 1 ? _replacer(v) : v))
          .join(splitor);
      };
      const fileName = changeString(src.split("/").pop()!, "/", (v) =>
        changeString(v, ".", "js")
      );
      script.src = "./" + fileName;
      const { output } = this.rolldownOptions;
      const dir = [output].flat().reduce((a, b) => b?.dir || a, "./dist");
      const htmlName = filePath.split("/").pop();
      assert(htmlName);
      this.write(path.resolve(dir, htmlName), html.serialize(), "utf-8");
      return src;
    }
  }

  private async generate(bundle: RolldownBuild, output: OutputOptions) {
    const chunk = await bundle.generate(output).then((v) => v.output);
    const res = this.pluginManager.apply(
      "transform",
      chunk[0].code,
      chunk[0].fileName,
      chunk[0].map
    );
    Object.assign(chunk[0], res);
    return chunk;
  }

  get rolldownOptions(): RolldownOptions {
    const { config } = this;
    if (!config.build) {
      return {
        input: "./index.html",
        plugins: [...defaultRolldownPlugins],
        output: [
          {
            dir: "./dist",
            format: "esm",
          },
        ],
      };
    } else {
      const options = {} as RolldownOptions;
      Object.assign(options, config.build);
      options.output = [
        options.output as Exclude<
          Exclude<LoadedXbuildConfig["build"], undefined>["output"],
          undefined
        >,
      ]
        .flat()
        .filter(Boolean)
        .map((out: XBuildOutputOptions) => {
          return {
            ...out,
            chunkFileNames:
              out.chunkFileNames &&
              ((info) => {
                const name =
                  typeof out.chunkFileNames === "function"
                    ? out.chunkFileNames(info, out.format || "esm")
                    : out.chunkFileNames;
                return name || info.name;
              }),
          };
        });
      options.plugins = [...defaultRolldownPlugins].concat(
        [config.build?.plugins].flat().filter(Boolean)
      );
      options.external = [
        ...defaultRolldownExternal,
        ...([config.build.external].flat() as (
          | StringOrRegExp
          | Only<ExternalOption, Function>
        )[]),
      ];

      return options;
    }
  }

  private write(
    filePath: string,
    data: string | NodeJS.ArrayBufferView,
    options: fs.WriteFileOptions
  ) {
    let _options = options as Exclude<typeof options, string | null>;
    if (typeof options === "string") {
      _options = {
        encoding: options,
      };
    } else if (options === null) {
      _options = {};
    }
    const dirpath = path.dirname(filePath);
    if (!fs.existsSync(dirpath)) {
      fs.mkdirSync(dirpath, { recursive: true });
    }
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(
        filePath,
        data,
        {
          encoding: "utf-8",
          ..._options,
        },
        (error) => {
          if (!error) {
            resolve();
          } else {
            reject(error);
          }
        }
      );
      if (_options.signal) {
        _options.signal.addEventListener("abort", () => {
          if (fs.existsSync(dirpath)) {
            fs.rmSync(dirpath, { recursive: true });
          }
        });
      }
    });
  }

  async runBuild() {
    try {
      const { output, ...options } = this.rolldownOptions;
      if (options.input) {
        const inputs: string[] = [];
        for (const input of [options.input as string | string[]].flat()) {
          if (!input.endsWith(".html")) {
            inputs.push(input);
          } else {
            inputs.push(this.buildHtml(input));
          }
        }
        options.input = inputs;
        if (inputs.length === 0) {
          this.logger.success("Build completed successfully");
          return true;
        }
      }
      const inputs = options.input as string[];
      for (const input of inputs) {
        await this.buildOne(input);
      }

      this.logger.success("Build completed successfully");
      return true;
    } catch (error) {
      this.logger.error("Build failed", error);
      return false;
    }
  }
  private async buildOne(input: string) {
    const { input: _, output, ...options } = this.rolldownOptions;
    const bundle = await rolldown({ ...options, input });
    // 每个output都打包一次
    const promiseResults = [output]
      .flat()
      .filter(Boolean)
      .map(async (output: OutputOptions) => {
        const bundled = await this.generate(bundle, output);
        return {
          output,
          chunks: bundled.filter((v) => v.type === "chunk") as OutputChunk[],
          assets: bundled.filter((v) => v.type === "asset") as OutputAsset[],
        };
      });
    // 开始写入文件
    // 等待打包完成
    const result = await Promise.all(promiseResults);
    const writes: Promise<unknown>[] = [];
    const abortController = new AbortController();

    const write = (writePath: string, content: string) => {
      writes.push(
        this.write(writePath, content, {
          encoding: "utf-8",
          signal: abortController.signal,
        })
      );
    };
    for (const { output, chunks, assets } of result) {
      const { dir = "./", chunkFileNames } = output;
      // 当有文件写入失败后停止写入其他文件
      abortController.signal.addEventListener("abort", () => {
        if (dir === "./") return;
        const dirPath = path.resolve(dir);
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true });
        }
      });
      // 写chunk
      chunks.forEach(
        ({
          fileName,
          facadeModuleId,
          code,
          sourcemapFileName,
          map,
          ...option
        }) => {
          fileName = nil(
            typeof chunkFileNames === "function"
              ? chunkFileNames({
                  ...option,
                  facadeModuleId: facadeModuleId || "",
                  name: fileName,
                })
              : chunkFileNames,
            fileName
          );
          write(path.resolve(dir, fileName), code);
          if (map && sourcemapFileName) {
            sourcemapFileName = path.resolve(
              path.dirname(path.resolve(dir, sourcemapFileName)),
              fileName + ".map"
            );
            write(sourcemapFileName, map.toString());
          }
        }
      );
      // 写静态资源
      assets.forEach(({ source, fileName }) => {
        source &&
          fileName &&
          write(path.resolve(dir, fileName), source.toString());
      });
    }
    let error: any;
    await Promise.all(writes)
      .catch((e) => {
        error = e;
        abortController.abort();
      })
      .finally(() => {
        return bundle.close();
      });
    if (error) {
      throw error;
    }
  }

  get defaultDevOption() {
    return { port: 9999, public: "public" } as const;
  }

  private getDevOptions(
    option: XbuildDevOptions
  ): Required<Omit<XbuildDevOptions, "proxy">> &
    Pick<XbuildDevOptions, "proxy"> {
    const dev = this.config.dev || {};
    const options = {
      ...this.defaultDevOption,
      ...dev,
      ...option,
    };
    Object.keys(this.defaultDevOption).forEach((key) => {
      options[key] = nil(options[key], this.defaultDevOption[key]);
    });
    return options;
  }

  async runDev(options: XbuildDevOptions) {
    // 启动服务器
    let promiseHandle: ((data: any) => void)[] = [];
    const option = this.getDevOptions(options);

    try {
      createServer(option.port, {
        middles: [
          staticMiddle(path.resolve(process.cwd(), option.public)),
          staticMiddle(path.resolve("../../template/dist")),
          staticMiddle(path.resolve("../../template")),
        ],
        routes: [
          {
            path: "/demo",
            method: "get",
            handlers: [
              async (request, response) => {
                const { modulePath } = request.query as { modulePath?: string };
                if (!modulePath) {
                  response.sendStatus(404);
                  return;
                }
                const { output, ...options } = this.rolldownOptions;
                options.input = path.resolve("src", modulePath);
                if (!fs.existsSync(options.input)) {
                  response.sendStatus(404);
                  return;
                }
                const bundle = await rolldown(options);

                const bundleCode = (
                  await bundle.generate({
                    format: "esm",
                    file: "index.js",
                    sourcemap: false,
                  })
                ).output[0].code;
                response.send(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Component Preview - ${getModuleName(
                      modulePath
                    )}</title>
                  </head>
                  <body>
                    <div id="root"></div>
                    <script type="module" src=""> 
                      ${bundleCode}
                    <\/script>
                  </body>
                </html>
              `);
              },
            ],
            children: [
              {
                path: "/file-tree",
                method: "get",
                handlers: [
                  (request, response) => {
                    // 在什么地方运行，root就是什么路径
                    const src = path.resolve(process.cwd(), "src");
                    /**
                     * 构建符合 Tree 类型的文件结构
                     * @param rootDir 扫描根目录
                     * @returns 符合 Tree 类型的文件结构
                     */
                    function buildFileTree(rootPath: string): Tree {
                      if (!fs.existsSync(rootPath)) return [];

                      function buildTree(
                        currentDir: string,
                        relativePath: string
                      ): Tree {
                        const items = fs.readdirSync(currentDir, {
                          withFileTypes: true,
                        });
                        const dirs: Tree = [];
                        const files: Tree = [];

                        for (const item of items) {
                          const itemPath = path.join(currentDir, item.name);
                          const itemRelativePath = relativePath
                            ? `${relativePath}/${item.name}`
                            : item.name;

                          if (item.isDirectory()) {
                            const children = buildTree(
                              itemPath,
                              itemRelativePath
                            );
                            if (children.length > 0) {
                              dirs.push({
                                name: item.name,
                                path: itemRelativePath,
                                type: FileLikeType.Directory,
                                children,
                              });
                            }
                          } else if (
                            item.isFile() &&
                            /.*\.(demo|dev)\.tsx?$/.test(item.name)
                          ) {
                            files.push({
                              name: item.name,
                              path: itemRelativePath,
                              type: FileLikeType.File,
                            });
                          }
                        }

                        // 对目录和文件分别按名称排序
                        dirs.sort((a, b) => a.name.localeCompare(b.name));
                        files.sort((a, b) => a.name.localeCompare(b.name));

                        // 目录在前，文件在后
                        return [...dirs, ...files];
                      }

                      return buildTree(rootPath, "");
                    }
                    const res = buildFileTree(src);
                    response.status(200).json(res);
                  },
                ],
              },
            ],
          },
        ],
        proxy: option.proxy,
        printProxy: false,
        createHandle: ({ port }) => {
          promiseHandle[0]({ port, proxy: option.proxy });
        },
      });
    } catch (e) {
      console.log(e);
    }

    return new Promise<{ port: number; proxy: ProxyRules | undefined | null }>(
      (...args) => {
        promiseHandle = args;
      }
    );
  }
}
