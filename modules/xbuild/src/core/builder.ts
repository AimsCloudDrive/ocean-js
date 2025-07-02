import { OcPromise, assert, nil } from "@msom/common";
import { createServer, staticMiddle } from "@msom/http";
import { RollupTypescriptOptions } from "@rollup/plugin-typescript";
import * as fs from "fs";
import path from "path";
import {
  ChunkFileNamesFunction,
  ExternalOption,
  InputOption,
  OutputOptions,
  RolldownBuild,
  RolldownOptions,
  RolldownOutput,
  rolldown,
} from "rolldown";
import { Only, StringOrRegExp, getModuleName } from "../utils/common";
import { JSDOM } from "jsdom";
import { Logger } from "../utils/logger";
import { PluginManager } from "./plugin";
import {
  LoadedXbuildConfig,
  XBuildContext,
  XBuildOutputOptions,
  XbuildDevOptions,
} from "./types";

export class XBuilder {
  private config: XBuildContext;
  private logger: Logger = new Logger("Builder");

  constructor(config: XBuildContext) {
    this.config = config;
  }

  get pluginManager() {
    return new PluginManager(this.config?.pluginManager || []);
  }

  get typeOption(): RollupTypescriptOptions {
    return {
      tsconfig: "./tsconfig.json",
      sourceMap: true,
      paths: {},
      noCheck: true,
      jsxFactory: "Msom.createElement",
      jsxImportSource: "@msom/dom",
    };
  }

  private async buildHtml(filePath: string) {
    const fileContent = fs.readFileSync(path.resolve(filePath), "utf-8");
    const html = new JSDOM(fileContent);
    const script = html.window.document.querySelector(
      "script#script-main[type=module]"
    ) as HTMLScriptElement;
    if (!script) {
      return;
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
      const { output, ...option } = this.rolldownOptions;
      option.input = src;
      const dir = [output].flat().reduce((a, b) => b?.dir || a, "./dist");
      const build = await rolldown(option);
      const htmlName = filePath.split("/").pop();
      assert(htmlName);
      await this.write(path.resolve(dir, htmlName), html.serialize(), "utf-8");
      const chunk = await this.generate(build, {
        dir,
        chunkFileNames: fileName,
        format: "esm",
        sourcemap: false,
      }).then((v) => v[0]);
      await this.write(path.resolve(dir, fileName), chunk.code, "utf-8");
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
        plugins: [],
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
      options.plugins = [config.build.plugins || []].flat();
      options.external = [
        "fs",
        "jsdom",
        "path",
        "mongodb",
        "cors",
        "express",
        "url",
        "rolldown",
        "commander",
        "chalk",
        "tslib",
        "typescript",
        /^@rollup\//,
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
            await this.buildHtml(input);
          }
        }
        options.input = inputs;
        if (inputs.length === 0) {
          this.logger.success("Build completed successfully");
          return true;
        }
      }
      const bundle = await rolldown(options);
      const promiseResults = [output]
        .flat()
        .map((output: OutputOptions) => this.generate(bundle, output));
      const result = await Promise.all(promiseResults);
      const writes: Promise<unknown>[] = [];
      const abortController = new AbortController();
      for (let i = 0; i < result.length; i++) {
        const bundle = result[i];
        const _output = [output].flat()[i];
        if (!_output) continue;
        const { dir = "./", chunkFileNames } = _output;
        const _chunkFileNames = chunkFileNames as ChunkFileNamesFunction;
        abortController.signal.addEventListener("abort", () => {
          if (dir === "./") return;
          const dirPath = path.resolve(dir);
          if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true });
          }
        });
        const write = (_path: string, content: string) => {
          writes.push(
            this.write(_path, content, {
              encoding: "utf-8",
              signal: abortController.signal,
            })
          );
        };
        for (const chunk of bundle) {
          if (chunk.type === "chunk") {
            const fileName = nil(
              _chunkFileNames &&
                _chunkFileNames({
                  ...chunk,
                  facadeModuleId: chunk.facadeModuleId || "",
                  name: chunk.fileName,
                }),
              chunk.fileName
            );
            write(path.resolve(dir, fileName), chunk.code);
            if (chunk.map && chunk.sourcemapFileName) {
              const sourcemapFileName = path.resolve(
                path.dirname(path.resolve(dir, chunk.sourcemapFileName)),
                fileName + ".map"
              );
              write(sourcemapFileName, chunk.map.toString());
            }
          } else {
            chunk.source &&
              chunk.fileName &&
              write(path.resolve(dir, chunk.fileName), chunk.source.toString());
          }
        }
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
      this.logger.success("Build completed successfully");
      return true;
    } catch (error) {
      this.logger.error("Build failed", error);
      return false;
    }
  }

  private getDevOptions(option: XbuildDevOptions): Required<XbuildDevOptions> {
    const dev = this.config.dev || {};
    const options = {
      port: nil(dev.port, nil(option.port, 9999)),
      public: nil(dev.public, nil(option.public, "public")),
    };
    return options;
  }

  async runDev(options: XbuildDevOptions) {
    // 启动服务器
    let promiseHandle: ((data: any) => void)[] = [];
    const option = this.getDevOptions(options);
    try {
      createServer(option.port, {
        middles: [
          staticMiddle(path.relative(process.cwd(), option.public)),
          staticMiddle(path.resolve("../../../template/dist")),
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
                path: "file-tree",
                method: "get",
                handlers: [(request, response) => {}],
              },
            ],
          },
        ],
        createHandle: ({ port }) => {
          promiseHandle[0](port);
        },
      });
    } catch (e) {}

    return new Promise<number>((...args) => {
      promiseHandle = args;
    });
  }
}
