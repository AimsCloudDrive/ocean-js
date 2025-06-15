// src/commands/dev.ts
import { LoadedXbuildConfig, XBuildConfig } from "../core/types";
import { XBuilder } from "../core/builder";
import { loadConfig } from "../utils/config";
import { Logger } from "../utils/logger";

export async function devCommand(options: { config?: string; port?: string }) {
  const logger = new Logger("Dev");
  try {
    let config = await loadConfig(options.config);

    // 合并开发模式特定配置
    config = {
      ...config,
      mode: "development",
      watch: true,
      serve: true,
      port: options.port ? parseInt(options.port, 10) : config.port || 3000,
    } as LoadedXbuildConfig;

    logger.info("Starting development server...");

    const builder = new XBuilder(config);

    // 开发模式 Rollup 配置
    const rollupOptions: any = {
      input: config.input,
      output: config.output || {
        dir: "dist",
        format: "esm",
        sourcemap: true,
      },
      plugins: [],
      watch: {
        include: ["src/**"],
        exclude: "node_modules/**",
      },
      ...(config.rollupOptions || {}),
    };

    await builder.runDev(rollupOptions, rollupOptions.output);

    logger.success(
      `Development server running at http://localhost:${config.port}`
    );
  } catch (error) {
    logger.error("Error starting development server:", error);
    process.exit(1);
  }
}
