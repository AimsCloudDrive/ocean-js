import { createServer, staticMiddle } from "@msom/http";
import { RolldownOptions, RolldownOutput, rolldown } from "rolldown";
import { Logger } from "../utils/logger";
import { PluginManager } from "./plugin";
import {
  LoadedXbuildConfig,
  XBuildContext,
  XBuildOutputOptions,
} from "./types";

export class XBuilder {
  private config?: XBuildContext;
  private logger: Logger = new Logger("Builder");

  constructor(config: XBuildContext | undefined) {
    this.config = config;
  }

  get pluginManager() {
    return new PluginManager(this.config?.plugins || []);
  }

  get rolldownOptions(): RolldownOptions {
    const { config } = this;
    if (!config || !config.build) {
      return {
        input: "./index.html",
        output: [
          {
            dir: "./dist",
            format: "esm",
          },
        ],
      };
    } else {
      let { output } = config.build;
      config.build.output = [output]
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

      return config.build as RolldownOptions;
    }
  }

  async runBuild() {
    process.env.NODE_ENV = "production";
    try {
      const { output, ...options } = this.rolldownOptions;
      const bundle = await rolldown(options);
      const promiseResults = [output].flat().map(bundle.generate.bind(bundle));
      const result = (await Promise.all(promiseResults)).map<RolldownOutput>(
        (output) => {
          const [chunk, deps] = output.output;
          this.pluginManager.apply("transform", chunk.code, chunk.map);
          return output;
        }
      );
      await bundle.close();

      this.logger.success("Build completed successfully");
      return true;
    } catch (error) {
      delete process.env.NODE_ENV;
      this.logger.error("Build failed", error);
      return false;
    }
  }

  async runDev() {
    // 启动服务器
    let promiseHandle: ((data: any) => void)[] = [];
    try {
      createServer(this.config?.dev?.port || 9999, {
        middles: [staticMiddle(this.config?.dev?.public || "public")],
        routes: [
          {
            path: "/",
            method: "get",
            handlers: [
              (request, response) => {
                const { modulePath } = request.params;
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
                    <script type="module" src="/src + ${modulePath.slice(1)}" />
                  </body>
                </html>
              `);
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
function getModuleName(path: string): string {
  return path.split("/").pop() || "";
}
