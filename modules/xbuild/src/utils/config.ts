// src/utils/config.ts
import path from "path";
import fs from "fs";
import { LoadedXbuildConfig, XBuildConfig, defineConfig } from "../core/types";
import { PluginManager } from "../core/plugin";
import { Logger } from "./logger";

const logger = new Logger("Config");

export async function loadConfig(
  userConfigPath?: string
): Promise<LoadedXbuildConfig> {
  const configPath = findConfigFile(userConfigPath);

  if (!configPath) {
    logger.warn("No config file found, using default configuration");
    return getDefaultConfig();
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
            mode:
              (process.env.NODE_ENV as "development" | "production") ||
              "production",
          })
        : userConfig;

    // 应用 defineConfig 处理
    const finalConfig = defineConfig(resolvedConfig) as XBuildConfig;

    // 确保插件管理器初始化
    const pluginManager = new PluginManager(finalConfig.plugins || []);

    // 设置默认值
    return {
      mode: "production",
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
    "build.config.ts",
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

function getDefaultConfig(): LoadedXbuildConfig {
  return {
    input: "src/index.ts",
    output: {
      dir: "dist",
      format: "esm",
    },
    plugins: new PluginManager([]),
  };
}
