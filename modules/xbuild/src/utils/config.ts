// src/utils/config.ts
import path from "path";
import fs from "fs";
import { LoadedXbuildConfig, XBuildConfig, UserConfig } from "../core/types";
import { XBuildENV } from "./env";
import { PluginManager } from "../core/plugin";
import { Logger } from "./logger";

const logger = new Logger("Config");

export async function loadConfig(
  userConfigPath?: string
): Promise<LoadedXbuildConfig | undefined> {
  const configPath = findConfigFile(userConfigPath);

  if (!configPath) {
    logger.warn("No config file found, using default configuration");
    return;
  }

  try {
    logger.info(`Loading configuration from ${configPath}`);

    // 动态导入配置文件
    const userConfigModule = await import(configPath);
    const userConfig = userConfigModule.default || userConfigModule;

    // 处理函数式配置
    const resolvedConfig =
      typeof userConfig === "function"
        ? userConfig({
            mode: XBuildENV.env || "production",
          })
        : userConfig;

    // 应用 defineConfig 处理
    const finalConfig = defineConfig(resolvedConfig) as XBuildConfig;

    // 确保插件管理器初始化
    const pluginManager = new PluginManager(finalConfig.plugins || []);

    // 设置默认值
    return {
      ...finalConfig,
      plugins: pluginManager,
    };
  } catch (error) {
    logger.error(`Failed to load config file: ${configPath}`, error);
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
