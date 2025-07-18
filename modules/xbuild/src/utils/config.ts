import { types as babelTypes } from "@babel/core";
import generate from "@babel/generator";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { isPromiseLike } from "@msom/common";
import fs from "fs";
import path from "path";
import { RolldownPluginOption, rolldown } from "rolldown";
import { PluginManager } from "../core/plugin";
import { LoadedXbuildConfig, UserConfig, XBuildConfig } from "../core/types";
import { toFileUrl } from "./common";
import { XBuildENV } from "./env";
import { Logger } from "./logger";

function getDefault<T extends object>(d: T): T {
  const _default = Reflect.get(d, "default", d);
  if (_default) {
    return _default as T;
  } else {
    return d;
  }
}

function __decoratorHandle() {
  return {
    name: "class-decorator-first",
    transform(code, id) {
      try {
        const ast = parse(code, {
          sourceType: "module",
          plugins: ["decorators-legacy", "typescript"],
        });

        getDefault(traverse)(ast, {
          Program(path: any) {
            const programBody = path.node.body;
            // 判断是否有装饰器语法，__decorate函数的使用
            if (!Array.isArray(programBody)) {
              return;
            }
            const decorators: any[] = [];
            let changed = false;
            const newBody: any[] = [];
            const cleanDecorators = () => {
              if (decorators.length) {
                newBody.push(...decorators);
                decorators.length = 0;
              }
            };
            programBody.forEach((node) => {
              if (babelTypes.isExpressionStatement(node)) {
                const expression = node.expression;
                if (babelTypes.isCallExpression(expression)) {
                  const callee = expression.callee;
                  if (
                    babelTypes.isIdentifier(callee) &&
                    callee.name === "__decorate"
                  ) {
                    /* 普通装饰器 __decorate([  _property, __metadata("design:type", Object) ], AAA.prototype, "AAA", void 0); */
                    decorators.push(node);
                    changed = true;
                    return;
                  }
                }
                if (babelTypes.isAssignmentExpression(expression)) {
                  const right = expression.right;
                  if (babelTypes.isCallExpression(right)) {
                    const callee = right.callee;
                    if (
                      babelTypes.isIdentifier(callee) &&
                      callee.name === "__decorate"
                    ) {
                      /* 类装饰器 AAA = __decorate([ _class ], AAA); */
                      newBody.push(node, ...decorators);
                      decorators.length = 0;
                      changed = true;
                      return;
                    }
                  }
                }
              }
              // 当前不是装饰器的声明，表示上一个类的装饰器已经声明完成，检查是否有未添加的装饰器声明
              cleanDecorators();
              newBody.push(node);
            });
            // 防止最后一段body是普通装饰器声明
            cleanDecorators();
            changed && (path.node.body = newBody);
          },
        });

        const output = getDefault(generate)(ast, { retainLines: true }, code);
        return {
          code: output.code,
          map: output.map,
        };
      } catch (err) {
        console.error(`[class-decorator-first] Error processing ${id}:`, err);
        return code;
      }
    },
  };
}

const logger = new Logger("Config");

interface LoadConfigOptions {
  compile: boolean;
}

export async function loadConfig(
  userConfigPath: string | undefined,
  options?: LoadConfigOptions
): Promise<LoadedXbuildConfig | undefined> {
  const configPath = findConfigFile(userConfigPath);
  const finalConfig: LoadedXbuildConfig = {
    pluginManager: new PluginManager(),
  };
  if (!configPath) {
    logger.warn("No config file found, using default configuration");
    return finalConfig;
  }

  try {
    logger.info(`Loading configuration from ${toFileUrl(configPath)}`);
    const tmpConfigPath = ".xbuild.config.mjs";
    await (
      await rolldown({
        input: configPath,
        external(id, parentId, isResolved) {
          return true;
        },
      })
    ).write({
      file: tmpConfigPath,
      format: "esm",
    });
    // 动态导入配置文件
    const userConfigModule = await import(
      toFileUrl(path.resolve(tmpConfigPath))
    ).finally(() => {
      fs.rmSync(path.resolve(tmpConfigPath), { recursive: true });
    });
    const userConfig: UserConfig = userConfigModule.default || userConfigModule;

    // 处理函数式配置
    const resolvedConfig: XBuildConfig = await Promise.resolve(
      typeof userConfig === "function"
        ? userConfig({
            mode: XBuildENV.env || "production",
          })
        : userConfig
    );

    Object.assign(finalConfig, resolvedConfig);

    finalConfig.pluginManager.addPlugins(
      resolvedConfig.plugins?.filter(({ name }) => {
        if (!options?.compile) {
          return true;
        } else {
          return name !== "typescript";
        }
      })
    );
    finalConfig.pluginManager.addPlugin(__decoratorHandle());
    if (finalConfig.build?.plugins) {
      let plugins = finalConfig.build.plugins as Awaited<RolldownPluginOption>;
      if (isPromiseLike<Awaited<RolldownPluginOption>>(plugins)) {
        plugins = await plugins;
      }
      const pluginsHandle = (plugins: Awaited<RolldownPluginOption>) => {
        if (!plugins) {
          return plugins;
        } else if (Array.isArray(plugins)) {
          return plugins.filter(pluginsHandle);
        } else if (typeof plugins === "object" && plugins !== null) {
          if (options?.compile) {
            return plugins["name"] === "typescript" ? false : plugins;
          } else {
            return plugins;
          }
        }
      };
      finalConfig.build.plugins = pluginsHandle(plugins);
    }
    return finalConfig;
  } catch (error) {
    logger.error(`Failed to load config file: ${toFileUrl(configPath)}`, error);
    throw error;
  }
}

function findConfigFile(userPath?: string): string | null {
  const possiblePaths = [
    userPath,
    "xbuild.config.ts",
    "xbuild.config.js",
    "xbuild.config.mjs",
    "xbuild.config.cjs",
    path.join("config", "xbuild.config.ts"),
  ].filter(Boolean) as string[];

  for (const configPath of possiblePaths) {
    const absolutePath = path.resolve(process.cwd(), configPath);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }

    // 尝试添加扩展名
    const withTsExt = absolutePath.endsWith(".ts")
      ? absolutePath
      : `${absolutePath}.ts`;
    if (fs.existsSync(withTsExt)) {
      return withTsExt;
    }

    const withJsExt = absolutePath.endsWith(".js")
      ? absolutePath
      : `${absolutePath}.js`;
    if (fs.existsSync(withJsExt)) {
      return withJsExt;
    }
  }

  return null;
}
export function defineConfig(config: UserConfig): UserConfig {
  return config;
}
