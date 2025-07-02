// src/utils/config.ts
import path from "path";
import fs from "fs";
import { RolldownPlugin, RolldownPluginOption, rolldown } from "rolldown";
import { LoadedXbuildConfig, XBuildConfig, UserConfig } from "../core/types";
import { XBuildENV } from "./env";
import { PluginManager, XBuildPlugin } from "../core/plugin";
import { Logger } from "./logger";
import { toFileUrl } from "./common";
import { isPromiseLike } from "@msom/common";

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
      await rolldown({ input: configPath, external: /^.*$/ })
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
